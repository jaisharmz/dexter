-- Usage: osascript axdump.applescript <process name> <max depth>
-- Prints one line per UI element of the process's first window: depth, role, description, name, value, position, size.
on run argv
	set procName to item 1 of argv
	set maxDepth to (item 2 of argv) as integer
	set output to {}
	tell application "System Events"
		tell process procName
			set rootElement to window 1
			set output to my walk(rootElement, 0, maxDepth, output)
		end tell
	end tell
	set AppleScript's text item delimiters to linefeed
	return output as text
end run

on walk(element, depth, maxDepth, output)
	tell application "System Events"
		set roleText to ""
		set descText to ""
		set nameText to ""
		set valueText to ""
		set posText to ""
		try
			set roleText to role of element as text
		end try
		try
			set descText to description of element as text
		end try
		try
			set nameText to name of element as text
		end try
		try
			set valueText to value of element as text
			if length of valueText > 300 then set valueText to text 1 thru 300 of valueText
		end try
		try
			set p to position of element
			set s to size of element
			set posText to ((item 1 of p) as text) & "," & ((item 2 of p) as text) & " " & ((item 1 of s) as text) & "x" & ((item 2 of s) as text)
		end try
		set indent to ""
		repeat depth times
			set indent to indent & "  "
		end repeat
		set end of output to indent & depth & " " & roleText & " | " & descText & " | " & nameText & " | " & valueText & " | " & posText
		if depth < maxDepth then
			set children to {}
			try
				set children to UI elements of element
			end try
			repeat with child in children
				set output to my walk(child, depth + 1, maxDepth, output)
			end repeat
		end if
	end tell
	return output
end walk
