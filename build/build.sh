#!/bin/sh
# app.html (template) + mapdata.json  ->  ../index.html
cd "$(dirname "$0")" || exit 1
python3 - <<'PY'
h = open('app.html', encoding='utf-8').read()
d = open('mapdata.json', encoding='utf-8').read()
assert '</script' not in d.lower(), 'map data would break out of the script tag'
out = h.replace('__MAPDATA__', d)
open('../index.html', 'w', encoding='utf-8').write(out)
print('wrote index.html —', len(out.encode()), 'bytes')
PY
