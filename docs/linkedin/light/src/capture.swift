import AppKit
import WebKit

// usage: capture <out.png>
//
// A real screenshot of the live DEVELOP app for the showcase image: opens the demo in WebKit at
// iPhone size in LIGHT mode, taps "Try the demo", opens the Coach window and saves it at 2x.
// It mirrors wellness-tracker docs/linkedin/capture.cjs (which shoots dark mode with Playwright):
// the demo banner is hidden and room is left for the iPhone status bar. No sign-in details are
// used; "Try the demo" is the app's own public sample account.
let out = URL(fileURLWithPath: CommandLine.arguments[1])
let W: CGFloat = 393, H: CGFloat = 852
let base = "https://wellness-tracker-virid.vercel.app"

func fail(_ m: String) -> Never {
  FileHandle.standardError.write((m + "\n").data(using: .utf8)!)
  exit(1)
}

// Hide the demo banner, leave room for the status bar (the app's light --background behind it),
// and open the Coach window unless it is already open.
let PREPARE = """
(() => {
  document.querySelectorAll('form').forEach((f) => { if (f.textContent.includes('Demo account')) f.remove(); });
  const portal = document.querySelector('nextjs-portal'); if (portal) portal.remove();
  // The launch splash fades out with a CSS animation, and WebKit pauses animations in a window
  // that is not on screen. Take the splash away and let nothing else wait on an animation.
  document.querySelectorAll('.splash').forEach((e) => e.remove());
  document.documentElement.classList.add('no-splash');
  const st = document.createElement('style');
  st.textContent = '*,*::before,*::after{animation:none !important;transition:none !important} main{padding-top:calc(54px + 1.5rem) !important} nav{padding-bottom:30px !important;background:#fcfcfc !important} body::before{content:"";position:fixed;top:0;left:0;right:0;height:54px;background:#fcfcfc;z-index:60} [role=dialog]{padding-top:calc(54px + 1rem) !important}';
  document.head.appendChild(st);
  if (document.querySelector('[role=dialog]')) return 'already open';
  const b = document.querySelector('button[aria-label="Coach"]');
  if (!b) return 'no coach button';
  b.click();
  return 'opened';
})()
"""

final class Driver: NSObject, WKNavigationDelegate {
  let web: WKWebView
  var started = false
  init(_ web: WKWebView) { self.web = web }

  func after(_ t: Double, _ f: @escaping () -> Void) { DispatchQueue.main.asyncAfter(deadline: .now() + t, execute: f) }
  func js(_ s: String, _ then: @escaping (Any?) -> Void) { web.evaluateJavaScript(s) { v, _ in then(v) } }

  /// Polls a JavaScript expression until it is true.
  func waitFor(_ expr: String, tries: Int = 60, _ then: @escaping () -> Void) {
    js("!!(\(expr))") { v in
      if (v as? Bool) == true { then() }
      else if tries <= 0 { fail("timed out waiting for: \(expr)") }
      else { self.after(0.5) { self.waitFor(expr, tries: tries - 1, then) } }
    }
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    if started { return }
    started = true
    after(2.0) { self.tryDemo() }
  }

  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { fail("load failed: \(error.localizedDescription)") }
  func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { fail("load failed: \(error.localizedDescription)") }

  func tryDemo() {
    js("(() => { const b = [...document.querySelectorAll('button, a')].find((e) => e.textContent.trim().startsWith('Try the demo')); if (b) { b.click(); return true } return false })()") { v in
      if (v as? Bool) != true { fail("no Try the demo button on the login page") }
      self.waitFor("location.pathname.includes('workouts')") { self.after(3.0) { self.openCoach() } }
    }
  }

  func openCoach() {
    js(PREPARE) { v in
      let how = (v as? String) ?? "?"
      if how == "no coach button" { fail("no Coach button on the page") }
      FileHandle.standardError.write("coach window: \(how)\n".data(using: .utf8)!)
      self.waitFor("document.querySelector('[role=dialog]') && document.querySelector('[role=dialog]').innerText.length > 40") { self.after(1.5) { self.snap() } }
    }
  }

  func snap() {
    js("document.querySelector('[role=dialog]').innerText") { v in
      FileHandle.standardError.write("--- dialog text ---\n\((v as? String) ?? "")\n-------------------\n".data(using: .utf8)!)
      let cfg = WKSnapshotConfiguration()
      cfg.rect = CGRect(x: 0, y: 0, width: W, height: H)
      cfg.snapshotWidth = NSNumber(value: Double(W))
      self.web.takeSnapshot(with: cfg) { image, error in
        guard let image = image, let tiff = image.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff), let png = rep.representation(using: .png, properties: [:]) else {
          fail("snapshot failed: \(String(describing: error))")
        }
        try! png.write(to: out)
        print("\(out.lastPathComponent) \(rep.pixelsWide)x\(rep.pixelsHigh)")
        exit(0)
      }
    }
  }
}

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
app.appearance = NSAppearance(named: .aqua)  // light mode, so the app's prefers-color-scheme: light theme
let window = NSWindow(contentRect: NSRect(x: -10000, y: -10000, width: W, height: H), styleMask: [.borderless], backing: .buffered, defer: false)
window.appearance = NSAppearance(named: .aqua)
let config = WKWebViewConfiguration()
config.websiteDataStore = .nonPersistent()  // a fresh demo session each run; nothing is kept
let web = WKWebView(frame: NSRect(x: 0, y: 0, width: W, height: H), configuration: config)
web.customUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
let driver = Driver(web)
web.navigationDelegate = driver
window.contentView = web
web.load(URLRequest(url: URL(string: base + "/login")!))
DispatchQueue.main.asyncAfter(deadline: .now() + 90) { fail("timeout") }
app.run()
