#!/usr/bin/env python3
"""Start a textbook folder: copy the skill's assets into <folder>/page/ so the book builds alone.

    python3 skills/textbook/scripts/new_book.py <folder> --title "Ideas Like Diffusion"

Writes <folder>/page/{shell.html, style.css, runtime.js, build.py, book.json} and the empty
folders figures/, tests/ and dist/. It refuses to overwrite a page/ that already exists. When
the exercises come from a drills deck, build the deck in <folder> itself (problems/ and
solutions/ beside page/), and list each unit's cards in page/exercises.json.
"""
import argparse
import json
import pathlib
import re
import shutil
import sys

ASSETS = pathlib.Path(__file__).resolve().parent.parent / "assets"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("folder")
    parser.add_argument("--title", required=True)
    args = parser.parse_args()

    page = pathlib.Path(args.folder).expanduser().resolve() / "page"
    if page.exists():
        sys.exit(f"{page} already exists; edit it in place")
    for sub in ("figures", "tests", "dist"):
        (page / sub).mkdir(parents=True)
    for name in ("shell.html", "style.css", "runtime.js", "build.py"):
        shutil.copy(ASSETS / name, page / name)
    shell = page / "shell.html"
    shell.write_text(shell.read_text().replace("BOOK TITLE", args.title))
    slug = re.sub(r"[^a-z0-9]+", "_", args.title.lower()).strip("_")
    (page / "book.json").write_text(json.dumps({"title": args.title, "slug": slug}) + "\n")
    print(f"started {page} (slug {slug}); write shell.html, then: python3 {page}/build.py")


if __name__ == "__main__":
    main()
