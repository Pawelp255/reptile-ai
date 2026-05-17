import Foundation
import Combine
import WatchConnectivity

final class WatchCareSession: NSObject, ObservableObject, WCSessionDelegate {
    @Published var snapshot: WatchCareSnapshot?
    @Published var pendingActionIds: Set<String> = []

    private let snapshotDefaultsKey = "reptilita.watch.todaySnapshot"
    private let isoDateFormatter = ISO8601DateFormatter()

    override init() {
        super.init()

        snapshot = loadCachedSnapshot()

        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
        readSnapshot(from: WCSession.default.receivedApplicationContext)
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

        if let task = snapshot?.nextImportantTask, task.taskType == action {
            message["taskId"] = task.id
            message["animalId"] = task.animalId
        }

        sendPayload(message, actionId: actionId)
    }

    private func sendPayload(_ message: [String: Any], actionId: String? = nil, expectsSnapshotReply: Bool = false) {
        guard WCSession.isSupported() else {
            if let actionId {
                pendingActionIds.remove(actionId)
            }
            return
        }

        let session = WCSession.default

        if session.isReachable {
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
                session.transferUserInfo(message)
                DispatchQueue.main.async {
                    if let actionId {
                        self?.pendingActionIds.remove(actionId)
                    }
                }
            })
        } else {
            session.transferUserInfo(message)
            if let actionId {
                pendingActionIds.remove(actionId)
            }
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        guard activationState == .activated else { return }
        DispatchQueue.main.async { [weak self] in
            self?.requestSnapshot()
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async { [weak self] in
            self?.readSnapshot(from: applicationContext)
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async { [weak self] in
            self?.readSnapshot(from: message)
        }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        DispatchQueue.main.async { [weak self] in
            self?.readSnapshot(from: userInfo)
        }
    }

    private func readSnapshot(from payload: [String: Any]) {
        guard let rawSnapshot = payload["snapshot"] else { return }

        do {
            let data = try JSONSerialization.data(withJSONObject: rawSnapshot)
            snapshot = try JSONDecoder().decode(WatchCareSnapshot.self, from: data)
            UserDefaults.standard.set(data, forKey: snapshotDefaultsKey)
        } catch {
            return
        }
    }

    private func loadCachedSnapshot() -> WatchCareSnapshot? {
        guard let data = UserDefaults.standard.data(forKey: snapshotDefaultsKey) else {
            return nil
        }

        return try? JSONDecoder().decode(WatchCareSnapshot.self, from: data)
    }
}
