#!/bin/bash

# ============================================================================
# Run the headless jsdom test when game sources or the test harness changed
# vs HEAD (staged, unstaged, untracked). The suite is one end-to-end file, so
# "related tests" means that file: rebuild dist/, run it, print failures plus
# a one-line summary. Unmappable changes (deps) and --all run it too.
# ============================================================================

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

run_suite() {
    local out
    python3 tools/build.py >/dev/null
    if [[ ! -d tools/node_modules/jsdom ]]; then
        npm --prefix tools ci --silent >/dev/null
    fi
    out="$(node tools/test.js 2>&1)" && rc=0 || rc=$?
    printf '%s\n' "$out" | grep -v '^ok ' | grep -v '^$' || true
    return "$rc"
}

main() {
    if [[ "${1:-}" == "--all" ]]; then
        run_suite
        return
    fi
    local changed
    changed="$({ git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u)"
    if [[ -z "$changed" ]]; then
        echo "no changes vs HEAD: nothing to test"
        return 0
    fi
    if ! grep -Eq '^(src/|tools/|data/)' <<<"$changed"; then
        echo "no game/test changes: nothing to test"
        return 0
    fi
    run_suite
}

main "$@"
exit $?
