#!/usr/bin/env bash
# Rebuilds the self-hosted font subsets in public/fonts (NFR-7, roadmap M2.2).
#
# Downloads pinned upstream releases, verifies their SHA-256, and subsets them
# with fontTools (pinned, in a throwaway virtualenv) into woff2. The outputs are
# committed, so this only needs re-running to change the character set or bump a
# font version. Keep the ranges in step with the unicode-range values in
# src/styles/fonts.css; src/styles/fonts.test.ts checks that they cover every
# inventory symbol.
#
# Requires: curl, unzip, sha256sum, python3 (with venv).
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="${repo_root}/public/fonts"
work="$(mktemp -d)"
trap 'rm -rf "${work}"' EXIT

charis_version="7.000"
charis_url="https://github.com/silnrsi/font-charis/releases/download/v${charis_version}/Charis-${charis_version}.zip"
charis_sha256="e3237b1303c5d31af8f59b1d1914886c5e873b77c71390e4742fb3bc1c187666"

mono_version="2.304"
mono_url="https://github.com/JetBrains/JetBrainsMono/releases/download/v${mono_version}/JetBrainsMono-${mono_version}.zip"
mono_sha256="6f6376c6ed2960ea8a963cd7387ec9d76e3f629125bc33d1fdcd7eb7012f7bbf"

fonttools_version="4.60.1"
brotli_version="1.1.0"

# IPA text: ASCII; the Latin letters IPA borrows (æ ç ð ø ħ ŋ œ, clicks ǀ ǁ ǂ ǃ);
# IPA Extensions; Spacing Modifier Letters (ˈ ˌ ː ˑ ʰ); Combining Diacritics
# (incl. tie bars); the Greek letters IPA uses (β θ χ); superscript n and schwa;
# and the punctuation, arrow and tone-letter marks IPA uses.
ipa_ranges="U+0020-007E,U+00E6-00E7,U+00F0,U+00F8,U+0127,U+014B,U+0153,U+01C0-01C3,U+0250-036F,U+03B2,U+03B8,U+03C7,U+1D4A,U+207F,U+2016,U+2026,U+203F,U+2191,U+2193,U+2197-2198,U+A71B-A71F"
# TIPA output is ASCII; the ellipsis covers the empty-word placeholder.
mono_ranges="U+0020-007E,U+2026"

fetch() {
  local url="$1" sha="$2" dest="$3"
  curl --fail --silent --show-error --location --output "${dest}" "${url}"
  echo "${sha}  ${dest}" | sha256sum --check --quiet
}

echo "Downloading fonts…"
mkdir -p "${work}/charis" "${work}/mono"
fetch "${charis_url}" "${charis_sha256}" "${work}/charis.zip"
fetch "${mono_url}" "${mono_sha256}" "${work}/mono.zip"
unzip -q "${work}/charis.zip" -d "${work}/charis"
unzip -q "${work}/mono.zip" -d "${work}/mono"

echo "Installing fontTools ${fonttools_version} into a temporary virtualenv…"
python3 -m venv "${work}/venv"
"${work}/venv/bin/pip" install --quiet "fonttools==${fonttools_version}" "brotli==${brotli_version}"

subset() {
  local src="$1" ranges="$2" dest="$3"
  "${work}/venv/bin/pyftsubset" "${src}" \
    --unicodes="${ranges}" \
    --layout-features='*' \
    --flavor=woff2 \
    --no-hinting \
    --desubroutinize \
    --output-file="${dest}"
  echo "  $(basename "${dest}"): $(wc -c <"${dest}") bytes"
}

echo "Subsetting…"
mkdir -p "${out}"
charis_regular="$(find "${work}/charis" -name 'Charis-Regular.ttf' | head -n 1)"
mono_regular="$(find "${work}/mono" -path '*fonts/ttf/*' -name 'JetBrainsMono-Regular.ttf' | head -n 1)"
subset "${charis_regular}" "${ipa_ranges}" "${out}/ipa-helper-ipa.woff2"

# Charis declares the Reserved Font Names "Charis" and "SIL", and OFL §3 forbids
# a Modified Version (a subset is one) from using them. So the subset is renamed;
# CSS loads it as "ipa-helper IPA". JetBrains Mono declares no Reserved Font Name.
"${work}/venv/bin/python3" - "${out}/ipa-helper-ipa.woff2" <<'PY'
import sys
from fontTools.ttLib import TTFont

path = sys.argv[1]
font = TTFont(path)
names = {
    1: "ipa-helper IPA",          # family
    3: "ipa-helper IPA Regular; subset of an OFL font",  # unique ID
    4: "ipa-helper IPA Regular",  # full name
    6: "ipaHelperIPA-Regular",    # PostScript name
    16: "ipa-helper IPA",         # typographic family
}
table = font["name"]
for record in list(table.names):
    if record.nameID in names or record.nameID == 17:
        table.removeNames(nameID=record.nameID)
for name_id, value in names.items():
    table.setName(value, name_id, 3, 1, 0x409)
    table.setName(value, name_id, 1, 0, 0)
leftover = [r for r in table.names if r.nameID in (1, 3, 4, 6, 16, 17, 18, 21, 22)
            and ("Charis" in r.toUnicode() or "SIL" in r.toUnicode())]
assert not leftover, leftover
font.flavor = "woff2"
font.save(path)
PY
subset "${mono_regular}" "${mono_ranges}" "${out}/jetbrains-mono-ascii.woff2"

cp "$(find "${work}/charis" -name 'OFL.txt' | head -n 1)" "${out}/OFL-CharisSIL.txt"
cp "$(find "${work}/mono" -name 'OFL.txt' | head -n 1)" "${out}/OFL-JetBrainsMono.txt"
echo "Done."
