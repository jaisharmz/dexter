#!/bin/zsh
# Read a book in Kindle for Mac without taking the screen: every key goes to the Kindle process
# by pid and every read goes through the accessibility tree, so the frontmost app never changes.
#
#   kindle.sh doctor                       check the app, the window and the permissions
#   kindle.sh open "<title prefix>"        open a downloaded book from the library view
#   kindle.sh library                      close the open book and go back to the library
#   kindle.sh search "<phrase>"            in-book search: "Page N<TAB>snippet" per visible hit
#   kindle.sh page "<phrase>"              the print page of the first hit, for a citation
#   kindle.sh goto "<phrase>"              jump to the first hit and leave search mode
#   kindle.sh where                        the print page on screen now, from the progress bar
#   kindle.sh text                         the text on screen now (one two-page spread)
#   kindle.sh next [n] / prev [n]          turn n spreads forward or back
#   kindle.sh read <max> [--until "<text>"]  print spread after spread, stopping at <text>
#   kindle.sh shot <out.png>               capture the Kindle window, even when covered
#   kindle.sh escape                       close a popover or the search panel
setopt err_exit pipe_fail
HERE=${0:A:h}
CACHE=${KINDLE_SKILL_CACHE:-$HOME/Library/Caches/kindle-skill}
PROC=Kindle

build() {
  mkdir -p "$CACHE"
  for tool in keypid winid; do
    if [[ ! -x "$CACHE/$tool" || "$HERE/$tool.swift" -nt "$CACHE/$tool" ]]; then
      swiftc -O "$HERE/$tool.swift" -o "$CACHE/$tool" 2>/dev/null || { echo "could not compile $tool.swift (needs the Xcode command line tools)" >&2; exit 1; }
    fi
  done
}

pid() {
  local p
  p=$(pgrep -x "$PROC" | head -1) || true
  [[ -n "$p" ]] || { echo "Kindle is not running: open -a 'Amazon Kindle'" >&2; exit 1; }
  print -r -- "$p"
}

key() { "$CACHE/keypid" "$(pid)" "$@"; }

dump() { osascript "$HERE/axdump.applescript" "$PROC" "${1:-26}" 2>/dev/null; }

has() { dump 26 | grep -F -q -- "$1"; }

press() { osascript "$HERE/axpress.applescript" "$PROC" "$1" "$2" press "${3:-prefix}" >/dev/null 2>&1; }

# After a jump from the results, a bar ("Result 1 of N", Back, Forward, Close) stays at the bottom
# and Edit > Find goes disabled until it closes. Its button is "Close", so match exactly: the
# prefix would also hit "Close Book".
close_results() {
  if has "AXStaticText | Result "; then
    press AXButton Close exact || true
    sleep 1
  fi
}

# The toolbar (In-book Search, Close Book, Table of Contents, the progress slider) only exists in
# the tree while it is shown. Tapping the page view through accessibility toggles it.
toolbar_on() {
  if ! has "AXButton | In-book Search |"; then
    osascript "$HERE/tapbook.applescript" "$PROC" >/dev/null
    sleep 1
  fi
}

search_panel() {
  has "AXTextField" && return 0
  key 53 1 0.5                 # escape closes popovers, which otherwise swallow every key
  close_results
  key 3 1 0.5 cmd              # cmd+F opens the in-book search panel
  for i in 1 2 3 4 5 6; do
    has "AXTextField" && return 0
    sleep 0.5
  done
  toolbar_on
  press AXButton "In-book Search" exact || true
  for i in 1 2 3 4 5 6; do
    has "AXTextField" && return 0
    sleep 0.5
  done
  echo "the search panel did not open; is a book open in the reading view?" >&2
  exit 1
}

# Search results are links (sometimes generic elements) described as "Page N, … snippet"; books
# without print page numbers say "Location N". Chapter headings come through as AXHeading.
results() {
  # The panel's rows sit a few levels deep; the toolbar's book-title heading sits deeper, so keep
  # only shallow rows (two spaces of indent per level).
  dump 26 | grep -E '^ {0,12}[0-9]+ AX(Heading \||Link \| (Page|Location) |GenericElement \| (Page|Location) )' \
    | sed -E 's/^ *[0-9]+ AXHeading \| BOOK, \(([0-9]+)\), ([^|]*)\|.*/hits in the book: \1\n## \2/; s/^ *[0-9]+ AXHeading \| ([^|]*)\|.*/## \1/; s/^ *[0-9]+ AX(Link|GenericElement) \| ((Page|Location) [0-9ivxlcIVXLC]+), (.*) \| missing value \| [^|]*\| [^|]*$/\2\t\4/' \
    | grep -v -E "^ *[0-9]+ AX" | awk '!(/^## / && seen[$0]++)' | sed -E 's/ +$//'
}

# Return sometimes misses the field and the panel keeps the previous query's hits, so check that
# the snippets contain the query and retry after an escape, which hands focus back to the field.
do_search() {
  local want out
  want=$(print -r -- "$1" | tr "[:upper:]" "[:lower:]" | sed "s/[’']/'/g")
  for attempt in 1 2 3; do
    search_panel
    osascript "$HERE/searchfield.applescript" "$PROC" "$1" >/dev/null
    sleep 0.5
    key 36 1 0.3               # Return runs the search
    sleep 3
    out=$(results)
    if print -r -- "$out" | grep -E "^(Page|Location) " | tr "[:upper:]" "[:lower:]" | sed "s/[’']/'/g" | grep -q -F -- "$want"; then
      print -r -- "$out"
      return 0
    fi
    key 53 1 0.8
  done
  echo "no hit for \"$1\" after three tries (or the search did not run)" >&2
  return 1
}

case "${1:-}" in
  doctor)
    build
    [[ -d "/Applications/Amazon Kindle.app" ]] && echo "app: installed" || echo "app: missing (install Kindle for Mac)"
    pgrep -x "$PROC" >/dev/null && echo "process: running" || echo "process: not running (open -a 'Amazon Kindle')"
    osascript -e "tell application \"System Events\" to tell process \"$PROC\" to get name of window 1" >/dev/null 2>&1 \
      && echo "accessibility: ok" || echo "accessibility: denied or no window (System Settings > Privacy > Accessibility for the app running this shell)"
    "$CACHE/winid" kindle | head -1 | grep -q . && echo "window: found" || echo "window: none"
    ;;
  open)
    # The bar of recent books along the bottom opens a book reliably; a press on its tile in the
    # library grid does not always, so try the bar first.
    build
    for role in AXRadioButton AXButton; do
      press "$role" "$2" || continue
      for i in 1 2 3 4 5 6; do
        sleep 1
        has "AXButton | Add Bookmark |" && { echo "opened: $2"; exit 0; }
      done
    done
    echo "not opened. open needs the library view and a downloaded book whose title starts with the prefix; open it by hand once if it is not in the recent bar"
    exit 1
    ;;
  library)
    build
    key 53 1 0.5
    close_results
    toolbar_on
    press AXButton "Close Book" exact && echo "closed the book" || echo "no Close Book button"
    ;;
  search)
    build; do_search "$2"
    ;;
  page)
    build; do_search "$2" | grep -E -m1 "^(Page|Location) " || { echo "no hit for: $2" >&2; exit 1; }
    ;;
  goto)
    build
    hit=$(do_search "$2" | grep -E -m1 "^(Page|Location) " | cut -f1) || true
    [[ -n "$hit" ]] || { echo "no hit for: $2" >&2; exit 1; }
    press AXLink "$hit," || press AXGenericElement "$hit," || true
    sleep 2
    close_results
    echo "at: $hit"
    ;;
  where)
    build
    shown=0; has "AXButton | In-book Search |" && shown=1
    toolbar_on
    dump 26 | grep -F "AXSlider | Reading Progress Bar" | sed -E 's/.*Reading Progress Bar \| [^|]*\| ([^|]*)\|.*/\1/; s/ +$//'
    (( shown )) || osascript "$HERE/tapbook.applescript" "$PROC" >/dev/null
    ;;
  text)
    osascript "$HERE/pagetext.applescript" "$PROC"
    ;;
  next|prev)
    build
    [[ "$1" == next ]] && code=124 || code=123
    key $code "${2:-1}" 1.2
    ;;
  read)
    build
    max=${2:-20}; until_text=""
    [[ "${3:-}" == "--until" ]] && until_text="$4"
    last=""
    for i in $(seq 1 "$max"); do
      page=$(osascript "$HERE/pagetext.applescript" "$PROC")
      [[ "$page" == "$last" ]] && { echo "[stopped: the page did not turn; try kindle.sh escape]" >&2; break; }
      if [[ -n "$until_text" && "$page" == *"$until_text"* ]]; then
        print -r -- "${page%%$until_text*}"
        break
      fi
      print -r -- "$page"
      last="$page"
      key 124 1 0.3
      sleep 1.6
    done
    ;;
  shot)
    build
    w=$("$CACHE/winid" kindle | awk -F'\t' '$4=="layer=0" && $5=="onscreen=true" {print $1; exit}')
    [[ -n "$w" ]] || { echo "no Kindle window on screen" >&2; exit 1; }
    screencapture -x -o -l "$w" "$2" && echo "$2"
    ;;
  escape)
    build; key 53 1 0.3
    ;;
  *)
    sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac
