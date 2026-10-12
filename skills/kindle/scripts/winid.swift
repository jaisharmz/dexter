import Foundation
import CoreGraphics

// Usage: winid <owner name substring> ; prints "<window id>\t<owner>\t<title>\t<bounds>" for each on-screen window whose owner matches.
let needle = CommandLine.arguments.count > 1 ? CommandLine.arguments[1].lowercased() : ""
let options: CGWindowListOption = [.optionAll, .excludeDesktopElements]
guard let info = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else { exit(1) }
for window in info {
    let owner = (window[kCGWindowOwnerName as String] as? String) ?? ""
    guard owner.lowercased().contains(needle) else { continue }
    let id = window[kCGWindowNumber as String] as? Int ?? -1
    let title = (window[kCGWindowName as String] as? String) ?? ""
    let layer = window[kCGWindowLayer as String] as? Int ?? -1
    let bounds = window[kCGWindowBounds as String] as? [String: Any] ?? [:]
    let onscreen = window[kCGWindowIsOnscreen as String] as? Bool ?? false
    print("\(id)\t\(owner)\t\(title)\tlayer=\(layer)\tonscreen=\(onscreen)\t\(bounds)")
}
