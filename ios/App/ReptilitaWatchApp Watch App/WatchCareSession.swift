import Foundation
import Combine
import WatchConnectivity

final class WatchCareSession: NSObject, ObservableObject, WCSessionDelegate {
    @Published var snapshot: WatchCareSnapshot?
    @Published var pendingTaskIds: Set<String> = []

    override init() {
        super.init()

        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
        readSnapshot(from: WCSession.default.receivedApplicationContext)
    }

    func complete(_ task: WatchCareTask) {
        pendingTaskIds.insert(task.id)

        let message: [String: Any] = [
            "type": "completeTask",
            "taskId": task.id,
            "taskKind": task.taskKind.rawValue,
            "requestedAt": ISO8601DateFormatter().string(from: Date())
        ]

        if WCSession.default.isReachable {
            WCSession.default.sendMessage(message, replyHandler: { [weak self] _ in
                DispatchQueue.main.async {
                    self?.pendingTaskIds.remove(task.id)
                }
            }, errorHandler: { [weak self] _ in
                WCSession.default.transferUserInfo(message)
                DispatchQueue.main.async {
                    self?.pendingTaskIds.remove(task.id)
                }
            })
        } else {
            WCSession.default.transferUserInfo(message)
            pendingTaskIds.remove(task.id)
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async { [weak self] in
            self?.readSnapshot(from: applicationContext)
        }
    }

    private func readSnapshot(from applicationContext: [String: Any]) {
        guard let rawSnapshot = applicationContext["careSnapshot"] else { return }

        do {
            let data = try JSONSerialization.data(withJSONObject: rawSnapshot)
            snapshot = try JSONDecoder().decode(WatchCareSnapshot.self, from: data)
        } catch {
            snapshot = nil
        }
    }
}
