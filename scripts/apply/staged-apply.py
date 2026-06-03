#!/usr/bin/env python3
"""Staged apply helper.

Walks the most recently generated tailored CVs (one batch produced by the
COWORK/TAILOR Cowork prompts, up to 15 by default) and, one job at a time:

  1. opens the job's apply URL in the default browser, and
  2. opens that CV's folder in the file manager,

then waits for you to press Enter before moving to the next job. You are asked
once, up front, which OS you are on so the right "open" command is used.

The apply URL is looked up in the scraper's CSV by job_id (the tailored CV
folder name), falling back to the row's job_url, then to a resume.json field.

Usage:
    python3.11 scripts/apply/staged-apply.py            # last 15 tailored CVs
    python3.11 scripts/apply/staged-apply.py --count 5  # last 5
"""

import argparse
import csv
import json
import os
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path.home() / "Documents" / "job-application-automation"
CSV_PATH = BASE_DIR / "job_tracker.csv"
TAILORED_DIR = BASE_DIR / "CVs" / "tailored"

DEFAULT_COUNT = 15  # matches the per-batch limit in COWORK_PROMPT.txt / TAILOR_PROMPT.txt


def ask_os() -> str:
    """Prompt once for the OS. Returns 'WINDOWS', 'LINUX', or 'MAC'."""
    aliases = {
        "1": "WINDOWS", "WINDOWS": "WINDOWS", "W": "WINDOWS", "WIN": "WINDOWS",
        "2": "LINUX", "LINUX": "LINUX", "L": "LINUX",
        "3": "MAC", "MAC": "MAC", "M": "MAC", "MACOS": "MAC", "OSX": "MAC",
    }
    while True:
        ans = input("Which OS are you on?  [1] WINDOWS   [2] LINUX   [3] MAC : ").strip().upper()
        if ans in aliases:
            return aliases[ans]
        print("  Please enter WINDOWS, LINUX, or MAC (or 1/2/3).")


def open_target(os_type: str, target: str) -> None:
    """Open a URL or a directory with the native opener for the chosen OS."""
    try:
        if os_type == "WINDOWS":
            # os.startfile handles both URLs and folders via shell associations.
            if hasattr(os, "startfile"):
                os.startfile(target)  # type: ignore[attr-defined]
            else:
                subprocess.run(["cmd.exe", "/c", "start", "", target], check=False)
        elif os_type == "MAC":
            subprocess.run(["open", target], check=False)
        else:  # LINUX
            subprocess.run(["xdg-open", target], check=False)
    except Exception as e:
        print(f"  ! could not open {target}: {e}")


def load_csv_index(csv_path: Path) -> dict[str, dict[str, str]]:
    """Map job_id -> CSV row. Empty dict if the CSV is missing."""
    index: dict[str, dict[str, str]] = {}
    if not csv_path.exists():
        return index
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            job_id = (row.get("job_id") or "").strip()
            if job_id:
                index[job_id] = row
    return index


def find_recent_cv_dirs(tailored_dir: Path, count: int) -> list[Path]:
    """The `count` most recently generated tailored CV folders (newest first)."""
    if not tailored_dir.exists():
        return []
    dirs = [d for d in tailored_dir.iterdir() if d.is_dir() and (d / "resume.json").exists()]
    dirs.sort(key=lambda d: (d / "resume.json").stat().st_mtime, reverse=True)
    return dirs[:count]


def resolve_apply_url(row: dict[str, str] | None, cv_dir: Path) -> str:
    """CSV apply_url, then CSV job_url, then a resume.json fallback."""
    if row:
        for key in ("apply_url", "job_url"):
            url = (row.get(key) or "").strip()
            if url and url.lower() != "nan":
                return url
    resume_json = cv_dir / "resume.json"
    if resume_json.exists():
        try:
            data = json.loads(resume_json.read_text(encoding="utf-8"))
            job = data.get("job") or {}
            for src in (job, data):
                for key in ("apply_url", "job_url"):
                    url = str(src.get(key) or "").strip()
                    if url:
                        return url
        except Exception:
            pass
    return ""


def describe(row: dict[str, str] | None, cv_dir: Path) -> str:
    """Human-readable label for a job: 'Company — Title', else the folder name."""
    if row:
        company = (row.get("company") or "").strip()
        title = (row.get("title") or "").strip()
        label = " — ".join(p for p in (company, title) if p)
        if label:
            return label
    return cv_dir.name


def main() -> None:
    parser = argparse.ArgumentParser(description="Staged apply over the latest tailored CVs")
    parser.add_argument("--count", type=int, default=DEFAULT_COUNT,
                        help=f"How many of the most recent CVs to process (default {DEFAULT_COUNT})")
    parser.add_argument("--tailored-dir", type=Path, default=TAILORED_DIR,
                        help="Override the tailored CVs directory")
    parser.add_argument("--csv", type=Path, default=CSV_PATH,
                        help="Override the job tracker CSV path")
    args = parser.parse_args()

    cv_dirs = find_recent_cv_dirs(args.tailored_dir, args.count)
    if not cv_dirs:
        print(f"No tailored CVs found under {args.tailored_dir}")
        sys.exit(0)

    csv_index = load_csv_index(args.csv)
    if not csv_index:
        print(f"Note: no CSV found at {args.csv} — falling back to resume.json for apply URLs.\n")

    os_type = ask_os()
    total = len(cv_dirs)
    print(f"\nProcessing the {total} most recent tailored CV(s) on {os_type}.\n")

    for i, cv_dir in enumerate(cv_dirs, 1):
        row = csv_index.get(cv_dir.name)
        url = resolve_apply_url(row, cv_dir)
        print(f"[{i}/{total}] {describe(row, cv_dir)}")
        print(f"        folder: {cv_dir}")

        if url:
            print(f"        apply:  {url}")
            open_target(os_type, url)
        else:
            print("        apply:  (no apply URL found — opening folder only)")
        open_target(os_type, str(cv_dir))

        if i < total:
            ans = input("\nPress Enter for the next job, or 'q' to quit: ").strip().lower()
            if ans == "q":
                print("Stopped.")
                break
            print()

    print("\nDone.")


if __name__ == "__main__":
    main()
