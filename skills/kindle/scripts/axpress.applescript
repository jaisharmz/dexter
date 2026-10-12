-- Usage: osascript axpress.applescript <process name> <role> <description> [press|show] [prefix|exact]
-- Finds the first UI element in the process's first window with that role whose description starts with
-- (prefix, the default) or equals (exact) the given text. "press" performs AXPress on it; "show" only reports it.
-- Use exact for short names: the prefix "Close" also matches Kindle's "Close Book".
on run argv
	set procName to item 1 of argv
	set wantedRole to item 2 of argv
	set wantedPrefix to item 3 of argv
	set mode to "show"
	if (count of argv) > 3 then set mode to item 4 of argv
	set matching to "prefix"
	if (count of argv) > 4 then set matching to item 5 of argv
	tell application "System Events"
		tell process procName
			set found to my search(window 1, wantedRole, wantedPrefix, matching, 0)
		end tell
		if found is missing value then return "not found"
		set descText to ""
		try
			set descText to description of found as text
		end try
		if mode is "press" then
			perform action "AXPress" of found
			return "pressed: " & descText
		end if
		return "found: " & descText
	end tell
end run

on search(element, wantedRole, wantedPrefix, matching, depth)
	tell application "System Events"
		if depth > 30 then return missing value
		set roleText to ""
		set descText to ""
		try
			set roleText to role of element as text
		end try
		try
			set descText to description of element as text
		end try
		if roleText is wantedRole then
			if matching is "exact" and descText is wantedPrefix then return element
			if matching is not "exact" and descText starts with wantedPrefix then return element
		end if
		set children to {}
		try
			set children to UI elements of element
		end try
		repeat with child in children
			set hit to my search(child, wantedRole, wantedPrefix, matching, depth + 1)
			if hit is not missing value then return hit
		end repeat
	end tell
	return missing value
end search
