-- Usage: osascript tapbook.applescript <process name>
-- Taps the book's page view (the element whose value is the page text) through accessibility,
-- which shows or hides Kindle's toolbar without bringing the app forward. The toolbar holds the
-- In-book Search button, Close Book, Table of Contents and the progress slider ("Page N , P%").
on run argv
	set procName to item 1 of argv
	tell application "System Events"
		tell process procName
			set view to my pageView(window 1, 0)
			if view is missing value then return "no page view"
			perform action "AXPress" of view
		end tell
	end tell
	return "tapped"
end run

on pageView(element, depth)
	tell application "System Events"
		if depth > 30 then return missing value
		try
			if (role of element as text) is "AXGenericElement" then
				set v to value of element as text
				if length of v > 200 then return element
			end if
		end try
		set children to {}
		try
			set children to UI elements of element
		end try
		repeat with child in children
			set hit to my pageView(child, depth + 1)
			if hit is not missing value then return hit
		end repeat
	end tell
	return missing value
end pageView
