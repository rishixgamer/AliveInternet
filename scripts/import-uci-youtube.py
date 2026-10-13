"""Convert an explicitly downloaded, pinned UCI archive for local evaluation.

No network, extraction, author identifiers, raw-row logs or rule tuning.
The original archive and transformed text must remain in ignored local artifacts.
"""

import argparse
import csv
import hashlib
import html
import io
import json
import re
import unicodedata
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlsplit

ARCHIVE_SHA256 = "bd6182891adb3cfc8334b82c062176dfbebc563bf0ba07e31c2645f916865a0a"
FILES = (
    "Youtube01-Psy.csv", "Youtube02-KatyPerry.csv", "Youtube03-LMFAO.csv",
    "Youtube04-Eminem.csv", "Youtube05-Shakira.csv",
)
URL = re.compile(r"https?://[^\s<>\"']+", re.IGNORECASE)
EMAIL = re.compile(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b")
HANDLE = re.compile(r"(?<!\w)@[\w.-]+")


def normalized(text: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", text).casefold().split())


def sanitize(text: str) -> tuple[str, list[str], int]:
    """Remove explicit contact identifiers and URL paths; retain domain evidence."""
    links: list[str] = []
    redactions = 0

    def domain(match: re.Match[str]) -> str:
        nonlocal redactions
        redactions += 1
        try:
            parsed = urlsplit(match.group().rstrip(".,);"))
            host = parsed.hostname
            if not host or parsed.username or parsed.password:
                return "[redacted-url]"
            safe = f"{parsed.scheme.lower()}://{host}/"
            if safe not in links:
                links.append(safe)
            return safe
        except ValueError:
            return "[redacted-url]"

    text = URL.sub(domain, html.unescape(re.sub(r"<[^>]*>", " ", text)))
    text, count = EMAIL.subn("[redacted-email]", text)
    redactions += count
    text, count = HANDLE.subn("[redacted-handle]", text)
    redactions += count
    # This is contact minimization, not a guarantee that free text is anonymous.
    text = " ".join(text.split())
    return text, links, redactions


def convert(archive: Path) -> tuple[dict, dict]:
    blob = archive.read_bytes()
    if hashlib.sha256(blob).hexdigest() != ARCHIVE_SHA256:
        raise ValueError("Archive does not match reviewed UCI revision")
    rows: list[tuple[str, dict[str, str]]] = []
    source_counts = {}
    with zipfile.ZipFile(io.BytesIO(blob)) as source:
        for filename in FILES:
            info = source.getinfo(filename)
            if info.file_size > 1_000_000:
                raise ValueError("Unexpected source size")
            reader = csv.DictReader(io.StringIO(source.read(filename).decode("utf-8-sig")))
            if reader.fieldnames != ["COMMENT_ID", "AUTHOR", "DATE", "CONTENT", "CLASS"]:
                raise ValueError("Unexpected columns")
            current = list(reader)
            if any(row["CLASS"] not in {"0", "1"} or not row["CONTENT"].strip() for row in current):
                raise ValueError("Invalid source labels/text")
            source_counts[filename] = dict(Counter(row["CLASS"] for row in current))
            rows.extend((filename, row) for row in current)
    if len(rows) != 1956:
        raise ValueError("Unexpected source count")
    groups: dict[str, list[tuple[str, dict[str, str]]]] = defaultdict(list)
    for filename, row in rows:
        groups[normalized(row["CONTENT"])].append((filename, row))
    items = []
    conflicts = duplicate_rows = empty_rows = redactions = 0
    source_retained: Counter[str] = Counter()
    transformed_keys: set[str] = set()
    for members in groups.values():
        if len({row["CLASS"] for _, row in members}) != 1:
            conflicts += len(members)
            continue
        duplicate_rows += len(members) - 1
        filename, row = members[0]
        text, links, count = sanitize(row["CONTENT"])
        redactions += count
        if not text or len(text) > 10_000 or len(links) > 20:
            empty_rows += 1
            continue
        # Retain first occurrence only, including collisions introduced by redaction.
        key = normalized(text)
        if key in transformed_keys:
            duplicate_rows += 1
            continue
        transformed_keys.add(key)
        items.append({"id": f"row-{len(items):05d}", "platform": "youtube",
                      "kind": "comment", "text": text, "links": links,
                      "label": "spam" if row["CLASS"] == "1" else "legitimate",
                      "locale": "und"})
        source_retained[filename] += 1
    dataset = {"manifest": {
        "name": "UCI YouTube Spam Collection - minimized retrospective test",
        "version": "2015-uci380-minimized-v1", "license": "CC BY 4.0",
        "provenance": "T.C. Alberto and J.V. Lochter (2015), UCI DOI 10.24432/C58885. "
                      "Licensed public corpus; source IDs/authors/dates dropped, contact "
                      "identifiers and URL paths minimized, normalized duplicates and "
                      "conflicting source labels excluded. One fixed retrospective test "
                      "split; no tuning. Not current-feed representative or fully anonymous.",
        "split": "test", "items": len(items), "source": "permissioned"}, "items": items}
    dates = [row["DATE"] for _, row in rows if row["DATE"]]
    audit = {"schemaVersion": 1, "archiveSha256": ARCHIVE_SHA256,
             "sourceUrl": "https://archive.ics.uci.edu/dataset/380/youtube+spam+collection",
             "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
             "sourceRows": len(rows), "normalizedGroups": len(groups),
             "sourceDateSpan": {"min": min(dates), "max": max(dates), "missingRows": len(rows) - len(dates)},
             "conflictingLabelRowsExcluded": conflicts, "duplicateRowsExcluded": duplicate_rows,
             "emptyOrOversizeRowsExcluded": empty_rows, "contactRedactions": redactions,
             "retainedRows": len(items), "labels": dict(Counter(row["label"] for row in items)),
             "sourceLabels": source_counts, "retainedBySource": dict(source_retained),
             "limitations": ["Five older popular music videos; no current-feed sampling",
                             "Source binary spam labels are not scam or bot identity labels",
                             "Independent dual annotation/adjudication not established",
                             "Locale unknown; no language or identity inference",
                             "Redaction changes content; results apply to transformed text",
                             "Residual personal information may occur in local free text"]}
    return dataset, audit


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("dataset", type=Path)
    parser.add_argument("audit", type=Path)
    args = parser.parse_args()
    dataset, audit = convert(args.archive)
    serialized = json.dumps(dataset, ensure_ascii=False, indent=2) + "\n"
    audit["datasetSha256"] = hashlib.sha256(serialized.encode()).hexdigest()
    audit["converterSha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    if args.dataset.exists() or args.audit.exists():
        raise ValueError("Outputs must be new files")
    with args.dataset.open("x", encoding="utf-8") as target:
        target.write(serialized)
    with args.audit.open("x", encoding="utf-8") as target:
        target.write(json.dumps(audit, indent=2) + "\n")
    print(json.dumps({key: audit[key] for key in ("sourceRows", "retainedRows", "labels")}))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, zipfile.BadZipFile):
        raise SystemExit("Import rejected source or output; no raw rows were logged.") from None
