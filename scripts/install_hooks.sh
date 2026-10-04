#!/bin/bash

# ============================================================================
# Install this repo's git hooks.
#
# .git/hooks/ is not tracked, so a fresh clone has no hooks. Run this once
# after cloning. The gates themselves live in .pre-commit-config.yaml (all
# read-only: file length, markdown naming, dependency freshness); this script
# only makes sure the pre-commit framework is present and wired in.
# ============================================================================

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
readonly REPO_ROOT

ensure_pre_commit() {
    if command -v pre-commit >/dev/null 2>&1; then
        return
    fi
    echo "Installing pre-commit..."
    # Arch ships it as a package, and a fresh Arch box has neither pipx nor
    # a pip that will install outside a venv (PEP 668), so pacman goes first.
    if command -v pacman >/dev/null 2>&1; then
        sudo pacman -S --needed --noconfirm pre-commit
    elif command -v pipx >/dev/null 2>&1; then
        pipx install pre-commit
    else
        python3 -m pip install --user pre-commit
    fi
}

main() {
    ensure_pre_commit
    (cd "$REPO_ROOT" && pre-commit install)
    echo "Installed pre-commit hooks: $REPO_ROOT/.git/hooks/pre-commit"
}

main "$@"
