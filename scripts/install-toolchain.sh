#!/usr/bin/env bash
# install-toolchain.sh — install the ipa-helper development toolchain.
#
# Installs (all user-local, no root needed except for optional system packages):
#   1. fnm        — Node version manager            (~/.local/share/fnm)
#   2. Node.js    — version pinned in .node-version (via fnm)
#   3. pnpm       — version pinned in package.json "packageManager" (via Corepack,
#                   falling back to `npm i -g`)
#   4. Project dependencies       (pnpm install)         — if package.json exists,
#                                  including the dev-only ffmpeg-static binary
#   5. Playwright browsers + libs (pnpm exec playwright) — if Playwright is a dependency
#   6. The word voice model (pnpm voice:fetch, 63.5 MB)   — for Play word in dev
#   7. Optional: TeX Live + tipa for the TIPA compile test (--with-tex)
#
# Idempotent: safe to re-run; already-installed pieces are skipped.
#
# Usage: ./scripts/install-toolchain.sh [options]
#   --no-project      Only install fnm/Node/pnpm (skip deps and browsers)
#   --no-browsers     Skip Playwright browser installation
#   --no-voice        Skip downloading the voice model (Play word then fails in dev)
#   --no-system-deps  Never invoke sudo/apt/brew (browsers installed without OS libs)
#   --with-tex        Also install pdflatex + tipa (for roadmap task M6.4)
#   --no-shell-config Do not modify ~/.zshrc / ~/.bashrc
#   -y, --yes         Non-interactive: assume "yes" for sudo prompts
#   -h, --help        Show this help

set -Eeuo pipefail

# ----------------------------------------------------------------------------
# Constants and options
# ----------------------------------------------------------------------------
readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
FNM_INSTALL_DIR="${FNM_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/fnm}"
readonly DEFAULT_PNPM_VERSION="10"   # used only until package.json pins one
readonly SHELL_MARKER="# >>> ipa-helper: fnm >>>"

opt_project=1
opt_browsers=1
opt_voice=1
opt_system=1
opt_tex=0
opt_shell=1
opt_yes=0

# ----------------------------------------------------------------------------
# Output helpers
# ----------------------------------------------------------------------------
if [[ -t 1 ]]; then
  c_reset=$'\e[0m'; c_bold=$'\e[1m'; c_aqua=$'\e[36m'; c_green=$'\e[32m'
  c_yellow=$'\e[33m'; c_red=$'\e[31m'
else
  c_reset=''; c_bold=''; c_aqua=''; c_green=''; c_yellow=''; c_red=''
fi
step() { printf '\n%s==>%s %s%s%s\n' "$c_aqua" "$c_reset" "$c_bold" "$*" "$c_reset"; }
ok()   { printf '  %s✓%s %s\n' "$c_green" "$c_reset" "$*"; }
warn() { printf '  %s!%s %s\n' "$c_yellow" "$c_reset" "$*" >&2; }
die()  { printf '%serror:%s %s\n' "$c_red" "$c_reset" "$*" >&2; exit 1; }
trap 'die "failed at line ${LINENO}: ${BASH_COMMAND}"' ERR

usage() { sed -n '2,/^$/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0; }

have() { command -v "$1" >/dev/null 2>&1; }

confirm() {
  (( opt_yes )) && return 0
  [[ -t 0 ]] || return 1
  local reply
  read -r -p "  $1 [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

# ----------------------------------------------------------------------------
# Argument parsing
# ----------------------------------------------------------------------------
while (( $# )); do
  case "$1" in
    --no-project)      opt_project=0 ;;
    --no-browsers)     opt_browsers=0 ;;
    --no-voice)        opt_voice=0 ;;
    --no-system-deps)  opt_system=0 ;;
    --with-tex)        opt_tex=1 ;;
    --no-shell-config) opt_shell=0 ;;
    -y|--yes)          opt_yes=1 ;;
    -h|--help)         usage ;;
    *) die "unknown option: $1 (see --help)" ;;
  esac
  shift
done

# ----------------------------------------------------------------------------
# Platform detection
# ----------------------------------------------------------------------------
os="$(uname -s)"
case "$os" in
  Linux)  pkg_mgr="$(have apt-get && echo apt || { have dnf && echo dnf; } || { have pacman && echo pacman; } || echo none)" ;;
  Darwin) pkg_mgr="$(have brew && echo brew || echo none)" ;;
  *) die "unsupported OS: $os (Linux, WSL and macOS are supported)" ;;
esac

install_system_packages() {
  # $@: package names (apt naming; mapped for other managers where needed)
  (( opt_system )) || { warn "skipping system packages ($*) due to --no-system-deps"; return 1; }
  case "$pkg_mgr" in
    apt)
      confirm "Install system packages with sudo apt-get: $*?" || return 1
      sudo apt-get update -qq && sudo apt-get install -y -qq "$@" ;;
    dnf)
      confirm "Install system packages with sudo dnf: $*?" || return 1
      sudo dnf install -y "$@" ;;
    pacman)
      confirm "Install system packages with sudo pacman: $*?" || return 1
      sudo pacman -S --needed --noconfirm "$@" ;;
    brew)
      brew install "$@" ;;
    *) warn "no supported package manager found; please install: $*"; return 1 ;;
  esac
}

# ----------------------------------------------------------------------------
# 0. Prerequisites
# ----------------------------------------------------------------------------
step "Checking prerequisites"
missing=()
for tool in curl unzip git; do have "$tool" || missing+=("$tool"); done
if (( ${#missing[@]} )); then
  install_system_packages "${missing[@]}" || die "missing required tools: ${missing[*]}"
fi
ok "curl, unzip, git present"

[[ -f "${REPO_ROOT}/.node-version" ]] || die ".node-version not found in ${REPO_ROOT}"
node_wanted="$(tr -d '[:space:]' < "${REPO_ROOT}/.node-version")"
[[ -n "$node_wanted" ]] || die ".node-version is empty"
ok "Node version pinned: ${node_wanted}"

# ----------------------------------------------------------------------------
# 1. fnm
# ----------------------------------------------------------------------------
step "Installing fnm (Node version manager)"
export PATH="${FNM_INSTALL_DIR}:${PATH}"
if have fnm; then
  ok "fnm already installed ($(fnm --version))"
else
  # Official installer; --skip-shell because we manage shell config ourselves.
  curl -fsSL https://fnm.vercel.app/install \
    | bash -s -- --install-dir "${FNM_INSTALL_DIR}" --skip-shell
  have fnm || die "fnm installation failed"
  ok "fnm installed ($(fnm --version))"
fi
eval "$(fnm env --shell bash)"

configure_shell() {
  local rc="$1" shell_name="$2"
  [[ -f "$rc" ]] || touch "$rc"
  if grep -qF "$SHELL_MARKER" "$rc"; then
    ok "${rc/#$HOME/\~} already configured"
    return
  fi
  cat >> "$rc" <<EOF

${SHELL_MARKER}
export PATH="${FNM_INSTALL_DIR}:\$PATH"
eval "\$(fnm env --use-on-cd --version-file-strategy=recursive --shell ${shell_name})"
# <<< ipa-helper: fnm <<<
EOF
  ok "configured ${rc/#$HOME/\~}"
}

if (( opt_shell )); then
  login_shell="$(basename "${SHELL:-bash}")"
  case "$login_shell" in
    zsh)  configure_shell "${ZDOTDIR:-$HOME}/.zshrc" zsh ;;
    bash) configure_shell "$HOME/.bashrc" bash ;;
    fish) warn "fish detected: add 'fnm env --use-on-cd | source' to ~/.config/fish/conf.d/fnm.fish" ;;
    *)    warn "unknown shell '$login_shell'; configure fnm manually (see https://github.com/Schniz/fnm)" ;;
  esac
fi

# ----------------------------------------------------------------------------
# 2. Node.js
# ----------------------------------------------------------------------------
step "Installing Node.js ${node_wanted}"
cd "${REPO_ROOT}"
fnm use --install-if-missing --silent-if-unchanged "${node_wanted}"
hash -r
# .node-version holds a major ("24") or a full version ("24.11.0"); either must prefix the active one.
[[ "$(node -v)" == "v${node_wanted#v}"* ]] \
  || die "active node $(node -v) does not match .node-version (${node_wanted}); is another node earlier on PATH?"
fnm default "${node_wanted}" >/dev/null
ok "node $(node -v) at $(command -v node)"

# ----------------------------------------------------------------------------
# 3. pnpm
# ----------------------------------------------------------------------------
step "Installing pnpm"
pnpm_spec=""
if [[ -f package.json ]]; then
  pnpm_spec="$(node -e 'const p=require("./package.json");const m=(p.packageManager||"").match(/^pnpm@([^+]+)/);process.stdout.write(m?m[1]:"")')"
fi
pnpm_spec="${pnpm_spec:-$DEFAULT_PNPM_VERSION}"

if have corepack; then
  export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
  corepack enable pnpm
  corepack prepare "pnpm@${pnpm_spec}" --activate >/dev/null
  ok "pnpm via Corepack"
else
  # Node >= 25 no longer bundles Corepack.
  npm install --global --no-fund --no-audit "pnpm@${pnpm_spec}" >/dev/null
  ok "pnpm via npm -g"
fi
hash -r
have pnpm || die "pnpm not on PATH after installation"
ok "pnpm $(pnpm --version)"

# ----------------------------------------------------------------------------
# 4. Project dependencies
# ----------------------------------------------------------------------------
if (( opt_project )); then
  step "Installing project dependencies"
  if [[ -f package.json ]]; then
    if [[ -f pnpm-lock.yaml ]]; then
      pnpm install --frozen-lockfile
    else
      pnpm install
    fi
    ok "dependencies installed"
    # ffmpeg-static downloads its binary in a build script (allowed in
    # pnpm-workspace.yaml). Only `pnpm audio:candidates` needs it (M4.3).
    if [[ -x node_modules/ffmpeg-static/ffmpeg ]]; then
      ok "ffmpeg (ffmpeg-static) for the symbol clip scripts"
    elif grep -q '"ffmpeg-static"' package.json; then
      warn "ffmpeg-static has no binary (download blocked?); run: pnpm rebuild ffmpeg-static"
    fi
  else
    warn "no package.json yet; run /bootstrap in Claude Code, then re-run this script"
  fi

  # --------------------------------------------------------------------------
  # 5. Playwright browsers
  # --------------------------------------------------------------------------
  if (( opt_browsers )) && [[ -f package.json ]] && grep -q '"@playwright/test"' package.json; then
    step "Installing Playwright browsers"
    if (( opt_system )) && [[ "$os" == Linux ]] && confirm "Install browser system libraries (uses sudo)?"; then
      pnpm exec playwright install --with-deps
    else
      pnpm exec playwright install
      if [[ "$os" == Linux ]]; then
        warn "browser OS libraries not installed; if e2e fails, run: pnpm exec playwright install-deps"
      fi
    fi
    ok "Playwright browsers ready"
  fi

  # --------------------------------------------------------------------------
  # 6. Voice model (gitignored; Play word needs it, ADR-0009)
  # --------------------------------------------------------------------------
  if (( opt_voice )) && [[ -f package.json ]] && grep -q '"voice:fetch"' package.json; then
    step "Fetching the voice model"
    if pnpm voice:fetch; then
      ok "voice model ready"
    else
      warn "couldn't fetch the voice model; Play word won't work until you run: pnpm voice:fetch"
    fi
  fi
fi

# ----------------------------------------------------------------------------
# 7. Optional TeX (TIPA compile test)
# ----------------------------------------------------------------------------
if (( opt_tex )); then
  step "Installing TeX Live + tipa"
  if have pdflatex && kpsewhich tipa.sty >/dev/null 2>&1; then
    ok "pdflatex and tipa.sty already available"
  else
    case "$pkg_mgr" in
      apt)    install_system_packages texlive-latex-base texlive-latex-recommended tipa || true ;;
      dnf)    install_system_packages texlive-scheme-basic texlive-tipa || true ;;
      pacman) install_system_packages texlive-basic texlive-latexextra texlive-fontsrecommended || true ;;
      brew)   warn "install MacTeX/BasicTeX, then: sudo tlmgr install tipa" ;;
      *)      warn "install TeX Live with the tipa package manually" ;;
    esac
    if kpsewhich tipa.sty >/dev/null 2>&1; then ok "tipa.sty found"; else warn "tipa.sty still not found"; fi
  fi
fi

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------
step "Done"
printf '  node %s · pnpm %s · fnm %s\n' "$(node -v)" "$(pnpm --version)" "$(fnm --version | awk '{print $2}')"
if (( opt_shell )); then
  printf '  Open a new terminal (or run: %sexec %s%s) to pick up fnm in your shell.\n' \
    "$c_bold" "${SHELL:-bash}" "$c_reset"
fi
