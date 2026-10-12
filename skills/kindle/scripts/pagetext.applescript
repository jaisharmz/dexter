-- Usage: osascript pagetext.applescript <process name>
-- Prints the full value of the longest-valued AXGenericElement in the first window (the Kindle page text).
on run argv
	set procName to item 1 of argv
	tell application "System Events"
		tell process procName
			set best to my longest(window 1, "", 0)
		end tell
	end tell
	return best
end run

on longest(element, best, depth)
	tell application "System Events"
		if depth > 30 then return best
		try
			if (role of element as text) is "AXGenericElement" then
				set v to value of element as text
				if length of v > length of best then set best to v
			end if
		end try
		set children to {}
		try
			set children to UI elements of element
		end try
		repeat with child in children
			set best to my longest(child, best, depth + 1)
		end repeat
	end tell
	return best
end longest
