import Foundation
import CoreGraphics

// Usage: keypid <pid> <virtual key code> [count] [delay seconds] [cmd|shift|cmdshift]
//        keypid <pid> type "<text>"
// Posts key events straight to one process, so the frontmost app never receives them.
// Key codes: 124 right arrow, 123 left arrow, 53 escape, 36 return, 3 f, 0 a.
let args = CommandLine.arguments
guard args.count >= 3, let pid = pid_t(args[1]) else {
    print("usage: keypid <pid> <keycode> [count] [delay] [cmd|shift|cmdshift] | keypid <pid> type <text>")
    exit(2)
}
let source = CGEventSource(stateID: .privateState)
if args[2] == "type" {
    let text = args.count > 3 ? args[3] : ""
    for scalar in text.utf16 {
        var unit = scalar
        if let down = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: true),
           let up = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: false) {
            down.keyboardSetUnicodeString(stringLength: 1, unicodeString: &unit)
            up.keyboardSetUnicodeString(stringLength: 1, unicodeString: &unit)
            down.postToPid(pid)
            usleep(15_000)
            up.postToPid(pid)
            usleep(25_000)
        }
    }
    exit(0)
}
guard let code = CGKeyCode(args[2]) else { exit(2) }
let count = args.count > 3 ? Int(args[3]) ?? 1 : 1
let delay = args.count > 4 ? Double(args[4]) ?? 0.4 : 0.4
var flags: CGEventFlags = []
if args.count > 5 {
    if args[5].contains("cmd") { flags.insert(.maskCommand) }
    if args[5].contains("shift") { flags.insert(.maskShift) }
}
for _ in 0..<count {
    if let down = CGEvent(keyboardEventSource: source, virtualKey: code, keyDown: true),
       let up = CGEvent(keyboardEventSource: source, virtualKey: code, keyDown: false) {
        down.flags = flags
        up.flags = flags
        down.postToPid(pid)
        usleep(30_000)
        up.postToPid(pid)
    }
    usleep(useconds_t(delay * 1_000_000))
}
