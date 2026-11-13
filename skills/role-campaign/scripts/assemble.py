# Build one full-time outreach email per person from a research record (references/research-brief.md schema).
#
# usage: python3 assemble.py <campaign_dir> <out_dir> <records.json> [<records.json> ...]
#
# <campaign_dir> holds profile.json (the operator's name, graduation, approved bullets, attachments and
# signature links) and attach/ (the files the drafts carry). Both stay out of git: they describe a real
# person. Each record becomes <out_dir>/<slug>/{draft.txt,draft.html,email.md,create.json,reach.json}.
# create.json is the create_draft input, with each attachment as a sha256 file reference.
import hashlib, html, json, pathlib, re, sys


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def oxford(items):
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return ", ".join(items[:-1]) + ", and " + items[-1]


def clean(text, lead_ins=()):
    """Normalize a researcher-written fill-in: no repeated lead-in, no final period, no comma before a lone 'and'."""
    t = (text or "").strip()
    for li in lead_ins:
        while t.lower().startswith(li.lower()):
            t = t[len(li):].strip()
    t = t.rstrip(" .")
    if t.count(",") == 1 and ", and " in t:
        t = t.replace(", and ", " and ")
    return t


def short_team(team):
    t = re.sub(r"\s*\([^)]*\)", "", team or "").split(",")[0].strip()
    return re.sub(r"^the ", "", t, flags=re.I)


class Builder:
    def __init__(self, campaign):
        self.campaign = pathlib.Path(campaign).resolve()
        self.p = json.loads((self.campaign / "profile.json").read_text())
        self.attach_dir = self.campaign / "attach"

    def bullets_for(self, rec):
        B, fill = self.p["bullets"], self.p["fill"]
        lead = rec.get("lead") or next(iter(fill))
        second = rec.get("second")
        order = [lead] + ([second] if second else []) + fill.get(lead, next(iter(fill.values()))) + list(B)
        keys = []
        for k in order:
            if k in B and k not in keys and k not in self.p.get("bio_variant", {}).values():
                keys.append(k)
            if len(keys) == 4:
                break
        always = self.p.get("always")
        if always and always not in keys:
            keys[-1] = always
        if "bio" in (lead, second) or rec.get("bio_mi"):
            keys = [self.p.get("bio_variant", {}).get(k, k) for k in keys]
        return [tuple(B[k]) for k in keys] + [tuple(t) for t in self.p.get("tail", [])]

    @staticmethod
    def team_phrase(rec):
        team, company = (rec.get("team") or "").strip(), rec.get("company", "")
        if not team:
            return company
        return team if company.lower() in team.lower() else f"{team} at {company}"

    def subject(self, rec):
        if rec.get("subject"):
            return rec["subject"]
        name, grad = self.p["sender_name"], self.p["graduation"]
        if rec["audience"] == "recruiter":
            return f"New grad roles at {rec['company']}, {grad} | {name}"
        r2 = dict(rec, team=short_team(rec.get("team")))
        return f"Full-time roles, {self.team_phrase(r2)} | {name}"

    def build(self, rec):
        p = self.p
        first = rec.get("first_name") or rec["name"].split()[0]
        aud, grad = rec["audience"], p["graduation"]
        A = p["attach"]
        attach = [a for a in rec.get("attach", []) if a in A][:1]
        if not attach:
            d = p.get("default_attach", {})
            attach = [d.get(rec.get("lead"), d.get("*"))] if d else []
            attach = [a for a in attach if a in A]
        att_sentence = "I have attached " + oxford(["my resume"] + [A[a][1] for a in attach]) + "."
        intro = p["intro"]
        topics = clean(rec.get("reading_topics"), ("I have been reading your papers on", "I have been reading about your team's work on", "your papers on", "your team's work on"))
        work = clean(rec.get("work_with_on"), ("I was wondering if it would be possible to join your team full time to work on", "work on"))
        braw = rec.get("belief") or ""
        if "|" in braw and not rec.get("belief_area"):
            braw, barea = [x.strip() for x in braw.split("|", 1)]
            rec = dict(rec, belief_area=barea)
        belief_t = clean(braw, ("I really believe that",))
        if belief_t and rec.get("belief_area") and "where the next" not in belief_t:
            belief_t = f"{belief_t} is where the next major advancements in {clean(rec['belief_area'])} will be"
        if aud == "recruiter":
            ask = rec.get("ask") or f"Would it be possible to be considered for full-time roles at {rec['company']} after I graduate in {grad}?"
            why = rec.get("why_line") or f"I saw that you recruit for {topics}, and I wanted to reach out."
            opener = f"I hope this email finds you well. {why} {intro}"
            interest = f"I was wondering if it would be possible to be matched with teams working on {work}."
            close = rec.get("close") or "Are you free for a 15 minute chat to discuss roles that might be a fit?"
        else:
            ask = rec.get("ask") or f"Would it be possible to join your team full time after I graduate in {grad}?"
            if rec.get("reading_frame") == "team" or aud == "manager":
                read = f"I have been reading about your team's work on {topics}"
            else:
                lead_papers = [x for x in rec.get("papers", [])
                               if str(x.get("position", "")).lower().startswith(("first", "last", "sole", "co-first", "corresponding"))]
                noun = "paper" if (len(lead_papers) == 1 or rec.get("reading_singular")) and not rec.get("reading_plural") else "papers"
                read = f"I have been reading your {noun} on {topics}"
            ctx = (" " + rec["context_line"]) if rec.get("context_line") else ""
            opener = f"I hope this email finds you well. {read}.{ctx} {intro}"
            belief = (f"I really believe that {belief_t}, and I would love to learn from your team. "
                      if belief_t and p.get("belief_line") else "")
            interest = f"{belief}I was wondering if it would be possible to join your team full time to work on {work}."
            close = rec.get("close") or ("Are you free for a 15 minute chat to discuss roles on your team?" if aud == "manager"
                                         else "Are you free for a 15 minute chat to discuss joining your team?")
        bl = self.bullets_for(rec)
        subj = self.subject(rec)
        links = [tuple(l) for l in p["links"]]

        txt = [f"Hello {first}!", "", ask, "", opener]
        txt += [f"- {t}: {b}" if b else f"- {t}" for t, b in bl]
        txt += ["", f"{interest} {att_sentence} {close}", "", "Sincerely,", f"- {p['sender_name']}", " | ".join(l for l, _ in links)]
        text = "\n".join(txt)

        e = html.escape
        def para(lines):
            return "<div>" + "<br>".join(lines) + "</div>"
        blank = "<div><br></div>"
        hb = [f"<b>- {e(t)}:</b> {e(b)}" if b else f"<b>- {e(t)}</b>" for t, b in bl]
        htm = "".join([para([f"Hello {e(first)}!"]), blank, para([f"<b>{e(ask)}</b>"]), blank,
                       para([e(opener)] + hb), blank,
                       para([f"{e(interest)} {e(att_sentence)} <b>{e(close)}</b>"]), blank,
                       para(["Sincerely,", f"- {e(p['sender_name'])}", " | ".join(f'<a href="{u}">{e(l)}</a>' for l, u in links)])])

        files = [p["resume"]] + [A[a][0] for a in attach]
        att = [{"content": f"sha256:{sha(self.attach_dir / f)}:{self.attach_dir / f}", "filename": f,
                "mimeType": "application/pdf"} for f in files]
        tool_input = {"to": [rec["email"]], "subject": subj, "body": text, "htmlBody": htm, "attachments": att}
        if rec.get("cc"):
            tool_input["cc"] = rec["cc"]
        if rec.get("reply_to_message_id"):
            tool_input["replyToMessageId"] = rec["reply_to_message_id"]

        md = [f"# {rec['name']} ({rec.get('title','')}, {self.team_phrase(rec)})", "",
              f"- **To:** {rec['email']} ({rec.get('email_confidence','')}: {rec.get('email_source','')})",
              f"- **Subject:** {subj}", f"- **Audience:** {aud}",
              f"- **Role source:** {rec.get('role_source_url','')}",
              f"- **Attachments:** {', '.join(files)}", "", "---", "", text, "", "---", ""]
        md += [f"- Paper: {x.get('title')} (https://arxiv.org/abs/{x['arxiv']}, {x.get('position','')} author)"
               for x in rec.get("papers", []) if x.get("arxiv")]
        if rec.get("be_ready"):
            md += ["", f"**Be ready:** {rec['be_ready']}"]
        if rec.get("warm_tie"):
            md += ["", f"**Tie:** {rec['warm_tie']}"]
        return text, htm, "\n".join(md) + "\n", files, tool_input

    def card(self, rec, files):
        def claim(x):
            a = str(x["arxiv"])
            if a.lower().startswith("biorxiv:") or a.startswith("10.1101/"):
                doi = a.split(":", 1)[-1]
                return {"text": x.get("short_name") or x.get("title"), "source": f"https://www.biorxiv.org/content/{doi}", "title": x.get("title")}
            return {"text": x.get("short_name") or x.get("title"), "arxiv": a, "title": x.get("title")}
        claims = [claim(x)
                  for x in rec.get("papers", []) if x.get("arxiv")
                  and str(x.get("position", "")).lower().startswith(("first", "last", "sole", "co-first", "corresponding"))]
        if not claims:
            claims.append({"text": f"{rec.get('title','')}, {self.team_phrase(rec)}", "source": rec.get("role_source_url", "")})
        return {
            "act": "email", "kind": "industry", "person": rec["name"], "org": rec["company"], "company": rec["company"],
            "to": rec["email"], "ask": f"a full-time role on their team after graduating in {self.p['graduation']}",
            "address_source": rec.get("email_source", ""),
            "policy": {"url": rec.get("policy_url") or rec.get("role_source_url", ""), "read": rec.get("policy_read") or __import__("datetime").date.today().isoformat(),
                       "quote": rec.get("policy_quote") or ("No line about contacting them or about hiring appears on this page."
                                                         if (rec.get("policy_says") or "silent") == "silent" else ""),
                       "says": rec.get("policy_says") or "silent", "alternative": ""},
            "asks_for": [], "attachments": files, "claims": claims,
            "prior_contact": rec.get("prior_contact", {}), "related": rec.get("related", []),
            "review": rec.get("review", {}), "draft": {}, "send_hold": rec.get("send_hold", ""),
        }


def slugify(rec):
    return rec.get("slug") or rec["name"].lower().replace(" ", "-").replace(".", "")


def main():
    b = Builder(sys.argv[1])
    out = pathlib.Path(sys.argv[2])
    recs = []
    for f in sys.argv[3:]:
        recs += json.load(open(f))
    n = 0
    for rec in recs:
        if rec.get("drop") or rec.get("policy_says") in ("no-email", "form-only") or not rec.get("email"):
            print("SKIP", rec.get("name"), rec.get("drop") or rec.get("policy_says") or "no email")
            continue
        d = out / slugify(rec)
        d.mkdir(parents=True, exist_ok=True)
        text, htm, md, files, ti = b.build(rec)
        (d / "draft.txt").write_text(text)
        (d / "draft.html").write_text(htm)
        (d / "email.md").write_text(md)
        (d / "create.json").write_text(json.dumps(ti, indent=1))
        cp = d / "reach.json"
        c = b.card(rec, files)
        if cp.exists():
            old = json.loads(cp.read_text())
            for k in ("prior_contact", "review", "draft"):
                if old.get(k):
                    c[k] = old[k]
        cp.write_text(json.dumps(c, indent=1))
        n += 1
    print("built", n)


if __name__ == "__main__":
    main()
