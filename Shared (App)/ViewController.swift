import WebKit
import SafariServices

#if os(iOS)
import UIKit
typealias PlatformViewController = UIViewController
#elseif os(macOS)
import Cocoa
typealias PlatformViewController = NSViewController
#endif

// Ensure this matches your actual Bundle ID in the Extension Target settings
let extensionBundleIdentifier = "com.budda.BlockShorts.Extension"

class ViewController: PlatformViewController, WKNavigationDelegate, WKScriptMessageHandler {

    @IBOutlet var webView: WKWebView!

    @IBAction func openSafariSettings(_ sender: Any) {
        #if os(macOS)
        // macOS Specific Logic
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
            if let error = error {
                print("Error: \(error.localizedDescription)")
                NSWorkspace.shared.open(URL(string: "https://www.youtube.com")!)
            } else {
                DispatchQueue.main.async {
                    NSApp.terminate(nil)
                }
            }
        }
        #elseif os(iOS)
        // iOS Specific Logic: Open the Settings app
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
        #endif
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()

        self.webView.navigationDelegate = self

        #if os(iOS)
        self.webView.scrollView.isScrollEnabled = false
        #endif

        self.webView.configuration.userContentController.add(self, name: "controller")

        // Ensure "Main.html" is added to BOTH Target Memberships (App and Extension)
        if let url = Bundle.main.url(forResource: "Main", withExtension: "html") {
            self.webView.loadFileURL(url, allowingReadAccessTo: Bundle.main.resourceURL!)
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        #if os(iOS)
        webView.evaluateJavaScript("show('ios')")
        #elseif os(macOS)
        webView.evaluateJavaScript("show('mac')")

        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { (state, error) in
            guard let state = state, error == nil else { return }

            DispatchQueue.main.async {
                let isEnabled = state.isEnabled
                if #available(macOS 13, *) {
                    webView.evaluateJavaScript("show('mac', \(isEnabled), true)")
                } else {
                    webView.evaluateJavaScript("show('mac', \(isEnabled), false)")
                }
            }
        }
        #endif
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let messageBody = message.body as? String, messageBody == "open-preferences" else { return }

        #if os(macOS)
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
            guard error == nil else { return }
            DispatchQueue.main.async {
                NSApp.terminate(nil)
            }
        }
        #elseif os(iOS)
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
        #endif
    }
}
