#!/usr/bin/env python3
"""Apply v4.0.74 split scheduler to Gain Focus's large single-file entrypoint.

Idempotent, preserves the entire existing HTML; deliberately does not alter the
currently deployed main branch unless the reviewed branch is later merged.
"""
from pathlib import Path

page = Path("index.html")
if not page.exists():
    raise SystemExit("index.html not found")
source = page.read_text(encoding="utf-8")
tag = '<script src="./training-split-scheduler.js?v=4.0.74" defer></script>'
if tag in source:
    print("Gain Focus split module already linked")
else:
    anchor = "\n</body>\n</html>"
    if source.count(anchor) != 1:
        raise SystemExit("Expected one trailing </body></html> footer")
    source = source.replace(anchor, "\n" + tag + anchor)
    page.write_text(source, encoding="utf-8")
    print("Linked Gain Focus split module into index.html")
if source.count(tag) != 1:
    raise SystemExit("Split module must be loaded exactly once")
