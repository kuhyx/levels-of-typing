#!/bin/bash

# ============================================================================
# Install everything levels-of-typing needs, rebuild, and open the game.
#
# The game itself is one self-contained HTML file with no runtime
# dependencies; everything installed here serves the build check, the
# headless test, the word-list generator and the commit gates. Every mode
# installs and rebuilds first, so a src/ edit is never silently played stale.
#
# Usage:
#   ./run.sh              # install deps, build dist/, open it in a browser
#   ./run.sh --build      # install deps, build dist/, stop there
#   ./run.sh --test       # install deps, build, run the headless test
# ============================================================================

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO
readonly DIST="$REPO/dist/levels-of-typing.html"
# gen_words.py validates against this file; on Arch the `words` package
# provides it (Debian: wamerican). It has no command to probe, hence the path.
readonly DICT="/usr/share/dict/american-english"

MODE="play"

usage() {
    sed -n '4,14p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    exit 0
}

# Installs a pacman package if the command it provides is missing. Checking
# the command rather than the pacman database keeps this a no-op when the
# tool comes from elsewhere (node on this machine is an nvm install).
require_pacman() {
    local command_name="$1" package="$2"
    if command -v "$command_name" >/dev/null 2>&1; then
        return 0
    fi
    echo "Installing $package (provides '$command_name')..."
    sudo pacman -S --needed --noconfirm "$package"
}

install_deps() {
    require_pacman python3 python
    require_pacman node nodejs
    require_pacman npm npm
    if [[ ! -f "$DICT" ]]; then
        echo "Installing words (provides $DICT)..."
        sudo pacman -S --needed --noconfirm words
    fi

    # `npm ci` wipes node_modules on every run, so only pay for it when the
    # test's one dependency is actually absent.
    if [[ ! -d "$REPO/tools/node_modules/jsdom" ]]; then
        echo "Installing test dependencies..."
        npm --prefix "$REPO/tools" ci
    fi

    if [[ -d "$REPO/.git" && ! -f "$REPO/.git/hooks/pre-commit" ]]; then
        "$REPO/scripts/install_hooks.sh"
    fi
}

build() {
    python3 "$REPO/tools/build.py"
}

run_tests() {
    node "$REPO/tools/test.js"
}

# Detached on purpose: with no browser already running, xdg-open stays
# attached to the one it spawns and this script would never return.
open_game() {
    local url="file://$DIST" browser
    for browser in xdg-open chromium google-chrome-stable firefox; do
        if command -v "$browser" >/dev/null 2>&1; then
            echo "Opening $url with $browser"
            setsid "$browser" "$url" >/dev/null 2>&1 &
            return 0
        fi
    done
    echo "Error: no browser found (tried xdg-open, chromium, google-chrome-stable, firefox)." >&2
    echo "Open $url manually." >&2
    exit 1
}

main() {
    install_deps
    build
    case "$MODE" in
        build) ;;
        test) run_tests ;;
        play) open_game ;;
    esac
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --build) MODE="build" ;;
        --test) MODE="test" ;;
        -h | --help) usage ;;
        *)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
    esac
    shift
done

main
