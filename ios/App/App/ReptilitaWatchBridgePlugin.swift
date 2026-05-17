import Capacitor
import Foundation
import WatchConnectivity

@objc(ReptilitaWatchBridgePlugin)
public class ReptilitaWatchBridgePlugin: CAPPlugin, CAPBridgedPlugin, WCSessionDelegate {
    public let identifier = "ReptilitaWatchBridgePlugin"
    public let jsName = "ReptilitaWatchBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateTodaySnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestTodaySnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acknowledgeAction", returnType: CAPPluginReturnPromise)
    ]

    private let snapshotDefaultsKey = "reptilita.watch.todaySnapshot"
    private var session: WCSession? {
        WCSession.isSupported() ? WCSession.default : nil
    }

    public override func load() {
        super.load()
        activateSessionIfNeeded()
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        activateSessionIfNeeded()
        call.resolve(statusPayload())
    }

    @objc func updateTodaySnapshot(_ call: CAPPluginCall) {
        activateSessionIfNeeded()

        guard let snapshot = call.getObject("snapshot") else {
            call.reject("Missing Today snapshot")
            return
        }

        saveSnapshot(snapshot)
        sendSnapshot(snapshot)
        call.resolve(statusPayload())
    }

    @objc func requestTodaySnapshot(_ call: CAPPluginCall) {
        activateSessionIfNeeded()
        notifyListeners("watchSnapshotRequested", data: [:], retainUntilConsumed: true)
        call.resolve([
            "status": statusPayload(),
            "snapshot": loadSnapshot() ?? [:]
        ])
    }

    @objc func acknowledgeAction(_ call: CAPPluginCall) {
        activateSessionIfNeeded()

        var payload: [String: Any] = [
            "type": "actionAcknowledged",
            "ok": call.getBool("ok", false),
            "actionId": call.getString("actionId") ?? "",
            "message": call.getString("message") ?? ""
        ]

        if let snapshot = call.getObject("snapshot") {
            saveSnapshot(snapshot)
            payload["snapshot"] = snapshot
        }

        sendPayload(payload)
        call.resolve(statusPayload())
    }

    private func activateSessionIfNeeded() {
        guard let session else { return }
        if session.delegate !== self {
            session.delegate = self
        }
        if session.activationState == .notActivated {
            session.activate()
        }
    }

    private func sendSnapshot(_ snapshot: [String: Any]) {
        sendPayload([
            "type": "todaySnapshot",
            "snapshot": snapshot
        ])
    }

    private func sendPayload(_ payload: [String: Any]) {
        guard let session else { return }

        do {
            try session.updateApplicationContext(payload)
        } catch {
            notifyListeners("watchBridgeStatusChanged", data: statusPayload(error: error.localizedDescription), retainUntilConsumed: true)
        }

        if session.isReachable {
            session.sendMessage(payload, replyHandler: nil) { [weak self] error in
                self?.notifyListeners("watchBridgeStatusChanged", data: self?.statusPayload(error: error.localizedDescription) ?? [:], retainUntilConsumed: true)
            }
        }
    }

    private func saveSnapshot(_ snapshot: [String: Any]) {
        guard JSONSerialization.isValidJSONObject(snapshot),
              let data = try? JSONSerialization.data(withJSONObject: snapshot) else {
            return
        }
        UserDefaults.standard.set(data, forKey: snapshotDefaultsKey)
    }

    private func loadSnapshot() -> [String: Any]? {
        guard let data = UserDefaults.standard.data(forKey: snapshotDefaultsKey),
              let object = try? JSONSerialization.jsonObject(with: data),
              let snapshot = object as? [String: Any] else {
            return nil
        }
        return snapshot
    }

    private func statusPayload(error: String? = nil) -> [String: Any] {
        guard let session else {
            return [
                "supported": false,
                "activationState": "unsupported",
                "paired": false,
                "watchAppInstalled": false,
                "reachable": false,
                "error": error ?? ""
            ]
        }

        return [
            "supported": true,
            "activationState": activationStateName(session.activationState),
            "paired": session.isPaired,
            "watchAppInstalled": session.isWatchAppInstalled,
            "reachable": session.isReachable,
            "error": error ?? ""
        ]
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

    public func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        notifyListeners("watchBridgeStatusChanged", data: statusPayload(error: error?.localizedDescription), retainUntilConsumed: true)
        if activationState == .activated, let snapshot = loadSnapshot() {
            sendSnapshot(snapshot)
        }
    }

    public func sessionDidBecomeInactive(_ session: WCSession) {
        notifyListeners("watchBridgeStatusChanged", data: statusPayload(), retainUntilConsumed: true)
    }

    public func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
        notifyListeners("watchBridgeStatusChanged", data: statusPayload(), retainUntilConsumed: true)
    }

    public func sessionWatchStateDidChange(_ session: WCSession) {
        notifyListeners("watchBridgeStatusChanged", data: statusPayload(), retainUntilConsumed: true)
        if let snapshot = loadSnapshot() {
            sendSnapshot(snapshot)
        }
    }

    public func sessionReachabilityDidChange(_ session: WCSession) {
        notifyListeners("watchBridgeStatusChanged", data: statusPayload(), retainUntilConsumed: true)
        if session.isReachable, let snapshot = loadSnapshot() {
            sendSnapshot(snapshot)
        }
    }

    public func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        handleMessage(message, replyHandler: nil)
    }

    public func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        handleMessage(message, replyHandler: replyHandler)
    }

    public func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        handleMessage(applicationContext, replyHandler: nil)
    }

    private func handleMessage(_ message: [String: Any], replyHandler: (([String: Any]) -> Void)?) {
        let type = message["type"] as? String
        if type == "requestTodaySnapshot" {
            notifyListeners("watchSnapshotRequested", data: [:], retainUntilConsumed: true)
            replyHandler?([
                "ok": true,
                "snapshot": loadSnapshot() ?? [:]
            ])
            return
        }

        if type == "completeTask" || type == "quickComplete" {
            notifyListeners("watchTaskAction", data: message, retainUntilConsumed: true)
            replyHandler?([
                "ok": true,
                "queued": true
            ])
            return
        }

        replyHandler?([
            "ok": false,
            "message": "Unsupported watch message"
        ])
    }
}
