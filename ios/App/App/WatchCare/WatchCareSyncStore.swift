import Foundation
import WatchConnectivity

final class WatchCareSyncStore: NSObject, WCSessionDelegate {
    static let shared = WatchCareSyncStore()

    var onCareActionRequest: (([String: Any]) -> Void)?

    private var pendingActionRequests: [[String: Any]] = []
    private let queue = DispatchQueue(label: "com.reptilita.watch-care")

    private override init() {
        super.init()
    }

    func start() {
        guard WCSession.isSupported() else { return }

        let session = WCSession.default
        if session.delegate !== self {
            session.delegate = self
        }

        if session.activationState == .notActivated {
            session.activate()
        }
    }

    func updateSnapshot(_ snapshot: [String: Any]) throws -> Bool {
        guard WCSession.isSupported() else { return false }

        start()

        let session = WCSession.default
        try session.updateApplicationContext(["careSnapshot": snapshot])
        return session.isPaired && session.isWatchAppInstalled
    }

    func drainPendingActionRequests() -> [[String: Any]] {
        queue.sync {
            let actions = pendingActionRequests
            pendingActionRequests.removeAll()
            return actions
        }
    }

    private func enqueueCareActionRequest(_ message: [String: Any]) {
        guard message["type"] as? String == "completeTask" else { return }
        guard let taskId = message["taskId"] as? String, !taskId.isEmpty else { return }

        var request = message
        if request["requestedAt"] == nil {
            request["requestedAt"] = ISO8601DateFormatter().string(from: Date())
        }

        queue.sync {
            pendingActionRequests.append(request)
        }

        DispatchQueue.main.async { [weak self] in
            self?.onCareActionRequest?(request)
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        enqueueCareActionRequest(message)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        enqueueCareActionRequest(message)
        replyHandler(["queued": true])
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        enqueueCareActionRequest(userInfo)
    }
}
