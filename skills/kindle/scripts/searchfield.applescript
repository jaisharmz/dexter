-- Usage: osascript searchfield.applescript <process name> <text>
-- Focuses the first text field in the process's first window and sets its value, without
-- bringing the app to the front. Used for Kindle's in-book search box.
on run argv
	set procName to item 1 of argv
	set query to item 2 of argv
	tell application "System Events"
		tell process procName
			set field to my findField(window 1, 0)
			if field is missing value then error "no text field in the window; open the search panel first"
			set focused of field to true
			set value of field to query
		end tell
	end tell
	return "set"
end run

on findField(element, depth)
	tell application "System Events"
		if depth > 30 then return missing value
		try
			if (role of element as text) is "AXTextField" then return element
		end try
		set children to {}
		try
			set children to UI elements of element
		end try
		repeat with child in children
			set hit to my findField(child, depth + 1)
			if hit is not missing value then return hit
		end repeat
	end tell
	return missing value
end findField
