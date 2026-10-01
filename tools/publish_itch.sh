#!/bin/bash

# ============================================================================
# Publish the current HEAD to https://kuhyx.itch.io/levels-of-typing.
#
# Rebuilds dist/ and refuses if it differs from the committed file, so what
# goes up is exactly HEAD. Then stages it as index.html (itch's html5 channel
# needs that name), smoke-tests it in headless Chromium and pushes it with
# butler, versioned by the git short hash. Pushing replaces the build behind
# the existing page; the page settings (embed size, visibility) stay as set.
#
# Usage:
#   tools/publish_itch.sh            # build, smoke-test, push
#   tools/publish_itch.sh --dry-run  # everything except the real upload
# ============================================================================

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly REPO
readonly SKILL="$HOME/.claude/skills/itch-publish/scripts"
readonly TARGET="kuhyx/levels-of-typing:html5"
# Not /tmp: tmpfs is wiped on reboot, and this is evidence worth keeping.
readonly STAGE="$HOME/data/claude-scratch/levels-of-typing-release"

DRY_RUN=()

require_clean_tree() {
    if [[ -n "$(git -C "$REPO" status --porcelain)" ]]; then
        echo "Error: working tree is dirty; commit or discard changes first." >&2
        exit 1
    fi
}

build_and_check() {
    python3 "$REPO/tools/build.py"
    if ! git -C "$REPO" diff --quiet -- dist/; then
        echo "Error: dist/ is stale relative to src/; commit the rebuild first." >&2
        exit 1
    fi
}

stage() {
    mkdir -p "$STAGE/web"
    cp "$REPO/dist/levels-of-typing.html" "$STAGE/web/index.html"
}

# A DOM game, not a canvas one: #title stays empty until the script has
# booted and rendered the first level, so waiting for it proves the JS ran.
smoke_test() {
    "$HOME/.claude/scripts/capped.sh" uv run --with playwright python \
        "$SKILL/web_smoke.py" "$STAGE/web" --selector '#title' --seconds 3 \
        --shot "$STAGE/web_smoke.png"
}

push() {
    local version
    version="$(git -C "$REPO" rev-parse --short HEAD)"
    "$SKILL/push.sh" "$STAGE/web" "$TARGET" "$version" "${DRY_RUN[@]}"
}

main() {
    require_clean_tree
    build_and_check
    stage
    smoke_test
    push
    echo "Next: open https://kuhyx.itch.io/levels-of-typing, click Run game."
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run) DRY_RUN=(--dry-run) ;;
        -h | --help)
            sed -n '4,15p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
    esac
    shift
done

main
