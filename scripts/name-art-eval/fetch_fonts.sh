#!/usr/bin/env bash
# Fetch the OFL fonts used by the zero-cost checks and verify their SHA-256 (google/fonts on GitHub).
set -euo pipefail
cd "$(dirname "$0")"; mkdir -p fonts
B=https://raw.githubusercontent.com/google/fonts/main/ofl
while read -r sum path name; do
  [ -f "fonts/$name" ] || curl -sSfL -o "fonts/$name" "$B/$path"
  echo "$sum  fonts/$name" | sha256sum -c --quiet || { echo "hash mismatch: $name (upstream changed; review before use)"; exit 1; }
done <<'LIST'
cfccb794268e7d573d857e6d6a67f89cf8a053e8ffd85dfa0c8ec1bb36fc4827 amiri/Amiri-Bold.ttf Amiri-Bold.ttf
247071015b7eefd63f94d6e47949c5d10294ed31bd432f809ba9a219d93f91bb arefruqaa/ArefRuqaa-Bold.ttf ArefRuqaa-Bold.ttf
33ead1986cd48c138c4d906c9e5a6341877268461f97623409a2014de1cd4aa4 reemkufi/ReemKufi%5Bwght%5D.ttf ReemKufi[wght].ttf
54278882e4774c14d50c3b555f127d0fe586366d5b787316ebbcbd8108829e60 rakkas/Rakkas-Regular.ttf Rakkas-Regular.ttf
4410dfc591b918dd4360b0252b079855a8a00250de363c8c0163b29ddfc56434 alkalami/Alkalami-Regular.ttf Alkalami-Regular.ttf
9c4d8cfba7b663dad7eeeeb52a625749f3e1f5ec472a0a6333e1684a2f43dbdf qahiri/Qahiri-Regular.ttf Qahiri-Regular.ttf
5cd0ff67dcfbc371c6450afffe10f6e7027ffada0c31f436beb8865e57b781a3 blaka/Blaka-Regular.ttf Blaka-Regular.ttf
LIST
echo "fonts ok"
