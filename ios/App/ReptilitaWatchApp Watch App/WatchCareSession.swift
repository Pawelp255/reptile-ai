import Foundation
import Combine
import os
import WatchConnectivity

final class WatchCareSession: NSObject, ObservableObject, WCSessionDelegate {
    @Published var snapshot: WatchCareSnapshot?
    @Published var pendingActionIds: Set<String> = []
    @Published var statusText = "Connecting..."
    @Published var isLoading = true
    @Published var lastSyncedAt: Date?

    private let snapshotDefaultsKey = "reptilita.watch.todaySnapshot"
    private let isoDateFormatter = ISO8601DateFormatter()
    private let logger = Logger(subsystem: "com.reptilita.app.watchapp", category: "TodaySync")

    override init() {
        super.init()

        snapshot = loadCachedSnapshot()
        if snapshot != nil {
            statusText = "Ready"
            isLoading = false
        }

        guard WCSession.isSupported() else {
            statusText = "Open Reptilita on iPhone"
            isLoading = false
            logger.error("WCSession is not supported on watch")
            return
        }
        WCSession.default.delegate = self
        logger.info("Activating WCSession on watch")
        WCSession.default.activate()
        readSnapshot(from: WCSession.default.receivedApplicationContext, channel: "startupContext")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.requestSnapshot()
        }
    }

    var lastSyncedText: String? {
        let syncDate = lastSyncedAt ?? snapshot.flatMap { isoDateFormatter.date(from: $0.generatedAt) }
        guard let syncDate else { return nil }

        if abs(syncDate.timeIntervalSinceNow) < 60 {
            return "Last synced just now"
        }

        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return "Last synced \(formatter.localizedString(for: syncDate, relativeTo: Date()))"
    }

    func requestSnapshot() {
        logger.info("Watch requesting todaySnapshot")
        isLoading = snapshot == nil
        statusText = "Syncing..."
        sendPayload(["type": "requestTodaySnapshot"], expectsSnapshotReply: true)
    }

    func quickComplete(_ action: WatchCareAction) {
        let actionId = UUID().uuidString
        pendingActionIds.insert(actionId)

        var message: [String: Any] = [
            "type": "quickComplete",
            "actionId": actionId,
            "action": action.rawValue,
            "requestedAt": isoDateFormatter.string(from: Date())
        ]

        if let task = snapshot?.nextImportantTask, task.action == action || action == .mist {
            message["taskId"] = task.id
            message["animalId"] = task.animalId
        }

        logger.info("Watch sending quickComplete action=\(action.rawValue, privacy: .public)")
        sendPayload(message, actionId: actionId)
    }

    private func sendPayload(_ message: [String: Any], actionId: String? = nil, expectsSnapshotReply: Bool = false) {
        guard WCSession.isSupported() else {
            logger.error("Cannot send payload because WCSession is unsupported")
            if let actionId {
                pendingActionIds.remove(actionId)
            }
            return
        }

        let session = WCSession.default

        if session.isReachable {
            logger.info("sendMessage type=\((message["type"] as? String) ?? "unknown", privacy: .public)")
            session.sendMessage(message, replyHandler: { [weak self] reply in
                DispatchQueue.main.async {
                    if let actionId {
                        self?.pendingActionIds.remove(actionId)
                    }
                    if expectsSnapshotReply {
                        self?.readSnapshot(from: reply, channel: "messageReply")
                    }
                }
            }, errorHandler: { [weak self] _ in
                self?.logger.error("sendMessage failed; falling back to transferUserInfo")
                session.transferUserInfo(message)
                DispatchQueue.main.async {
                    if let actionId {
                        self?.pendingActionIds.remove(actionId)
                    }
                }
            })
        } else {
            logger.info("WCSession not reachable; transferUserInfo type=\((message["type"] as? String) ?? "unknown", privacy: .public)")
            session.transferUserInfo(message)
            if let actionId {
                pendingActionIds.remove(actionId)
            }
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        logger.info("Watch activation completed state=\(activationState.rawValue, privacy: .public) error=\(error?.localizedDescription ?? "", privacy: .public)")
        DispatchQueue.main.async { [weak self] in
            self?.statusText = activationState == .activated ? "Syncing..." : "Connecting..."
            guard activationState == .activated else { return }
            self?.requestSnapshot()
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        logger.info("Watch reachability changed reachable=\(session.isReachable, privacy: .public)")
        DispatchQueue.main.async { [weak self] in
            if session.isReachable {
                self?.requestSnapshot()
            }
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        logger.info("Watch received applicationContext keys=\(applicationContext.keys.joined(separator: ","), privacy: .public)")
        DispatchQueue.main.async { [weak self] in
            self?.readSnapshot(from: applicationContext, channel: "context")
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        logger.info("Watch received message type=\((message["type"] as? String) ?? "unknown", privacy: .public)")
        DispatchQueue.main.async { [weak self] in
            self?.readSnapshot(from: message, channel: "message")
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        logger.info("Watch received message with reply type=\((message["type"] as? String) ?? "unknown", privacy: .public)")
        DispatchQueue.main.async { [weak self] in
            self?.readSnapshot(from: message, channel: "message")
            replyHandler([
                "ok": true,
                "snapshotReceived": message["snapshot"] != nil
            ])
        }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        logger.info("Watch received userInfo type=\((userInfo["type"] as? String) ?? "unknown", privacy: .public)")
        DispatchQueue.main.async { [weak self] in
            self?.readSnapshot(from: userInfo, channel: "userInfo")
        }
    }

    private func readSnapshot(from payload: [String: Any], channel: String) {
        guard let rawSnapshot = snapshotObject(from: payload) else {
            logger.info("Payload did not include recognizable todaySnapshot; keys=\(payload.keys.joined(separator: ","), privacy: .public)")
            return
        }

        do {
            let data = try JSONSerialization.data(withJSONObject: rawSnapshot)
            snapshot = try JSONDecoder().decode(WatchCareSnapshot.self, from: data)
            UserDefaults.standard.set(data, forKey: snapshotDefaultsKey)
            statusText = "Ready"
            isLoading = false
            lastSyncedAt = Date()
            logger.info("Decoded todaySnapshot channel=\(channel, privacy: .public) overdue=\(self.snapshot?.overdueCount ?? -1, privacy: .public) due=\(self.snapshot?.dueTodayCount ?? -1, privacy: .public)")
        } catch {
            statusText = "Open Reptilita on iPhone"
            isLoading = false
            logger.error("Failed to decode todaySnapshot: \(error.localizedDescription, privacy: .public)")
            return
        }
    }

    private func snapshotObject(from payload: [String: Any]) -> Any? {
        if let snapshot = payload["snapshot"] {
            return snapshot
        }
        if let snapshot = payload["todaySnapshot"] {
            return snapshot
        }
        if payload["overdueCount"] != nil,
           payload["dueTodayCount"] != nil,
           payload["completedTodayCount"] != nil {
            return payload
        }
        return nil
    }

    private func loadCachedSnapshot() -> WatchCareSnapshot? {
        guard let data = UserDefaults.standard.data(forKey: snapshotDefaultsKey) else {
            return nil
        }

        return try? JSONDecoder().decode(WatchCareSnapshot.self, from: data)
    }
}
