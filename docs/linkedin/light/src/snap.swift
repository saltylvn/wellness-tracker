import AppKit
import WebKit

// usage: snap <file.html> <out.png> <width> <height>   (renders at 2x)
let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1])
let out = URL(fileURLWithPath: args[2])
let w = CGFloat(Double(args[3])!), h = CGFloat(Double(args[4])!)

final class Delegate: NSObject, WKNavigationDelegate {
  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
      let cfg = WKSnapshotConfiguration()
      cfg.rect = CGRect(x: 0, y: 0, width: w, height: h)
      cfg.snapshotWidth = NSNumber(value: Double(w))
      webView.takeSnapshot(with: cfg) { image, error in
        guard let image = image, let tiff = image.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff), let png = rep.representation(using: .png, properties: [:]) else {
          FileHandle.standardError.write("snapshot failed: \(String(describing: error))\n".data(using: .utf8)!)
          exit(1)
        }
        try! png.write(to: out)
        print("\(out.lastPathComponent) \(rep.pixelsWide)x\(rep.pixelsHigh)")
        exit(0)
      }
    }
  }
  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { FileHandle.standardError.write("load failed\n".data(using: .utf8)!); exit(1) }
}

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
let window = NSWindow(contentRect: NSRect(x: -10000, y: -10000, width: w, height: h), styleMask: [.borderless], backing: .buffered, defer: false)
let web = WKWebView(frame: NSRect(x: 0, y: 0, width: w, height: h))
let delegate = Delegate()
web.navigationDelegate = delegate
window.contentView = web
web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
DispatchQueue.main.asyncAfter(deadline: .now() + 25) { FileHandle.standardError.write("timeout\n".data(using: .utf8)!); exit(2) }
app.run()
