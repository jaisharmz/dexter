# Getting a .pptx into Google Slides, and checking it there

Everything here runs in the operator's own Chrome through Claude in Chrome
(`mcp__claude-in-chrome__*`), signed in to their Google accounts. `kernel/browser-accounts.md`
covers switching accounts with `/u/N`; confirm the account on the page before writing.

Load the tools in one call:

    ToolSearch "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,
    mcp__claude-in-chrome__computer,mcp__claude-in-chrome__find,mcp__claude-in-chrome__file_upload,
    mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__browser_batch"

## 1. Upload the file to Drive

Import slides is a cross-origin dialog, so its file picker cannot be reached and a
synthetic drop does nothing. Upload the file to Drive first, into the account that owns the
target deck.

1. Open `https://drive.google.com/drive/u/N/home` and check the account avatar or name.
2. Make the file picker reachable. Drive creates its `<input type=file>` on demand and clicks
   it, which would open a native dialog the tools cannot use. Patch `click` so the input shows
   up on the page instead:

   ```js
   window.__origClick = window.__origClick || HTMLInputElement.prototype.click;
   HTMLInputElement.prototype.click = function () {
     if (this.type === "file") {
       this.setAttribute("aria-label", "slides upload input");
       this.style.cssText = "position:fixed;top:4px;left:4px;z-index:2147483647;display:block;opacity:1;width:200px;height:30px";
       if (!this.isConnected) document.body.appendChild(this);
       return;
     }
     return window.__origClick.call(this);
   };
   ```

3. Click **New**, wait for the menu, click **File upload**. Then `find` "slides upload input
   (file input)" and pass its ref to `file_upload` with the .pptx path.
4. Restore the original: `HTMLInputElement.prototype.click = window.__origClick`.
5. Wait for "Upload complete" in the bottom-right panel; zoom into it to read it. A 4 MB deck
   takes 10-20 seconds.

## 2. Import it into the deck

1. Open the deck and wait until the filmstrip has loaded. Count the slides with
   `document.querySelectorAll('.punch-filmstrip-thumbnail').length`.
2. Select the slide the new ones should follow. Imported slides land after the selection.
3. File → **Import slides**. `find` the menu item by name, because coordinates drift between
   loads. Search the file name, clearing any old search first, then double-click its card.
   The slide picker takes about 12 seconds to appear.
4. Untick **Keep original theme**, so the slides take the deck's own theme. Zoom in to confirm
   it is unticked, because a click during the dialog's fade-in does not register.
5. **Select all**, or tick only the slides wanted, then **Import slides**. Count the thumbnails
   again.

## 3. Replace slides

- **A working deck that holds only this deck:** click a thumbnail, then cmd+A and Delete in the
  filmstrip, and import everything. After a page load, wait until the filmstrip is ready. A
  select-all sent too early lands on the slide canvas and deletes nothing, or deletes the wrong
  thing.
- **Some slides in a deck other people use:** see section 5.
- Re-import only the slides that changed. Delete the old one, select the slide before it, and
  import that one slide from the new file.

## 4. Moving slides to another Google account

Copying and pasting slides between accounts loses the images. The pasted slides still point
at images in the source deck, which the other account cannot read, so each image shows as a
grey box with a warning icon. Build a .pptx of just those slides (`SLIDES=1,3,4 node deck.js
out.pptx`), upload it to the other account's Drive, and import it. A .pptx carries its images
inside.

## 5. Decks other people edit

- Change only the operator's slides, and only when they ask.
- Before deleting, read the thumbnails on both sides of the range, select it (click the first,
  shift-click the last), and confirm in a screenshot that exactly those slides are selected.
  Count the slides after deleting.
- Select the slide before the gap, then import, so the slides return to the same place.
- Avatars at the top right mean someone else is in the deck. Leave their slides alone,
  including the one used as the insertion point.

## 6. Checking every slide

Zoom into each slide (`computer` zoom on the canvas) and check for:

- text that overflows its box, and labels or banners that wrap onto a second line;
- fonts actually applied, and bold where it should be and nowhere else (a run inherits bold
  from its box unless it sets its own);
- images present (a grey box with a warning icon means the image is unreachable);
- nothing smaller than the profile's minimum size;
- flags, arrows and captions lined up with their boxes;
- the speaker notes present.

Fix in the build script, rebuild and re-import. Never patch slides by hand in Slides: the next
rebuild would undo it.

## Timing that bites

- `browser_batch` waits are 10 seconds at most per action, so chain two for a slow step.
- The session's tab group can disappear between turns. Call `tabs_context_mcp` with
  `createIfEmpty`, then navigate again.
- A tab in the background may ignore clicks. Take a screenshot first to bring it forward.
