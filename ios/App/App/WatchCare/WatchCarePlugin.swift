import Capacitor
import Foundation

@objc(WatchCarePlugin)
public final class WatchCarePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WatchCarePlugin"
    public let jsName = "WatchCare"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "drainActionRequests", returnType: CAPPluginReturnPromise)
    ]

    public override func load() {
        WatchCareSyncStore.shared.start()
        WatchCareSyncStore.shared.onCareActionRequest = { [weak self] request in
            self?.notifyListeners("careActionRequested", data: request)
        }
    }

    @objc func updateSnapshot(_ call: CAPPluginCall) {
        guard let snapshot = call.getObject("snapshot") else {
            call.reject("Missing care snapshot")
            return
        }

        do {
            let watchAppReachable = try WatchCareSyncStore.shared.updateSnapshot(snapshot)
            call.resolve(["watchAppReachable": watchAppReachable])
        } catch {
            call.reject("Could not update watch care snapshot", nil, error)
        }
    }

    @objc func drainActionRequests(_ call: CAPPluginCall) {
        call.resolve(["actions": WatchCareSyncStore.shared.drainPendingActionRequests()])
    }
}
