"""Rebuild the job-search tracker sheet from the application records. The records are the truth
and the sheet is a view of them: this prints what to write, and the Sheets connector writes it.

    python3 skills/role-tracker/scripts/tracker.py rows [--tab Applications|Pipeline] [--requests] [--explain]
    python3 skills/role-tracker/scripts/tracker.py summary [--json | --values | --stamp]
    python3 skills/role-tracker/scripts/tracker.py layout (--current <metadata.json> | --fresh) [--tab <name>] [--sheets "Name=id,..."]

rows     {"Applications": [[header], ...], "Pipeline": [...]} for a values update with USER_ENTERED.
         --requests prints batchUpdate requests instead: typed cells (dates as dates, links as
         HYPERLINK formulas) that also clear the values and pasted links in the rows below.
         --explain prints a table saying where each row's Area came from.
summary  counts by status, track, area and whose move. --values prints the Summary tab, formulas
         over Applications; --stamp prints its last-updated line from the system clock.
layout   batchUpdate requests: tab names, order and colors, header row, column widths, frozen
         header, dropdowns, banding, the filter, and one conditional-format rule per value per
         column, every rule on one tab. Safe to re-run with --current: the spreadsheets.get
         response for sheets.properties, sheets.conditionalFormats and sheets.bandedRanges, saved
         to a file, from which it deletes the tabs' old rules and bandings first. Each tab's
         conditionalFormats may be a count instead of the list. A count too high fails the whole
         batch, which changes nothing; one too low leaves old rules below the new ones, which
         win. --fresh is for a new spreadsheet whose only tab has id 0, and is one-shot: on tabs
         that already have banding its addBanding fails, and the whole batch with it.

Records: skills/role-apply/state/applications.jsonl and responses.jsonl (--applications,
--responses). Rules and colors: references/defaults.json. Private and optional: state/sheet.json
(spreadsheet id, title, tab ids) and state/overrides.json (what the records cannot say).
"""
import argparse
import collections
import datetime
import json
import pathlib
import re
import sys

SKILL = pathlib.Path(__file__).resolve().parents[1]
RECORDS = SKILL.parent / "role-apply" / "state"
COMPANY_SUFFIXES = {"inc", "llc", "ltd", "corp", "corporation", "co", "company", "group", "technologies", "labs", "ai", "trading", "capital"}
ROLE_FILLER = {"a", "an", "and", "at", "for", "in", "of", "on", "the", "to", "with"}
ACRONYMS = {"ai", "ml"}
FIELDS = {"Company": "company", "Role": "role", "Track": "track", "Area": "area", "Applied": "applied", "Status": "status",
          "Stage": "stage", "Whose move": "whose_move", "Latest update": "update", "Next date": "next_date", "When": "when",
          "What to do": "todo"}
SETTABLE = {"role", "track", "area", "applied", "status", "whose_move", "update", "next", "next_date", "url", "email",
            "pipeline", "when", "todo"}
ISO_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
WARNED = set()


def warn(message):
    if message not in WARNED:
        WARNED.add(message)
        print(f"tracker: {message}", file=sys.stderr)


def read_json(path, default):
    return json.loads(path.read_text()) if path.exists() else default


def read_lines(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def flat(text):
    return " ".join(re.findall(r"[a-z0-9]+", (text or "").lower()))


def found(keyword, text):
    ending = "" if keyword.endswith("*") else "(?= |$)"
    return re.search("(?:^| )" + flat(keyword) + ending, text) is not None


def first_match(table, text):
    text = flat(text)
    for value, keywords in table.items():
        if any(found(keyword, text) for keyword in keywords):
            return value
    return None


def company_words(name):
    return re.findall(r"[a-z0-9]+", re.sub(r"\(.*?\)", " ", (name or "").lower()))


def short_keys(name):
    words = company_words(name)
    keys = set()
    while len(words) > 1 and words[-1] in COMPANY_SUFFIXES:
        words = words[:-1]
        keys.add("".join(words))
    return keys


def same_company(first, second):
    first_key, second_key = "".join(company_words(first)), "".join(company_words(second))
    if not first_key or not second_key:
        return False
    return first_key == second_key or first_key in short_keys(second) or second_key in short_keys(first)


def canonical(name, aliases):
    for source, target in aliases.items():
        if same_company(name, source):
            return target
    return name


def selects(entry, names, role):
    if isinstance(entry, str):
        entry = {"company": entry}
    return any(same_company(entry["company"], name) for name in names) and entry.get("role_has", "").lower() in (role or "").lower()


def looks_like_name(text):
    return bool(text) and (text != text.lower() or " " in text)


def title_case(slug):
    words = [word for word in re.split(r"[-_\s]+", slug or "") if word]
    return " ".join(word.upper() if word in ACRONYMS else word[:1].upper() + word[1:] for word in words)


def short_date(value, weekday=False):
    if not ISO_DATE.fullmatch(value or ""):
        return value or ""
    day = datetime.date.fromisoformat(value)
    text = f"{day:%b} {day.day}"
    return f"{day:%a} {text}" if weekday else text


def rank(order, value):
    return order.index(value) if value in order else len(order)


def new_row(**fields):
    row = {"company": "", "names": set(), "source": "", "role": "", "track": "", "area": "", "area_from": "", "applied": "",
           "status": "", "whose_move": "", "update": "", "next": "", "next_date": "", "url": "", "email": "", "pipeline": "",
           "when": "", "todo": "", "first_date": "", "replies": [], "records": [], "fixed": set()}
    row.update(fields)
    return row


def group_applications(records, aliases):
    groups, by_company = [], collections.defaultdict(list)
    for record in records:
        name = canonical(record.get("company"), aliases)
        identity = "".join(company_words(name))
        role = flat(record.get("role"))
        url = (record.get("url") or "").rstrip("/")
        group = next((group for group in by_company[identity] if role in group["roles"] or (url and url in group["urls"])), None)
        if group is None:
            group = {"names": {name}, "roles": set(), "urls": set(), "records": []}
            by_company[identity].append(group)
            groups.append(group)
        group["names"].add(record.get("company"))
        group["roles"].add(role)
        if url:
            group["urls"].add(url)
        group["records"].append(record)
    return groups


def application_row(group, defaults):
    records = group["records"]
    status, applied = "", ""
    for record in records:
        mapped = defaults["records"].get(record.get("status"))
        if mapped is None:
            warn(f"application status {record.get('status')!r} is not in defaults.json records; shown as Held")
            mapped = "Held"
        if status == "Applied" and mapped == "Held":
            continue
        status = mapped
        if mapped == "Applied" and not applied:
            applied = record.get("submitted_date") or record.get("date") or ""
    update = "" if status == "Applied" else (records[-1].get("status") or "").replace("-", " ").capitalize()
    return new_row(names=set(group["names"]), source=records[0].get("company") or "", role=records[0].get("role") or "",
                   applied=applied, status=status, update=update, first_date=records[0].get("date") or "", records=records,
                   url=next((record["url"] for record in records if record.get("url")), ""))


def attach_replies(rows, replies, aliases):
    orphans = collections.OrderedDict()
    for reply in replies:
        name = canonical(reply.get("company"), aliases)
        names = {name, reply.get("company")}
        candidates = [row for row in rows if row["first_date"] <= reply.get("date", "")
                      and any(same_company(mine, theirs) for mine in row["names"] for theirs in names)]
        wanted = set(flat(reply.get("role")).split()) - ROLE_FILLER
        chosen = candidates
        if candidates and wanted:
            scores = [len(wanted & set(flat(row["role"]).split())) for row in candidates]
            chosen = [row for row, score in zip(candidates, scores) if score and score == max(scores)]
        for row in chosen:
            row["replies"].append(reply)
        if not chosen:
            orphan = orphans.setdefault("".join(company_words(name)), {"names": set(), "replies": []})
            orphan["names"] |= names
            orphan["replies"].append(reply)
    return orphans


def orphan_row(orphan, defaults):
    if not any(defaults["replies"].get(reply.get("type"), {}).get("status") for reply in orphan["replies"]):
        return None
    named = [reply["role"] for reply in orphan["replies"] if reply.get("role")]
    source = next((reply["company"] for reply in orphan["replies"] if reply.get("company")), "")
    return new_row(names=orphan["names"], source=source, role=named[-1] if named else "", replies=orphan["replies"],
                   first_date=orphan["replies"][0].get("date", ""))


def apply_replies(row, defaults):
    if not row["replies"]:
        if row["status"] == "Applied":
            row["update"] = "No reply yet"
        return
    for reply in row["replies"]:
        meaning = defaults["replies"].get(reply.get("type"))
        if meaning is None:
            warn(f"reply type {reply.get('type')!r} is not in defaults.json replies; it does not change a status")
        elif meaning["status"]:
            row["status"] = meaning["status"]
    newest = row["replies"][-1]
    label = defaults["replies"].get(newest.get("type"), {}).get("label") or newest.get("type") or "Reply"
    row["update"] = f"{label} {short_date(newest.get('date'))}"
    row["next"] = (newest.get("action") or "") if row["status"] in defaults["live"] else ""
    row["next_date"] = newest.get("next_date") or ""
    row["email"] = newest.get("link") or ""


def display_name(row, names_override, seen_names):
    for source, display in names_override.items():
        if any(same_company(source, name) for name in row["names"]):
            return display
    for known in seen_names:
        if any(same_company(known, name) for name in row["names"]):
            return known
    return title_case(row["source"])


def area_of(row, defaults, areas_override):
    for source, area in areas_override.items():
        if any(same_company(source, name) for name in row["names"]):
            return area, "override"
    recorded = next((flat(record.get("area")) for record in row["records"] if record.get("area")), "")
    for area in defaults["chips"]["Area"]:
        if recorded and flat(area) == recorded:
            return area, "record"
    keywords = defaults["areas"]["keywords"]
    by_company = first_match(keywords, " ".join([row["company"], row["source"]]))
    if by_company:
        return by_company, "company"
    by_role = first_match(keywords, row["role"])
    if by_role:
        return by_role, "role"
    return defaults["areas"]["default"], "default"


def whose_move(row, defaults):
    rules = defaults["whose_move"]
    if row["status"] in defaults["live"] and row["replies"]:
        newest = row["replies"][-1]
        if newest.get("whose_move"):
            return newest["whose_move"]
        action = flat(newest.get("action"))
        for keyword, value in rules["by_action"]:
            if found(keyword, action):
                return value
    return rules["by_status"].get(row["status"], "")


def set_fields(row, entry):
    for field, value in entry.items():
        if field in ("company", "role_has"):
            continue
        if field not in SETTABLE:
            warn(f"override field {field!r} is not one of {', '.join(sorted(SETTABLE))}")
            continue
        row[field] = value
        row["fixed"].add(field)


def build(defaults, overrides, applications, responses):
    aliases = overrides.get("aliases", {})
    exclude = overrides.get("exclude", [])

    def kept(record):
        return not any(selects(entry, {record.get("company"), canonical(record.get("company"), aliases)}, record.get("role")) for entry in exclude)

    applications = [record for record in applications if kept(record)]
    since = overrides.get("since") or min((record.get("date") or "" for record in applications), default="")
    # responses.jsonl is newest first; reversing it lets a stable sort keep same-day replies in the order they came
    replies = sorted((reply for reply in reversed(responses) if reply.get("date", "") >= since and kept(reply)), key=lambda reply: reply["date"])

    rows = [application_row(group, defaults) for group in group_applications(applications, aliases)]
    orphans = attach_replies(rows, replies, aliases)
    rows += [row for row in (orphan_row(orphan, defaults) for orphan in orphans.values()) if row]

    seen_names = [record.get("company") for record in applications if looks_like_name(record.get("company"))]
    seen_names += [reply.get("company") for row in rows for reply in row["replies"] if looks_like_name(reply.get("company"))]
    seen_names = list(dict.fromkeys(seen_names))
    for row in rows:
        apply_replies(row, defaults)
        row["company"] = display_name(row, overrides.get("names", {}), seen_names)

    for entry in overrides.get("rows", []):
        hits = [row for row in rows if selects(entry, row["names"] | {row["company"]}, row["role"])]
        if not hits:
            warn(f"override matches no row: {entry.get('company')} / {entry.get('role_has', '')}")
        for row in hits:
            set_fields(row, entry)
    for entry in overrides.get("add", []):
        row = new_row(company=entry["company"], names={entry["company"]}, source=entry["company"])
        set_fields(row, entry)
        rows.append(row)

    for row in rows:
        if "track" not in row["fixed"]:
            recorded = next((record["track"] for record in row["records"] if record.get("track")), "")
            row["track"] = recorded or first_match(defaults["tracks"]["keywords"], row["role"]) or defaults["tracks"]["default"]
        if "area" in row["fixed"]:
            row["area_from"] = "override"
        else:
            row["area"], row["area_from"] = area_of(row, defaults, overrides.get("areas", {}))
        if "whose_move" not in row["fixed"]:
            row["whose_move"] = whose_move(row, defaults)

    statuses, moves = list(defaults["chips"]["Status"]), list(defaults["chips"]["Whose move"])
    rows.sort(key=lambda row: (row["company"].lower(), row["role"].lower()))
    rows.sort(key=lambda row: row["applied"], reverse=True)
    rows.sort(key=lambda row: (rank(statuses, row["status"]), rank(moves, row["whose_move"]), row["next_date"] or "9999-12-31"))

    pipeline = [dict(row, stage=row["pipeline"] or row["status"], todo=row["todo"] or row["next"]) for row in rows
                if row["pipeline"] or row["status"] in defaults["live"]]
    for entry in overrides.get("pipeline_add", []):
        row = new_row(company=entry["company"], names={entry["company"]}, source=entry["company"])
        set_fields(row, entry)
        pipeline.append(dict(row, stage=row["pipeline"], todo=row["todo"] or row["next"]))
    pipeline.sort(key=lambda row: (row["next_date"] or "9999-12-31", rank(moves, row["whose_move"]), row["company"].lower()))
    return rows, pipeline


def hyperlink(url, label):
    return f"=HYPERLINK(\"{url.replace(chr(34), chr(34) * 2)}\",\"{label}\")" if url else ""


def cell(column, row):
    if column == "Link":
        return hyperlink(row["url"], "Posting")
    if column == "Email":
        return hyperlink(row["email"], "Thread")
    if column == "Next step / date":
        return row["next"] or short_date(row["next_date"], weekday=True)
    return row.get(FIELDS.get(column, ""), "")


def tab_named(defaults, name):
    return next(tab for tab in defaults["tabs"] if tab["name"] == name)


def tab_values(defaults, name, rows):
    columns = [column["name"] for column in tab_named(defaults, name)["columns"]]
    return [columns] + [[cell(column, row) for column in columns] for row in rows]


def typed(value, is_date):
    if value == "":
        return {}
    if value.startswith("="):
        return {"userEnteredValue": {"formulaValue": value}}
    if is_date and ISO_DATE.fullmatch(value):
        return {"userEnteredValue": {"numberValue": (datetime.date.fromisoformat(value) - datetime.date(1899, 12, 30)).days}}
    return {"userEnteredValue": {"stringValue": value}}


def write_requests(defaults, name, values, sheet_id):
    columns = tab_named(defaults, name)["columns"]
    fields = "userEnteredValue,userEnteredFormat.textFormat.link"
    rows = [{"values": [typed(value, position > 0 and bool(columns[index].get("date"))) for index, value in enumerate(row)]}
            for position, row in enumerate(values)]
    return [{"updateCells": {"start": {"sheetId": sheet_id, "rowIndex": 0, "columnIndex": 0}, "rows": rows, "fields": fields}},
            {"updateCells": {"range": {"sheetId": sheet_id, "startRowIndex": len(values), "startColumnIndex": 0,
                                       "endColumnIndex": len(columns)}, "fields": fields}}]


def column_letter(index):
    letters = ""
    index += 1
    while index:
        index, remainder = divmod(index - 1, 26)
        letters = chr(65 + remainder) + letters
    return letters


def stamp():
    now = datetime.datetime.now().astimezone()
    hour = now.strftime("%I").lstrip("0")
    return f"Counts are formulas over the Applications tab. Last updated {now:%a %b} {now.day}, {hour}:{now:%M %p %Z}."


def summary_plan(defaults, title):
    columns = [column["name"] for column in tab_named(defaults, "Applications")["columns"]]

    def span(name):
        letter = column_letter(columns.index(name))
        return f"Applications!${letter}$2:${letter}"

    values, blocks = [[title], [stamp()], []], []

    def count_block(name):
        header = len(values)
        values.append([name, "Applications", "Share"])
        first, labels = header + 1, list(defaults["chips"][name])
        total = first + len(labels)
        for label in labels:
            line = len(values) + 1
            values.append([label, f"=COUNTIF({span(name)},$A{line})", f"=IF($B${total + 1}=0,0,B{line}/$B${total + 1})"])
        values.append(["Total", f"=SUM(B{first + 1}:B{total})", f"=IF($B${total + 1}=0,0,B{total + 1}/$B${total + 1})"])
        values.append([])
        blocks.append({"header": header, "width": 3, "chips": name, "rows": (first, total), "total": total, "percent": [(first, total + 1, 2)]})

    rates, status_span = defaults["summary"], span("Status")

    def count_of(labels):
        return "+".join(f"COUNTIF({status_span},\"{label}\")" for label in labels)

    count_block("Whose move")
    count_block("Status")

    header = len(values)
    submitted = header + 2
    values += [["Response rate", "Value"],
               [f"Submitted (all less {' and '.join(rates['not_submitted'])})", f"=COUNTA({status_span})-({count_of(rates['not_submitted'])})"],
               [f"Replied ({', '.join(rates['replied'])})", f"={count_of(rates['replied'])}"],
               ["Response rate", f"=IF(B{submitted}=0,0,B{submitted + 1}/B{submitted})"],
               [f"Moved forward ({', '.join(rates['forward'])})", f"={count_of(rates['forward'])}"],
               ["Positive response rate", f"=IF(B{submitted}=0,0,B{submitted + 3}/B{submitted})"], []]
    blocks.append({"header": header, "width": 2, "chips": None, "rows": None, "total": None,
                   "percent": [(header + 3, header + 4, 1), (header + 5, header + 6, 1)]})

    statuses, areas = list(defaults["chips"]["Status"]), list(defaults["chips"]["Area"])
    letters = {status: column_letter(2 + index) for index, status in enumerate(statuses)}
    header = len(values)
    first = header + 1
    total = first + len(areas)

    def rate(line):
        replied = "+".join(f"{letters[status]}{line}" for status in rates["replied"])
        base = f"B{line}-" + "-".join(f"{letters[status]}{line}" for status in rates["not_submitted"])
        return f"=IF({base}=0,0,({replied})/({base}))"

    values.append(["Area", "Total"] + statuses + ["Response rate"])
    for area in areas:
        line = len(values) + 1
        values.append([area, f"=COUNTIF({span('Area')},$A{line})"]
                      + [f"=COUNTIFS({span('Area')},$A{line},{status_span},{letters[status]}${header + 1})" for status in statuses] + [rate(line)])
    values.append(["Total"] + [f"=SUM({column_letter(index)}{first + 1}:{column_letter(index)}{total})" for index in range(1, 2 + len(statuses))]
                  + [rate(total + 1)])
    values.append([])
    width = 3 + len(statuses)
    blocks.append({"header": header, "width": width, "chips": "Area", "rows": (first, total), "total": total, "percent": [(first, total + 1, width - 1)]})

    count_block("Track")
    return values[:-1], blocks


def counts(rows, defaults):
    result = {"total": len(rows)}
    for label, field, vocabulary in (("status", "status", "Status"), ("track", "track", "Track"), ("area", "area", "Area"), ("whose move", "whose_move", "Whose move")):
        tally = collections.Counter(row[field] for row in rows)
        ordered = collections.OrderedDict((value, tally.pop(value, 0)) for value in defaults["chips"][vocabulary])
        ordered.update(tally)
        result[label] = ordered
    return result


def rgb(hex_value):
    hex_value = hex_value.lstrip("#")
    return {"rgbColor": {"red": round(int(hex_value[0:2], 16) / 255, 3), "green": round(int(hex_value[2:4], 16) / 255, 3),
                         "blue": round(int(hex_value[4:6], 16) / 255, 3)}}


def grid(sheet_id, top, bottom, left, right):
    cells = {"sheetId": sheet_id, "startRowIndex": top, "startColumnIndex": left, "endColumnIndex": right}
    if bottom is not None:
        cells["endRowIndex"] = bottom
    return cells


def repeat(cells, cell_format, fields):
    return {"repeatCell": {"range": cells, "cell": {"userEnteredFormat": cell_format}, "fields": fields}}


def width_request(sheet_id, column, pixels):
    return {"updateDimensionProperties": {"range": {"sheetId": sheet_id, "dimension": "COLUMNS", "startIndex": column, "endIndex": column + 1},
                                          "properties": {"pixelSize": pixels}, "fields": "pixelSize"}}


def rule(cells, condition, value, look, index):
    return {"addConditionalFormatRule": {"index": index, "rule": {"ranges": [cells], "booleanRule": {
        "condition": {"type": condition, "values": [{"userEnteredValue": value}]}, "format": look}}}}


def chip_look(defaults, color_name, value):
    color = defaults["palette"][color_name]
    look = {"textFormat": {"foregroundColorStyle": rgb(color["text"]), "bold": value in defaults["bold"]}}
    if color.get("background"):
        look["backgroundColorStyle"] = rgb(color["background"])
    return look


def chip_rules(defaults, cells, vocabulary, condition, start):
    return [rule(cells, condition, value, chip_look(defaults, color, value), start + offset)
            for offset, (value, color) in enumerate(defaults["chips"][vocabulary].items())]


def header_look(defaults):
    font = defaults["font"]
    return {"backgroundColorStyle": rgb(defaults["header"]["background"]), "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP",
            "textFormat": {"foregroundColorStyle": rgb(defaults["header"]["text"]), "bold": True, "fontFamily": font["family"], "fontSize": font["size"]}}


HEADER_FIELDS = "userEnteredFormat.backgroundColorStyle,userEnteredFormat.textFormat,userEnteredFormat.verticalAlignment,userEnteredFormat.wrapStrategy"
BODY_FIELDS = ("userEnteredFormat.verticalAlignment,userEnteredFormat.wrapStrategy,userEnteredFormat.horizontalAlignment,"
               "userEnteredFormat.textFormat.fontFamily,userEnteredFormat.textFormat.fontSize,userEnteredFormat.textFormat.bold")


def grid_tab_requests(defaults, tab, sheet_id, row_count):
    columns, font = tab["columns"], defaults["font"]
    width = len(columns)
    letters = {column["name"]: column_letter(index) for index, column in enumerate(columns)}
    requests = [{"updateCells": {"start": {"sheetId": sheet_id, "rowIndex": 0, "columnIndex": 0},
                                 "rows": [{"values": [{"userEnteredValue": {"stringValue": column["name"]}} for column in columns]}],
                                 "fields": "userEnteredValue"}},
                repeat(grid(sheet_id, 0, 1, 0, width), header_look(defaults), HEADER_FIELDS),
                {"updateDimensionProperties": {"range": {"sheetId": sheet_id, "dimension": "ROWS", "startIndex": 0, "endIndex": 1},
                                               "properties": {"pixelSize": 34}, "fields": "pixelSize"}},
                repeat(grid(sheet_id, 1, None, 0, width), {"verticalAlignment": tab.get("align", "MIDDLE"), "wrapStrategy": "CLIP", "horizontalAlignment": "LEFT",
                                                           "textFormat": {"fontFamily": font["family"], "fontSize": font["size"], "bold": False}}, BODY_FIELDS),
                {"setDataValidation": {"range": grid(sheet_id, 1, None, 0, width)}}]
    rules = []
    if tab.get("done"):
        done = tab["done"]
        look = {"textFormat": {"foregroundColorStyle": rgb(defaults["palette"]["muted"]["text"]), "strikethrough": True}}
        rules.append(rule(grid(sheet_id, 1, None, 0, width), "CUSTOM_FORMULA", f"=${letters[done['column']]}2=\"{done['value']}\"", look, len(rules)))
    if tab.get("urgent"):
        urgent = tab["urgent"]
        position = [column["name"] for column in columns].index(urgent["column"])
        formula = "=OR(" + ",".join(f"LEFT(${letters[urgent['column']]}2,{len(word)})=\"{word}\"" for word in urgent["starts"]) + ")"
        look = {"textFormat": {"foregroundColorStyle": rgb(defaults["palette"]["red"]["text"]), "bold": True}}
        rules.append(rule(grid(sheet_id, 1, None, position, position + 1), "CUSTOM_FORMULA", formula, look, len(rules)))
    for index, column in enumerate(columns):
        cells = grid(sheet_id, 1, None, index, index + 1)
        requests.append(width_request(sheet_id, index, column["width"]))
        if column.get("wrap"):
            requests.append(repeat(cells, {"wrapStrategy": "WRAP"}, "userEnteredFormat.wrapStrategy"))
        if column.get("bold"):
            requests.append(repeat(cells, {"textFormat": {"bold": True}}, "userEnteredFormat.textFormat.bold"))
        if column.get("date"):
            requests.append(repeat(cells, {"numberFormat": {"type": "DATE", "pattern": column["date"]}}, "userEnteredFormat.numberFormat"))
        if not column.get("chips"):
            continue
        if column.get("match", "equals") == "equals":
            requests.append(repeat(cells, {"horizontalAlignment": "CENTER"}, "userEnteredFormat.horizontalAlignment"))
            requests.append({"setDataValidation": {"range": cells, "rule": {"condition": {"type": "ONE_OF_LIST", "values": [
                {"userEnteredValue": value} for value in defaults["chips"][column["chips"]]]}, "strict": True, "showCustomUi": True}}})
            rules += chip_rules(defaults, cells, column["chips"], "TEXT_EQ", len(rules))
        else:
            rules += chip_rules(defaults, cells, column["chips"], "TEXT_CONTAINS", len(rules))
    if tab.get("bands"):
        requests.append({"addBanding": {"bandedRange": {"range": grid(sheet_id, 0, row_count, 0, width), "rowProperties": {
            "headerColorStyle": rgb(defaults["header"]["background"]), "firstBandColorStyle": rgb(defaults["bands"][0]),
            "secondBandColorStyle": rgb(defaults["bands"][1])}}}})
    if tab.get("filter"):
        requests.append({"setBasicFilter": {"filter": {"range": grid(sheet_id, 0, None, 0, width)}}})
    return requests + rules


def summary_tab_requests(defaults, tab, sheet_id, title):
    values, blocks = summary_plan(defaults, title)
    width = max(block["width"] for block in blocks)
    font, header_color = defaults["font"], defaults["header"]["background"]
    requests = [repeat(grid(sheet_id, 0, None, 0, width), {"verticalAlignment": "MIDDLE", "textFormat": {"fontFamily": font["family"], "fontSize": font["size"]}},
                       "userEnteredFormat.verticalAlignment,userEnteredFormat.textFormat.fontFamily,userEnteredFormat.textFormat.fontSize"),
                repeat(grid(sheet_id, 0, 1, 0, 1), {"textFormat": {"bold": True, "fontSize": 15, "fontFamily": font["family"], "foregroundColorStyle": rgb(header_color)}},
                       "userEnteredFormat.textFormat"),
                repeat(grid(sheet_id, 1, 2, 0, 1), {"textFormat": {"italic": True, "fontSize": font["size"], "fontFamily": font["family"],
                                                                   "foregroundColorStyle": rgb(defaults["palette"]["grey"]["text"])}}, "userEnteredFormat.textFormat"),
                width_request(sheet_id, 0, tab["widths"][0])]
    requests += [width_request(sheet_id, column, tab["widths"][1]) for column in range(1, width)]
    rules = []
    for block in blocks:
        requests.append(repeat(grid(sheet_id, block["header"], block["header"] + 1, 0, block["width"]), header_look(defaults), HEADER_FIELDS))
        if block["total"] is not None:
            border = {"top": {"style": "SOLID", "colorStyle": rgb(defaults["palette"]["grey"]["text"])}}
            requests.append(repeat(grid(sheet_id, block["total"], block["total"] + 1, 0, block["width"]), {"textFormat": {"bold": True}, "borders": border},
                                   "userEnteredFormat.textFormat.bold,userEnteredFormat.borders.top"))
        for top, bottom, column in block["percent"]:
            requests.append(repeat(grid(sheet_id, top, bottom, column, column + 1), {"numberFormat": {"type": "PERCENT", "pattern": "0%"}}, "userEnteredFormat.numberFormat"))
        if block["chips"]:
            first, last = block["rows"]
            rules += chip_rules(defaults, grid(sheet_id, first, last, 0, 1), block["chips"], "TEXT_EQ", len(rules))
    return requests + rules


def layout_requests(defaults, sheet_ids, existing, title, only):
    requests = []
    for position, tab in enumerate(defaults["tabs"]):
        if only and tab["name"] != only:
            continue
        sheet_id = sheet_ids[tab["name"]]
        width = max(len(tab.get("columns", [])), len(tab.get("widths", [])))
        if sheet_id in existing:
            requests += [{"deleteConditionalFormatRule": {"sheetId": sheet_id, "index": 0}} for _ in range(existing[sheet_id]["rules"])]
            requests += [{"deleteBanding": {"bandedRangeId": banding}} for banding in existing[sheet_id]["bandings"]]
        else:
            requests.append({"addSheet": {"properties": {"sheetId": sheet_id, "title": tab["name"], "index": position,
                                                         "gridProperties": {"rowCount": 1000, "columnCount": max(26, width)}}}})
        properties = {"sheetId": sheet_id, "title": tab["name"], "index": position, "tabColorStyle": rgb(defaults["palette"][tab["color"]]["text"]),
                      "gridProperties": {"frozenRowCount": 0 if tab.get("summary") else 1, "frozenColumnCount": tab.get("freeze_columns", 0)}}
        requests.append({"updateSheetProperties": {"properties": properties,
                                                   "fields": "title,index,tabColorStyle,gridProperties.frozenRowCount,gridProperties.frozenColumnCount"}})
        if tab.get("summary"):
            requests += summary_tab_requests(defaults, tab, sheet_id, title)
        else:
            requests += grid_tab_requests(defaults, tab, sheet_id, existing.get(sheet_id, {}).get("rows", 1000))
    return requests


def parse_sheets(text):
    ids = {}
    for pair in filter(None, (text or "").split(",")):
        name, sheet_id = pair.rsplit("=", 1)
        ids[name.strip()] = int(sheet_id)
    return ids


def resolve_sheets(defaults, arguments, sheet_settings):
    names = [tab["name"] for tab in defaults["tabs"]]
    if arguments.fresh:
        existing = {0: {"rows": 1000, "rules": 0, "bandings": []}}
        ids = {name: position for position, name in enumerate(names)}
    else:
        current = json.loads(pathlib.Path(arguments.current).read_text())
        existing = {}
        for sheet in current["sheets"]:
            rules = sheet.get("conditionalFormats", [])
            existing[sheet["properties"]["sheetId"]] = {"rows": sheet["properties"].get("gridProperties", {}).get("rowCount", 1000),
                                                        "rules": rules if isinstance(rules, int) else len(rules),
                                                        "bandings": [band["bandedRangeId"] for band in sheet.get("bandedRanges", [])]}
        ids = dict(sheet_settings.get("tabs", {}))
        ids.update({sheet["properties"]["title"]: sheet["properties"]["sheetId"] for sheet in current["sheets"] if sheet["properties"]["title"] in names})
    ids.update(parse_sheets(arguments.sheets))
    taken = set(existing) | set(ids.values())
    for name in names:
        if name not in ids:
            ids[name] = max(taken) + 1
            taken.add(ids[name])
    added = {name: sheet_id for name, sheet_id in ids.items() if name in names and sheet_id not in existing}
    if added:
        warn(f"adding tabs {added}; keep every tab id in state/sheet.json")
    return ids, existing


def load_settings():
    defaults = json.loads((SKILL / "references" / "defaults.json").read_text())
    overrides = read_json(SKILL / "state" / "overrides.json", {})
    defaults.update(overrides.get("layout", {}))
    return defaults, overrides, read_json(SKILL / "state" / "sheet.json", {})


def dump_rows(values):
    return "[\n" + ",\n".join(json.dumps(row, ensure_ascii=False) for row in values) + "\n]"


def explain(rows):
    print(f"{'status':17} {'whose move':16} {'track':11} {'area (from)':24} company / role")
    for row in rows:
        print(f"{row['status']:17} {row['whose_move']:16} {row['track']:11} {row['area'] + ' (' + row['area_from'] + ')':24} {row['company']} / {row['role']}")


def main():
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--applications", default=str(RECORDS / "applications.jsonl"))
    common.add_argument("--responses", default=str(RECORDS / "responses.jsonl"))
    common.add_argument("--sheets", help="tab ids as \"Name=id,...\", over state/sheet.json")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)
    rows_command = commands.add_parser("rows", parents=[common])
    rows_command.add_argument("--tab", choices=["Applications", "Pipeline"])
    rows_command.add_argument("--requests", action="store_true")
    rows_command.add_argument("--explain", action="store_true")
    summary_command = commands.add_parser("summary", parents=[common])
    mode = summary_command.add_mutually_exclusive_group()
    for flag in ("--json", "--values", "--stamp"):
        mode.add_argument(flag, action="store_true")
    layout_command = commands.add_parser("layout", parents=[common])
    source = layout_command.add_mutually_exclusive_group(required=True)
    source.add_argument("--current", help="spreadsheets.get response saved to a file")
    source.add_argument("--fresh", action="store_true")
    layout_command.add_argument("--tab", help="one tab's requests only, to apply the layout in smaller batches")
    arguments = parser.parse_args()

    defaults, overrides, sheet_settings = load_settings()
    title = sheet_settings.get("title", "Job applications")
    if arguments.command == "layout":
        if arguments.tab and arguments.tab not in [tab["name"] for tab in defaults["tabs"]]:
            sys.exit(f"tracker: no tab named {arguments.tab!r} in defaults.json")
        sheet_ids, existing = resolve_sheets(defaults, arguments, sheet_settings)
        print(json.dumps(layout_requests(defaults, sheet_ids, existing, title, arguments.tab), ensure_ascii=False, separators=(",", ":")))
        return
    if arguments.command == "summary" and arguments.stamp:
        print(stamp())
        return
    if arguments.command == "summary" and arguments.values:
        print(dump_rows(summary_plan(defaults, title)[0]))
        return

    applications, pipeline = build(defaults, overrides, read_lines(pathlib.Path(arguments.applications)), read_lines(pathlib.Path(arguments.responses)))
    if arguments.command == "summary":
        result = counts(applications, defaults)
        if arguments.json:
            print(json.dumps(result, ensure_ascii=False, indent=1))
            return
        print(f"{result.pop('total')} applications")
        for label, tally in result.items():
            print(f"\n{label}")
            for value, number in tally.items():
                print(f"  {value:18} {number:4}")
        return
    if arguments.explain:
        explain(applications)
        return
    tabs = {"Applications": tab_values(defaults, "Applications", applications), "Pipeline": tab_values(defaults, "Pipeline", pipeline)}
    if arguments.tab:
        tabs = {arguments.tab: tabs[arguments.tab]}
    if arguments.requests:
        ids = dict(sheet_settings.get("tabs", {}), **parse_sheets(arguments.sheets))
        missing = [name for name in tabs if name not in ids]
        if missing:
            sys.exit(f"tracker: no tab id for {', '.join(missing)}; pass --sheets or set tabs in state/sheet.json")
        print(json.dumps([request for name, values in tabs.items() for request in write_requests(defaults, name, values, ids[name])],
                         ensure_ascii=False, separators=(",", ":")))
        return
    if arguments.tab:
        print(dump_rows(tabs[arguments.tab]))
        return
    print("{\n" + ",\n".join(f"{json.dumps(name)}: {dump_rows(values)}" for name, values in tabs.items()) + "\n}")


if __name__ == "__main__":
    main()
