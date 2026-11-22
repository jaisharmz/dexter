// ax: read any running app through the macOS accessibility tree, without bringing it forward.
//   ax tree  <app> [--depth N] [--from PATH]       print the tree: path, role, text, DOM id
//   ax text  <app> [--from PATH]                    print only the text, one line per element
//   ax find  <app> <substring> [--depth N]          print the elements whose text contains it
//   ax json  <app> [--depth N] [--from PATH]       the tree as JSON: {path, role, text, dom, children}
//   ax press <app> <PATH>                           AXPress one element (a link, a sidebar row, a button)
//   ax scroll <app> <PATH>                          AXScrollToVisible: bring an element into view, which makes chat apps load older history
//   ax actions <app> <PATH>                         list the actions and settable attributes of one element
//   ax front <app>                                  print "front" if the app is frontmost (the user is in it), else "back"
// <app> is a process name (Slack) or a pid. PATH is the dotted child path the tree prints (like 0.3.1).
// Electron and Chromium apps (Slack, Discord, VS Code, Notion) build their web content's tree only after a
// client sets AXManualAccessibility on the app, which this does first. It changes nothing the user sees.
import AppKit
import ApplicationServices

func fail(_ message: String) -> Never { FileHandle.standardError.write((message + "\n").data(using: .utf8)!); exit(1) }

var args = Array(CommandLine.arguments.dropFirst())
func option(_ name: String) -> String? {
    guard let index = args.firstIndex(of: name), index + 1 < args.count else { return nil }
    let value = args[index + 1]
    args.removeSubrange(index...(index + 1))
    return value
}
let depthLimit = Int(option("--depth") ?? "40") ?? 40
let fromPath = option("--from")
guard args.count >= 2 else { fail("usage: ax tree|text|find|press <app> [...]") }
let command = args[0], appName = args[1]

guard AXIsProcessTrusted() else { fail("this terminal has no Accessibility permission (System Settings > Privacy & Security > Accessibility)") }
let pid: pid_t = {
    if let number = Int32(appName) { return number }
    let matches = NSWorkspace.shared.runningApplications.filter { $0.localizedName == appName || $0.bundleURL?.deletingPathExtension().lastPathComponent == appName }
    guard let app = matches.first else { fail("\(appName) is not running") }
    return app.processIdentifier
}()
let app = AXUIElementCreateApplication(pid)
AXUIElementSetAttributeValue(app, "AXManualAccessibility" as CFString, kCFBooleanTrue)
AXUIElementSetMessagingTimeout(app, 3)

func attribute(_ element: AXUIElement, _ name: String) -> AnyObject? {
    var value: AnyObject?
    return AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success ? value : nil
}
func string(_ element: AXUIElement, _ name: String) -> String {
    guard let value = attribute(element, name) else { return "" }
    if let text = value as? String { return text }
    if let number = value as? NSNumber, CFGetTypeID(value) != CFBooleanGetTypeID() { return number.stringValue }
    return ""
}
func children(_ element: AXUIElement) -> [AXUIElement] { (attribute(element, "AXChildren") as? [AXUIElement]) ?? [] }
func text(_ element: AXUIElement) -> String {
    var parts: [String] = []
    for name in ["AXTitle", "AXDescription", "AXValue"] {
        let value = string(element, name).trimmingCharacters(in: .whitespacesAndNewlines)
        if !value.isEmpty && !parts.contains(value) { parts.append(value) }
    }
    return parts.joined(separator: " | ").replacingOccurrences(of: "\n", with: " ")
}

// The windows are the roots, numbered in order, so paths stay short: 0 is window 1.
let windows = (attribute(app, "AXWindows") as? [AXUIElement]) ?? []
func resolve(_ path: String) -> AXUIElement {
    let steps = path.split(separator: ".").compactMap { Int($0) }
    guard let first = steps.first, first < windows.count else { fail("no window \(path)") }
    var element = windows[first]
    for step in steps.dropFirst() {
        let kids = children(element)
        guard step < kids.count else { fail("path \(path) no longer exists; the view changed, so list the tree again") }
        element = kids[step]
    }
    return element
}

func walk(_ element: AXUIElement, _ path: String, _ depth: Int, _ visit: (AXUIElement, String, Int) -> Void) {
    visit(element, path, depth)
    guard depth < depthLimit else { return }
    for (index, child) in children(element).enumerated() { walk(child, "\(path).\(index)", depth + 1, visit) }
}
func roots() -> [(AXUIElement, String)] {
    if let fromPath { return [(resolve(fromPath), fromPath)] }
    return windows.enumerated().map { ($0.element, "\($0.offset)") }
}

switch command {
case "tree":
    for (root, path) in roots() {
        walk(root, path, 0) { element, path, depth in
            let role = string(element, "AXRole").replacingOccurrences(of: "AX", with: "")
            let words = text(element)
            let dom = string(element, "AXDOMIdentifier")
            if role == "Group" && words.isEmpty && dom.isEmpty { return }
            print("\(String(repeating: "  ", count: min(depth, 30)))\(path) \(role)\(words.isEmpty ? "" : " \"\(words.prefix(200))\"")\(dom.isEmpty ? "" : " #\(dom)")")
        }
    }
case "text":
    for (root, path) in roots() {
        walk(root, path, 0) { element, _, _ in
            let words = text(element)
            if !words.isEmpty && string(element, "AXRole") != "AXGroup" { print(words) }
        }
    }
case "find":
    guard args.count >= 3 else { fail("usage: ax find <app> <substring>") }
    let needle = args[2].lowercased()
    for (root, path) in roots() {
        walk(root, path, 0) { element, path, _ in
            let words = text(element)
            if words.lowercased().contains(needle) { print("\(path) \(string(element, "AXRole").replacingOccurrences(of: "AX", with: "")) \"\(words.prefix(200))\"") }
        }
    }
case "json":
    func node(_ element: AXUIElement, _ path: String, _ depth: Int) -> [String: Any] {
        var out: [String: Any] = ["path": path, "role": string(element, "AXRole").replacingOccurrences(of: "AX", with: "")]
        let words = text(element), dom = string(element, "AXDOMIdentifier")
        if !words.isEmpty { out["text"] = words }
        if !dom.isEmpty { out["dom"] = dom }
        if depth < depthLimit {
            let kids = children(element).enumerated().map { node($0.element, "\(path).\($0.offset)", depth + 1) }
            if !kids.isEmpty { out["children"] = kids }
        }
        return out
    }
    let tree = roots().map { node($0.0, $0.1, 0) }
    let data = try! JSONSerialization.data(withJSONObject: tree)
    FileHandle.standardOutput.write(data)
case "scroll":
    guard args.count >= 3 else { fail("usage: ax scroll <app> <PATH>") }
    let result = AXUIElementPerformAction(resolve(args[2]), "AXScrollToVisible" as CFString)
    print(result == .success ? "scrolled \(args[2])" : "scroll failed (\(result.rawValue))")
case "actions":
    guard args.count >= 3 else { fail("usage: ax actions <app> <PATH>") }
    let element = resolve(args[2])
    var names: CFArray?
    AXUIElementCopyActionNames(element, &names)
    print("actions: \(((names as? [String]) ?? []).joined(separator: ", "))")
    var attrs: CFArray?
    AXUIElementCopyAttributeNames(element, &attrs)
    let settable = ((attrs as? [String]) ?? []).filter { name in var ok: DarwinBoolean = false; AXUIElementIsAttributeSettable(element, name as CFString, &ok); return ok.boolValue }
    print("settable: \(settable.joined(separator: ", "))")
case "front":
    print(NSWorkspace.shared.frontmostApplication?.processIdentifier == pid ? "front" : "back")
case "press":
    guard args.count >= 3 else { fail("usage: ax press <app> <PATH>") }
    let element = resolve(args[2])
    let result = AXUIElementPerformAction(element, kAXPressAction as CFString)
    print(result == .success ? "pressed \(args[2]) \(text(element).prefix(80))" : "press failed (\(result.rawValue))")
default:
    fail("unknown command \(command)")
}
