import Foundation
import Combine
import os
import WatchConnectivity

struct WatchActionResult {
    let ok: Bool
    let message: String
}

final class WatchCareSession: NSObject, ObservableObject, WCSessionDelegate {
    @Published var snapshot: WatchCareSnapshot?
    @Published var pendingActionIds: Set<String> = []
    @Published var statusText = "Connecting..."
    @Published var isLoading = true
    @Published var lastSyncedAt: Date?
    @Published var actionResult: WatchActionResult?

    private let snapshotDefaultsKey = "reptilita.watch.todaySnapshot"
    private let isoDateFormatter = ISO8601DateFormatter()
    private let logger = Logger(subsystem: "com.reptilita.app.watchapp", category: "TodaySync")

    /// Local calendar date as yyyy-MM-dd, matching the iPhone snapshot's `date` field.
    private static func todayString() -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }

    /// True when the cached snapshot was generated for an earlier calendar day, so its
    /// overdue/due/done counts can no longer be trusted as "today".
    var isSnapshotStale: Bool {
        guard let snapshot else { return false }
        return snapshot.date < Self.todayString()
    }

    private func debugLog(_ message: String) {
        #if DEBUG
        logger.info("\(message, privacy: .public)")
        #endif
    }

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
        debugLog("Activating WCSession on watch")
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
        debugLog("Watch requesting todaySnapshot")
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

        debugLog("Watch sending quickComplete action=\(action.rawValue)")
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
            debugLog("sendMessage type=\((message["type"] as? String) ?? "unknown")")
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
            debugLog("WCSession not reachable; transferUserInfo type=\((message["type"] as? String) ?? "unknown")")
            session.transferUserInfo(message)
            if let actionId {
                pendingActionIds.remove(actionId)
            }
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        debugLog("Watch activation completed state=\(activationState.rawValue)")
        DispatchQueue.main.async { [weak self] in
            self?.statusText = activationState == .activated ? "Syncing..." : "Connecting..."
            guard activationState == .activated else { return }
            self?.requestSnapshot()
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        debugLog("Watch reachability changed reachable=\(session.isReachable)")
        DispatchQueue.main.async { [weak self] in
            if session.isReachable {
                self?.requestSnapshot()
            }
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        debugLog("Watch received applicationContext")
        DispatchQueue.main.async { [weak self] in
            self?.processPayload(applicationContext, channel: "context")
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        debugLog("Watch received message type=\((message["type"] as? String) ?? "unknown")")
        DispatchQueue.main.async { [weak self] in
            self?.processPayload(message, channel: "message")
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        debugLog("Watch received message with reply type=\((message["type"] as? String) ?? "unknown")")
        DispatchQueue.main.async { [weak self] in
            self?.processPayload(message, channel: "message")
            replyHandler([
                "ok": true,
                "snapshotReceived": message["snapshot"] != nil
            ])
        }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        debugLog("Watch received userInfo type=\((userInfo["type"] as? String) ?? "unknown")")
        DispatchQueue.main.async { [weak self] in
            self?.processPayload(userInfo, channel: "userInfo")
        }
    }

    /// Routes an incoming payload by `type` before treating it as a snapshot.
    private func processPayload(_ payload: [String: Any], channel: String) {
        if let type = payload["type"] as? String {
            if type == "clearSnapshot" {
                clearLocalSnapshot()
                return
            }
            if type == "actionAcknowledged" {
                handleActionAcknowledged(payload)
                return
            }
        }
        readSnapshot(from: payload, channel: channel)
    }

    /// Blanks all cached Watch state after a sign-out / account deletion on the iPhone.
    private func clearLocalSnapshot() {
        UserDefaults.standard.removeObject(forKey: snapshotDefaultsKey)
        snapshot = nil
        pendingActionIds.removeAll()
        actionResult = nil
        isLoading = false
        lastSyncedAt = nil
        statusText = "Open Reptilita on iPhone"
        debugLog("Watch cleared cached snapshot")
    }

    /// Surfaces the result of a quick action and clears its pending spinner.
    private func handleActionAcknowledged(_ payload: [String: Any]) {
        let ok = payload["ok"] as? Bool ?? false
        let message = (payload["message"] as? String).flatMap { $0.isEmpty ? nil : $0 }
            ?? (ok ? "Done" : "Action failed")
        if let actionId = payload["actionId"] as? String {
            pendingActionIds.remove(actionId)
        }
        actionResult = WatchActionResult(ok: ok, message: message)
        readSnapshot(from: payload, channel: "actionAck")
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
            self?.actionResult = nil
        }
    }

    private func readSnapshot(from payload: [String: Any], channel: String) {
        guard let rawSnapshot = snapshotObject(from: payload) else {
            debugLog("Payload did not include recognizable todaySnapshot")
            return
        }

        do {
            let data = try JSONSerialization.data(withJSONObject: rawSnapshot)
            snapshot = try JSONDecoder().decode(WatchCareSnapshot.self, from: data)
            UserDefaults.standard.set(data, forKey: snapshotDefaultsKey)
            statusText = "Ready"
            isLoading = false
            lastSyncedAt = Date()
            debugLog("Decoded todaySnapshot channel=\(channel)")
        } catch {
            statusText = "Open Reptilita on iPhone"
            isLoading = false
            logger.error("Failed to decode todaySnapshot")
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
