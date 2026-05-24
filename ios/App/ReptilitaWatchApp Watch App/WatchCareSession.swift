import Foundation
import Combine
import os
import WatchConnectivity

final class WatchCareSession: NSObject, ObservableObject, WCSessionDelegate {
    @Published var snapshot: WatchCareSnapshot?
    @Published var pendingActionIds: Set<String> = []
    @Published var debugStatus = "Connecting..."
    @Published var activationStateText = "notActivated"
    @Published var isReachable = false
    @Published var lastRequestSentAt: String?
    @Published var lastSnapshotReceivedAt: String?
    @Published var lastDecodeError: String?

    private let snapshotDefaultsKey = "reptilita.watch.todaySnapshot"
    private let isoDateFormatter = ISO8601DateFormatter()
    private let logger = Logger(subsystem: "com.reptilita.app.watchapp", category: "TodaySync")

    override init() {
        super.init()

        snapshot = loadCachedSnapshot()
        if snapshot != nil {
            debugStatus = "Snapshot received"
        }

        guard WCSession.isSupported() else {
            debugStatus = "Waiting for phone..."
            logger.error("WCSession is not supported on watch")
            return
        }
        WCSession.default.delegate = self
        logger.info("Activating WCSession on watch")
        WCSession.default.activate()
        updateSessionDebug(WCSession.default)
        readSnapshot(from: WCSession.default.receivedApplicationContext)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.requestSnapshot()
        }
    }

    var lastUpdatedText: String? {
        guard let generatedAt = snapshot?.generatedAt,
              let date = isoDateFormatter.date(from: generatedAt) else {
            return nil
        }

        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return "Last updated \(formatter.localizedString(for: date, relativeTo: Date()))"
    }

    func requestSnapshot() {
        logger.info("Watch requesting todaySnapshot")
        debugStatus = "Waiting for phone..."
        lastRequestSentAt = isoDateFormatter.string(from: Date())
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

        if let task = snapshot?.nextImportantTask, task.action == action {
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
                        self?.readSnapshot(from: reply)
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
            self?.updateSessionDebug(session)
            self?.debugStatus = activationState == .activated ? "Waiting for phone..." : "Connecting..."
            guard activationState == .activated else { return }
            self?.requestSnapshot()
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        logger.info("Watch reachability changed reachable=\(session.isReachable, privacy: .public)")
        DispatchQueue.main.async { [weak self] in
            self?.updateSessionDebug(session)
            if session.isReachable {
                self?.requestSnapshot()
            }
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        logger.info("Watch received applicationContext keys=\(applicationContext.keys.joined(separator: ","), privacy: .public)")
        DispatchQueue.main.async { [weak self] in
            self?.readSnapshot(from: applicationContext)
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        logger.info("Watch received message type=\((message["type"] as? String) ?? "unknown", privacy: .public)")
        DispatchQueue.main.async { [weak self] in
            self?.readSnapshot(from: message)
        }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        logger.info("Watch received userInfo type=\((userInfo["type"] as? String) ?? "unknown", privacy: .public)")
        DispatchQueue.main.async { [weak self] in
            self?.readSnapshot(from: userInfo)
        }
    }

    private func readSnapshot(from payload: [String: Any]) {
        guard let rawSnapshot = payload["snapshot"] else {
            logger.info("Payload did not include snapshot; keys=\(payload.keys.joined(separator: ","), privacy: .public)")
            return
        }

        do {
            let data = try JSONSerialization.data(withJSONObject: rawSnapshot)
            snapshot = try JSONDecoder().decode(WatchCareSnapshot.self, from: data)
            UserDefaults.standard.set(data, forKey: snapshotDefaultsKey)
            debugStatus = "Snapshot received"
            lastSnapshotReceivedAt = isoDateFormatter.string(from: Date())
            lastDecodeError = nil
            logger.info("Decoded todaySnapshot overdue=\(self.snapshot?.overdueCount ?? -1, privacy: .public) due=\(self.snapshot?.dueTodayCount ?? -1, privacy: .public)")
        } catch {
            debugStatus = "Waiting for phone..."
            lastDecodeError = error.localizedDescription
            logger.error("Failed to decode todaySnapshot: \(error.localizedDescription, privacy: .public)")
            return
        }
    }

    private func updateSessionDebug(_ session: WCSession) {
        activationStateText = activationStateName(session.activationState)
        isReachable = session.isReachable
    }

    private func activationStateName(_ state: WCSessionActivationState) -> String {
        switch state {
        case .activated:
            return "activated"
        case .inactive:
            return "inactive"
        case .notActivated:
            return "notActivated"
        @unknown default:
            return "unknown"
        }
    }

    private func loadCachedSnapshot() -> WatchCareSnapshot? {
        guard let data = UserDefaults.standard.data(forKey: snapshotDefaultsKey) else {
            return nil
        }

        return try? JSONDecoder().decode(WatchCareSnapshot.self, from: data)
    }
}
