import Capacitor
import Foundation
import WatchConnectivity

@objc(ReptilitaWatchBridgePlugin)
public class ReptilitaWatchBridgePlugin: CAPPlugin, CAPBridgedPlugin, WCSessionDelegate {
    public let identifier = "ReptilitaWatchBridgePlugin"
    public let jsName = "ReptilitaWatchBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sendFakeSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateTodaySnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestTodaySnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acknowledgeAction", returnType: CAPPluginReturnPromise)
    ]

    private let snapshotDefaultsKey = "reptilita.watch.todaySnapshot"
    private var session: WCSession? {
        WCSession.isSupported() ? WCSession.default : nil
    }

    @objc public override func load() {
        super.load()
        NSLog("[ReptilitaWatchBridge] load jsName=%@ identifier=%@", jsName, identifier)
        activateSessionIfNeeded()
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        activateSessionIfNeeded()
        call.resolve(statusPayload())
    }

    @objc func sendFakeSnapshot(_ call: CAPPluginCall) {
        activateSessionIfNeeded()
        NSLog("[ReptilitaWatchBridge] sendFakeSnapshot invoked from JS")

        let snapshot = makeFakeSnapshot()
        saveSnapshot(snapshot)
        sendDebugSnapshot(snapshot, call: call)
    }

    @objc func updateTodaySnapshot(_ call: CAPPluginCall) {
        activateSessionIfNeeded()
        NSLog("[ReptilitaWatchBridge] updateTodaySnapshot invoked from JS")

        guard let rawSnapshot = call.getObject("snapshot") else {
            NSLog("[ReptilitaWatchBridge] updateTodaySnapshot missing snapshot object")
            call.reject("Missing Today snapshot")
            return
        }

        guard let snapshot = propertyListCleaned(rawSnapshot) as? [String: Any] else {
            NSLog("[ReptilitaWatchBridge] updateTodaySnapshot snapshot is not property-list safe")
            call.reject("Today snapshot is not property-list safe")
            return
        }

        logJSON("sanitized snapshot from JS", object: snapshot)
        saveSnapshot(snapshot)
        sendSnapshot(snapshot)
        NSLog("[ReptilitaWatchBridge] updateTodaySnapshot completed for %@", snapshotSummary(snapshot))
        call.resolve(statusPayload())
    }

    @objc func requestTodaySnapshot(_ call: CAPPluginCall) {
        activateSessionIfNeeded()
        NSLog("[ReptilitaWatchBridge] requestTodaySnapshot called from JS")
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

        if let rawSnapshot = call.getObject("snapshot"),
           let snapshot = propertyListCleaned(rawSnapshot) as? [String: Any] {
            saveSnapshot(snapshot)
            payload["snapshot"] = snapshot
        }

        sendPayload(payload)
        call.resolve(statusPayload())
    }

    private func activateSessionIfNeeded() {
        guard let session else {
            NSLog("[ReptilitaWatchBridge] WCSession unsupported")
            return
        }
        if session.delegate !== self {
            session.delegate = self
        }
        if session.activationState == .notActivated {
            NSLog("[ReptilitaWatchBridge] activating WCSession")
            session.activate()
        }
    }

    private func sendSnapshot(_ snapshot: [String: Any]) {
        NSLog("[ReptilitaWatchBridge] sendSnapshot preparing todaySnapshot %@", snapshotSummary(snapshot))
        sendPayload([
            "type": "todaySnapshot",
            "snapshot": snapshot
        ])
    }

    private func sendDebugSnapshot(_ snapshot: [String: Any], call: CAPPluginCall) {
        guard let session else {
            call.reject("WCSession unsupported")
            return
        }

        let payload = snapshot

        guard let cleanedPayload = propertyListCleaned(payload) as? [String: Any] else {
            call.reject("Fake snapshot payload is not property-list safe")
            return
        }

        let type = cleanedPayload["type"] as? String ?? "minimalTodaySnapshot"
        var result: [String: Any] = [
            "ok": true,
            "snapshot": snapshot,
            "status": statusPayload(),
            "channels": [:]
        ]
        var channels: [String: Any] = [:]

        NSLog(
            "[ReptilitaWatchBridge] sendFakeSnapshot start activation=%@ paired=%@ installed=%@ reachable=%@",
            activationStateName(session.activationState),
            session.isPaired ? "true" : "false",
            session.isWatchAppInstalled ? "true" : "false",
            session.isReachable ? "true" : "false"
        )
        logJSON("FULL fake WCSession payload sent by iPhone", object: cleanedPayload)

        do {
            NSLog("[ReptilitaWatchBridge] fake updateApplicationContext start type=%@", type)
            try session.updateApplicationContext(cleanedPayload)
            channels["context"] = [
                "ok": true,
                "detail": "updateApplicationContext success"
            ]
            NSLog("[ReptilitaWatchBridge] fake updateApplicationContext success type=%@", type)
        } catch {
            channels["context"] = [
                "ok": false,
                "error": error.localizedDescription
            ]
            NSLog("[ReptilitaWatchBridge] fake updateApplicationContext failed: %@", error.localizedDescription)
        }

        let transfer = session.transferUserInfo(cleanedPayload)
        channels["userInfo"] = [
            "ok": true,
            "detail": "transferUserInfo queued",
            "transferring": transfer.isTransferring
        ]
        NSLog("[ReptilitaWatchBridge] fake transferUserInfo queued transferring=%@", transfer.isTransferring ? "true" : "false")

        let finish: ([String: Any]) -> Void = { messageChannel in
            channels["message"] = messageChannel
            result["channels"] = channels
            result["status"] = self.statusPayload()
            self.notifyListeners("watchBridgeStatusChanged", data: result, retainUntilConsumed: true)
            call.resolve(result)
        }

        if session.isReachable {
            NSLog("[ReptilitaWatchBridge] fake sendMessage start type=%@", type)
            session.sendMessage(cleanedPayload, replyHandler: { reply in
                NSLog("[ReptilitaWatchBridge] fake sendMessage reply keys=%@", reply.keys.joined(separator: ","))
                finish([
                    "ok": true,
                    "detail": "sendMessage reply received",
                    "reply": reply
                ])
            }, errorHandler: { error in
                NSLog("[ReptilitaWatchBridge] fake sendMessage failed: %@", error.localizedDescription)
                finish([
                    "ok": false,
                    "error": error.localizedDescription
                ])
            })
        } else {
            NSLog("[ReptilitaWatchBridge] fake sendMessage skipped; session not reachable")
            finish([
                "ok": false,
                "error": "WCSession is not reachable"
            ])
        }
    }

    private func sendPayload(_ payload: [String: Any]) {
        guard let session else {
            NSLog("[ReptilitaWatchBridge] cannot send payload; WCSession unsupported")
            return
        }
        guard let cleanedPayload = propertyListCleaned(payload) as? [String: Any] else {
            NSLog("[ReptilitaWatchBridge] cannot send payload; not property-list safe")
            logJSON("invalid payload", object: payload)
            return
        }

        let type = cleanedPayload["type"] as? String ?? "unknown"
        NSLog(
            "[ReptilitaWatchBridge] sendPayload start type=%@ activation=%@ paired=%@ installed=%@ reachable=%@",
            type,
            activationStateName(session.activationState),
            session.isPaired ? "true" : "false",
            session.isWatchAppInstalled ? "true" : "false",
            session.isReachable ? "true" : "false"
        )
        logJSON("FULL WCSession payload sent by iPhone", object: cleanedPayload)

        do {
            NSLog("[ReptilitaWatchBridge] updateApplicationContext start type=%@", type)
            try session.updateApplicationContext(cleanedPayload)
            NSLog("[ReptilitaWatchBridge] updateApplicationContext success type=%@", type)
        } catch {
            NSLog("[ReptilitaWatchBridge] updateApplicationContext failed: %@", error.localizedDescription)
            notifyListeners("watchBridgeStatusChanged", data: statusPayload(error: error.localizedDescription), retainUntilConsumed: true)
        }

        if session.isReachable {
            NSLog("[ReptilitaWatchBridge] sendMessage start type=%@", type)
            session.sendMessage(cleanedPayload, replyHandler: { reply in
                NSLog("[ReptilitaWatchBridge] sendMessage reply type=%@ keys=%@", type, reply.keys.joined(separator: ","))
            }) { [weak self] error in
                NSLog("[ReptilitaWatchBridge] sendMessage failed: %@", error.localizedDescription)
                self?.notifyListeners("watchBridgeStatusChanged", data: self?.statusPayload(error: error.localizedDescription) ?? [:], retainUntilConsumed: true)
            }
        } else {
            NSLog("[ReptilitaWatchBridge] phone session not reachable for immediate message")
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

    private func makeFakeSnapshot() -> [String: Any] {
        return [
            "overdueCount": 4,
            "dueTodayCount": 6,
            "completedTodayCount": 1
        ]
    }

    private func propertyListCleaned(_ value: Any) -> Any? {
        if value is NSNull {
            return nil
        }
        if let string = value as? String {
            return string
        }
        if let number = value as? NSNumber {
            return number
        }
        if let data = value as? Data {
            return data
        }
        if let date = value as? Date {
            return date
        }
        if let array = value as? [Any] {
            return array.compactMap { propertyListCleaned($0) }
        }
        if let dictionary = value as? [String: Any] {
            var cleaned: [String: Any] = [:]
            for (key, child) in dictionary {
                if let cleanedChild = propertyListCleaned(child) {
                    cleaned[key] = cleanedChild
                }
            }
            return cleaned
        }
        NSLog("[ReptilitaWatchBridge] dropping unsupported payload value type=%@", String(describing: type(of: value)))
        return nil
    }

    private func logJSON(_ label: String, object: Any) {
        guard JSONSerialization.isValidJSONObject(object) else {
            NSLog("[ReptilitaWatchBridge] %@ is not valid JSON", label)
            return
        }
        do {
            let data = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
            let json = String(data: data, encoding: .utf8) ?? "<utf8 failed>"
            NSLog("[ReptilitaWatchBridge] %@ jsonBytes=%d json=%@", label, data.count, json)
        } catch {
            NSLog("[ReptilitaWatchBridge] %@ JSON serialization failed: %@", label, error.localizedDescription)
        }
    }

    private func snapshotSummary(_ snapshot: [String: Any]) -> String {
        let overdue = snapshot["overdueCount"] as? NSNumber
        let due = snapshot["dueTodayCount"] as? NSNumber
        let done = snapshot["completedTodayCount"] as? NSNumber
        let task = snapshot["nextImportantTask"] as? [String: Any]
        let taskType = task?["taskType"] as? String ?? "none"
        let animal = snapshot["animalName"] as? String ?? task?["animalName"] as? String ?? "none"
        return "overdue=\(overdue?.stringValue ?? "?") due=\(due?.stringValue ?? "?") done=\(done?.stringValue ?? "?") animal=\(animal) task=\(taskType)"
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
        NSLog("[ReptilitaWatchBridge] activationDidComplete state=%@ error=%@", activationStateName(activationState), error?.localizedDescription ?? "")
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
        NSLog("[ReptilitaWatchBridge] reachabilityDidChange reachable=%@", session.isReachable ? "true" : "false")
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

    public func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        handleMessage(userInfo, replyHandler: nil)
    }

    private func handleMessage(_ message: [String: Any], replyHandler: (([String: Any]) -> Void)?) {
        let type = message["type"] as? String
        NSLog("[ReptilitaWatchBridge] received message type=%@", type ?? "unknown")
        if type == "requestTodaySnapshot" {
            if let snapshot = loadSnapshot() {
                sendSnapshot(snapshot)
            }
            notifyListeners("watchSnapshotRequested", data: [:], retainUntilConsumed: true)
            replyHandler?([
                "ok": true,
                "snapshot": loadSnapshot() ?? [:]
            ])
            return
        }

        if type == "completeTask" || type == "quickComplete" {
            NSLog("[ReptilitaWatchBridge] received quick action")
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
