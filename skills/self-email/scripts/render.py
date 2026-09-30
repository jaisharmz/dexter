"""Render a self-email report from a JSON spec into Gmail-safe HTML.

Gmail's compose box strips <style> blocks when HTML is pasted in, so every rule is
inlined on the element it styles. The layout follows the presentation and ordering
guidelines: a one-minute summary first, then tables whose rows are already ordered
by what the reader should do first.

    python3 render.py spec.json > email.html
    python3 render.py spec.json --text > email.txt   # plain text, for the deslop gate

Spec shape (every key but "summary" and "sections" is optional):

    {
      "title": "Applications submitted overnight",
      "subtitle": "Wednesday, September 30, 2026",
      "summary": ["One paragraph per string."],
      "sections": [
        {
          "heading": "Submitted",
          "intro": "One sentence on what the table holds.",
          "columns": [{"key": "company", "label": "Company"},
                      {"key": "roles", "label": "Roles"},
                      {"key": "reason", "label": "Why it waits", "chips": true}],
          "rows": [{"company": {"text": "Example Labs", "href": "https://..."},
                    "roles": ["MLRS", "MLRE"],
                    "reason": ["Company-specific essay"]}]
        }
      ],
      "footer": "Where the files live, in one line."
    }

A cell is a string, a list of strings (one per line), or {"text": ..., "href": ...}.
A column with "chips": true renders each string as a small label.

A section can also carry "paragraphs" (a list of strings) and "blocks", a list of
{"label": ..., "note": ..., "text": str or [str]} for drafts the reader is asked to
review, such as essays: each renders as a bold label, a muted note, and the text set
off by a left rule so a reply can quote it by label.
"""

from __future__ import annotations

import html
import json
import sys

# One deep blue carries the accent: headings and links only. Everything else is a
# blue-leaning neutral, so the one colour on the page marks what is clickable.
INK = "#1d2733"
MUTED = "#5b6775"
RULE = "#dfe4ea"
ACCENT = "#003262"
CHIP_BACKGROUND = "#eef2f6"
CHIP_INK = "#243447"
FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"


def escape(text) -> str:
    return html.escape(str(text), quote=True)


def render_cell(value, chips: bool = False) -> str:
    if value is None or value == "":
        return f'<span style="color:{MUTED};">&ndash;</span>'
    if isinstance(value, dict):
        text = escape(value.get("text", ""))
        href = value.get("href")
        if href:
            return f'<a href="{escape(href)}" style="color:{ACCENT};text-decoration:none;font-weight:600;">{text}</a>'
        return f'<span style="font-weight:600;">{text}</span>'
    if isinstance(value, list):
        if chips:
            return " ".join(
                f'<span style="display:inline-block;margin:0 4px 4px 0;padding:2px 8px;border-radius:10px;'
                f'background:{CHIP_BACKGROUND};color:{CHIP_INK};font-size:12px;line-height:18px;white-space:nowrap;">{escape(item)}</span>'
                for item in value
            )
        return "<br>".join(render_cell(item) if isinstance(item, dict) else escape(item) for item in value)
    if chips:
        return render_cell([value], chips=True)
    return escape(value)


def render_table(section: dict) -> str:
    columns = section["columns"]
    head = "".join(
        f'<th align="left" style="padding:8px 10px;border-bottom:2px solid {RULE};font-size:11px;letter-spacing:0.06em;'
        f'text-transform:uppercase;color:{MUTED};font-weight:600;">{escape(column["label"])}</th>'
        for column in columns
    )
    rows = []
    for index, row in enumerate(section["rows"], start=1):
        cells = "".join(
            f'<td valign="top" style="padding:9px 10px;border-bottom:1px solid {RULE};font-size:14px;line-height:1.45;color:{INK};">'
            f'{render_cell(row.get(column["key"]), chips=column.get("chips", False))}</td>'
            for column in columns
        )
        number = f'<td valign="top" style="padding:9px 6px 9px 0;border-bottom:1px solid {RULE};font-size:12px;color:{MUTED};font-variant-numeric:tabular-nums;">{index}</td>'
        rows.append(f"<tr>{number if section.get('numbered') else ''}{cells}</tr>")
    number_head = f'<th style="border-bottom:2px solid {RULE};"></th>' if section.get("numbered") else ""
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:760px;font-family:{FONT};">'
        f"<thead><tr>{number_head}{head}</tr></thead><tbody>{''.join(rows)}</tbody></table>"
    )


def render(spec: dict) -> str:
    parts = [f'<div style="font-family:{FONT};color:{INK};max-width:760px;">']
    if spec.get("title"):
        parts.append(f'<div style="font-size:20px;font-weight:700;color:{ACCENT};margin:0 0 2px;">{escape(spec["title"])}</div>')
    if spec.get("subtitle"):
        parts.append(f'<div style="font-size:13px;color:{MUTED};margin:0 0 16px;">{escape(spec["subtitle"])}</div>')
    parts.append(
        f'<div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:{MUTED};font-weight:600;margin:0 0 6px;">In one minute</div>'
    )
    for paragraph in spec["summary"]:
        parts.append(f'<p style="font-size:15px;line-height:1.55;margin:0 0 10px;">{escape(paragraph)}</p>')
    for section in spec["sections"]:
        parts.append(f'<div style="font-size:16px;font-weight:700;color:{ACCENT};margin:22px 0 4px;">{escape(section["heading"])}</div>')
        if section.get("intro"):
            parts.append(f'<p style="font-size:14px;line-height:1.5;color:{MUTED};margin:0 0 8px;">{escape(section["intro"])}</p>')
        if section.get("columns"):
            parts.append(render_table(section))
        for paragraph in section.get("paragraphs", []):
            parts.append(f'<p style="font-size:14px;line-height:1.55;margin:8px 0;">{escape(paragraph)}</p>')
        for block in section.get("blocks", []):
            parts.append(f'<div style="font-size:14px;font-weight:700;margin:16px 0 4px;">{escape(block["label"])}</div>')
            if block.get("note"):
                parts.append(f'<div style="font-size:12px;line-height:1.45;color:{MUTED};margin:0 0 4px;">{escape(block["note"])}</div>')
            texts = block["text"] if isinstance(block["text"], list) else [block["text"]]
            for paragraph in texts:
                parts.append(
                    f'<p style="font-size:14px;line-height:1.6;margin:4px 0 8px;padding-left:10px;border-left:3px solid {RULE};">{escape(paragraph)}</p>'
                )
    if spec.get("footer"):
        parts.append(f'<p style="font-size:12px;line-height:1.5;color:{MUTED};margin:22px 0 0;border-top:1px solid {RULE};padding-top:10px;">{escape(spec["footer"])}</p>')
    parts.append("</div>")
    return "".join(parts)


def render_text(spec: dict) -> str:
    lines = [spec.get("title", ""), ""] + list(spec["summary"])
    for section in spec["sections"]:
        lines += ["", section["heading"], section.get("intro", "")]
        lines += section.get("paragraphs", [])
        for block in section.get("blocks", []):
            lines += ["", block["label"], block.get("note", "")]
            lines += block["text"] if isinstance(block["text"], list) else [block["text"]]
    return "\n".join(line for line in lines if line is not None)


if __name__ == "__main__":
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    print(render_text(spec) if "--text" in sys.argv else render(spec))
