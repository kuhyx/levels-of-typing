#!/usr/bin/env python3
"""Assembles dist/levels-of-typing.html from the files in src/.

The deliverable is one self-contained HTML file, so every script part is
concatenated into a single <script> in PARTS order. Order matters: each part
declares top-level names the later ones use (words -> core -> state -> panel
-> drill -> app). A new part goes into PARTS, not into build logic.

Run from the repo root: python3 tools/build.py
"""

import os
import subprocess
import tempfile

ROOT = os.path.join(os.path.dirname(__file__), "..")
PARTS = ["words.js", "core.js", "state.js", "panel.js", "drill.js", "app.js"]


def src(name: str) -> str:
    with open(os.path.join(ROOT, "src", name), encoding="utf-8") as f:
        return f.read()


def main() -> None:
    js = "\n".join(src(name) for name in PARTS)
    html = src("part1.html") + "<script>\n" + js + "\n</script>\n</body>\n</html>\n"

    os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
    out = os.path.join(ROOT, "dist", "levels-of-typing.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)

    # `node --check` on the concatenated script catches a part that parses on
    # its own but not once joined (a stray unterminated block, say).
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(js)
        tmp = f.name
    try:
        subprocess.run(["node", "--check", tmp], check=True)
        print(f"built {out} ({len(html)} bytes), JS syntax OK")
    except FileNotFoundError:
        print(f"built {out} ({len(html)} bytes); node not found, syntax not checked")
    finally:
        os.unlink(tmp)


if __name__ == "__main__":
    main()
