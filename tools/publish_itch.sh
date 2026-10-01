#!/bin/bash

# ============================================================================
# Publish the current HEAD to https://kuhyx.itch.io/levels-of-typing.
#
# Rebuilds dist/ and refuses if it differs from the committed file, so what
# goes up is exactly HEAD. Then stages it as index.html (itch's html5 channel
# needs that name), boot-tests it and pushes it with
# butler, versioned by the git short hash. Pushing replaces the build behind
# the existing page; the page settings (embed size, visibility) stay as set.
#
# Self-contained so .github/workflows/deploy-itch.yml can run it unchanged:
# the boot gate is the repo's own jsdom test, butler is installed if missing
# and authenticates from BUTLER_API_KEY in CI (from `butler login` locally).
# The headless-Chromium screenshot from the itch-publish skill is an extra
# local check; CI has no copy of the skill, so it is skipped there.
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
readonly BUTLER_URL="https://broth.itch.zone/butler/linux-amd64/LATEST/archive/default"
readonly BIN_DIR="$HOME/.local/bin"
# Not /tmp: tmpfs is wiped on reboot, and this is evidence worth keeping.
readonly STAGE="$HOME/data/claude-scratch/levels-of-typing-release"

DRY_RUN=()

ensure_butler() {
    command -v butler >/dev/null 2>&1 && return
    echo "Installing butler into $BIN_DIR..."
    local tmp
    tmp="$(mktemp -d)"
    curl -fsSL -o "$tmp/butler.zip" "$BUTLER_URL"
    unzip -q "$tmp/butler.zip" -d "$tmp"
    mkdir -p "$BIN_DIR"
    install -m 755 "$tmp/butler" "$BIN_DIR/butler"
    rm -rf "$tmp"
    export PATH="$BIN_DIR:$PATH"
}

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

# The jsdom test drives every level of dist/ with real KeyboardEvents and
# fails unless it ends in "ALL PASSED", so it is the boot gate everywhere.
smoke_test() {
    [[ -d "$REPO/tools/node_modules" ]] || npm --prefix "$REPO/tools" ci
    node "$REPO/tools/test.js"
    if [[ -f "$SKILL/web_smoke.py" ]]; then
        # A DOM game, not a canvas one: #title stays empty until the script
        # has booted and rendered the first level.
        "$HOME/.claude/scripts/capped.sh" uv run --with playwright python \
            "$SKILL/web_smoke.py" "$STAGE/web" --selector '#title' --seconds 3 \
            --shot "$STAGE/web_smoke.png"
    else
        echo "No itch-publish skill here: skipping the Chromium screenshot."
    fi
}

push() {
    local version
    version="$(git -C "$REPO" rev-parse --short HEAD)"
    ensure_butler
    butler push "${DRY_RUN[@]}" "$STAGE/web" "$TARGET" --userversion "$version"
    [[ ${#DRY_RUN[@]} -eq 0 ]] && butler status "${TARGET%%:*}" </dev/null
    return 0
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
            sed -n '4,21p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
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
