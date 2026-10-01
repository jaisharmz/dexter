#!/usr/bin/env python3
"""Scan files for the shapes of private data and for denylisted strings.

    python3 skills/anonymize/scripts/scan.py <path>... [--denylist FILE] [--quiet]
    some-command | python3 skills/anonymize/scripts/scan.py -

Prints "path:line: category: match" for every finding and exits 1 if there is any.
A denylist holds one private string per line, matched case-insensitively; a "w:" prefix
matches whole words only, and lines starting with "#" are comments. Without --denylist,
home/public/denylist is used when the current directory has one.

A clean scan is necessary and never sufficient: it cannot see a relationship, a
quasi-identifier or a private fact written in plain words. SKILL.md has the rest.
"""
import argparse
import os
import re
import sys

# (category, pattern, allowed): a match that fully matches "allowed" is not a finding.
SHAPES = [
    ("email address",
     r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}",
     r"noreply@anthropic\.com|git@github\.com|.*@example\.(?:com|org|net)|you@.*"),
    ("IP address",
     r"(?<![0-9.])(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?![0-9.])",
     r"127\.0\.0\.1|0\.0\.0\.0|192\.168\.1\.100|100\.64\.0\.[12]"),
    ("long numeric id", r"(?<![0-9])[0-9]{17,20}(?![0-9])", r"0+"),
    ("home directory", r"(?<![A-Za-z0-9_}])/(?:Users|home)/[A-Za-z0-9._-]+", r"/(?:Users|home)/you"),
    ("phone number", r"\(?[0-9]{3}\)?[-. ][0-9]{3}[-. ][0-9]{4}", None),
    ("key or token",
     r"sk-ant-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{32,}|gh[pousr]_[A-Za-z0-9]{30,}"
     r"|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}"
     r"|AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY-----"
     r"|[MN][A-Za-z0-9]{23,25}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}",
     None),
    ("document or thread id",
     r"(?:docs|drive)\.google\.com/[^\s)\"']*?/d/[A-Za-z0-9_-]{20,}"
     r"|mail\.google\.com/mail/[^\s)\"']*#[^\s)\"']*/[A-Za-z0-9]{16,}"
     r"|(?:thread|msg)-[af]:[0-9]{10,}",
     None),
]

DATA_FILES = re.compile(
    r".*\.(?:csv|tsv|db|sqlite\w*|env|pem|key|p12|pyc)$|\.env.*|id_rsa.*|id_ed25519.*|\.DS_Store")


def load_denylist(path):
    words, anywhere = [], []
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("w:"):
                words.append(re.compile(r"(?<!\w)" + re.escape(line[2:]) + r"(?!\w)", re.I))
            else:
                anywhere.append(re.compile(re.escape(line), re.I))
    return words + anywhere


def scan_text(label, text, denylist):
    findings = []
    for number, line in enumerate(text.splitlines(), 1):
        for category, pattern, allowed in SHAPES:
            for match in re.finditer(pattern, line):
                if allowed and re.fullmatch(allowed, match.group(0)):
                    continue
                findings.append(f"{label}:{number}: {category}: {match.group(0)}")
        for rule in denylist:
            for match in rule.finditer(line):
                findings.append(f"{label}:{number}: denylisted: {match.group(0)}")
    return findings


def files_under(path):
    if os.path.isfile(path):
        yield path
        return
    for root, directories, names in os.walk(path):
        directories[:] = [d for d in directories if d != ".git"]
        for name in sorted(names):
            yield os.path.join(root, name)


def read_text(path):
    with open(path, "rb") as handle:
        data = handle.read()
    if b"\0" in data[:8192]:
        return None
    return data.decode("utf-8", errors="replace")


def main():
    parser = argparse.ArgumentParser(description="Scan for the shapes of private data.")
    parser.add_argument("paths", nargs="+", help="files or folders, or - for stdin")
    parser.add_argument("--denylist", action="append", default=[], help="file of private strings")
    parser.add_argument("--quiet", action="store_true", help="print only the count")
    arguments = parser.parse_args()

    denylists = arguments.denylist or [p for p in ["home/public/denylist"] if os.path.isfile(p)]
    denylist = [rule for path in denylists for rule in load_denylist(path)]

    findings = []
    for path in arguments.paths:
        if path == "-":
            findings += scan_text("-", sys.stdin.read(), denylist)
            continue
        if not os.path.exists(path):
            sys.exit(f"scan: no such path: {path}")
        for file in files_under(path):
            if DATA_FILES.fullmatch(os.path.basename(file)):
                findings.append(f"{file}: data or key file")
                continue
            text = read_text(file)
            if text is not None:
                findings += scan_text(file, text, denylist)

    if findings and not arguments.quiet:
        print("\n".join(findings))
    source = ", ".join(denylists) if denylists else "no denylist"
    print(f"scan: {len(findings)} finding(s), {source}", file=sys.stderr)
    sys.exit(1 if findings else 0)


if __name__ == "__main__":
    main()
