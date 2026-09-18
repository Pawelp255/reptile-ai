import Capacitor
import UIKit

@objc(ReptilitaBridgeViewController)
public class ReptilitaBridgeViewController: CAPBridgeViewController {
    public override func capacitorDidLoad() {
        super.capacitorDidLoad()

        #if DEBUG
        NSLog("[ReptilitaBridgeViewController] capacitorDidLoad")
        #endif
        bridge?.registerPluginInstance(ReptilitaWatchBridgePlugin())

        #if DEBUG
        let pluginNames = [
            "Clipboard",
            "Filesystem",
            "Haptics",
            "Preferences",
            "Share",
            "SplashScreen",
            "StatusBar",
            "ReptilitaWatchBridge"
        ]
        let registered = pluginNames.filter { bridge?.plugin(withName: $0) != nil }
        let missing = pluginNames.filter { bridge?.plugin(withName: $0) == nil }
        NSLog("[ReptilitaBridgeViewController] registered Capacitor plugins=%@", registered.joined(separator: ","))
        if !missing.isEmpty {
            NSLog("[ReptilitaBridgeViewController] missing Capacitor plugins=%@", missing.joined(separator: ","))
        }
        #endif
    }
}
