#!/usr/bin/env python3
"""
Capybara Cove — optional local tooling.

The site itself is pure HTML + CSS + JavaScript; Python is NOT required to run it.
This helper is only for local development / content management:

    python python/server.py serve            # serve the built ./dist folder
    python python/server.py add              # interactively append an announcement
    python python/server.py list             # print the current announcements

Announcement data lives in  public/data/announcements.json  and is fetched by the
frontend at runtime, so editing it here is enough to publish a new notice.
"""

import functools
import http.server
import json
import os
import socketserver
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "public", "data", "announcements.json")
DIST = os.path.join(ROOT, "dist")
PORT = int(os.environ.get("PORT", 8000))


def load():
    with open(DATA, "r", encoding="utf-8") as fh:
        return json.load(fh)


def save(items):
    with open(DATA, "w", encoding="utf-8") as fh:
        json.dump(items, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def cmd_list():
    for i, a in enumerate(load(), 1):
        print(f"{i:2}. [{a['tag']:^6}] {a['date']:<20} {a['title']}")


def cmd_add():
    items = load()
    title = input("Title: ").strip().upper()
    tag = (input("Tag (NEWS/UPDATE/EVENT) [NEWS]: ").strip() or "NEWS").upper()
    when = input(f"Date [{date.today():%B %d, %Y}]: ").strip() or f"{date.today():%B %d, %Y}"
    print("Body (finish with an empty line):")
    lines = []
    while True:
        line = input()
        if not line:
            break
        lines.append(line)
    items.append(
        {
            "id": f"a{len(items) + 1}",
            "title": title,
            "date": when,
            "tag": tag,
            "body": "\n".join(lines),
        }
    )
    save(items)
    print(f"Saved. {len(items)} announcements on the board.")


def cmd_serve():
    directory = DIST if os.path.isdir(DIST) else ROOT
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=directory)
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Capybara Cove is live on http://localhost:{PORT}  (serving {directory})")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nbye, buddy.")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "serve"
    {"serve": cmd_serve, "add": cmd_add, "list": cmd_list}.get(cmd, cmd_serve)()
