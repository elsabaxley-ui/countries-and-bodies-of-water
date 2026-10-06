#!/bin/sh
# app.html (template) + mapdata.json  ->  ../index.html
cd "$(dirname "$0")" || exit 1
python3 - <<'PY'
import religions
h = open('app.html', encoding='utf-8').read()
d = open('mapdata.json', encoding='utf-8').read()
r = __import__('json').dumps(religions.payload(), separators=(',', ':'))
for blob in (d, r):
    assert '</script' not in blob.lower(), 'data would break out of the script tag'
out = h.replace('__MAPDATA__', d).replace('__RELIGIONS__', r)
open('../index.html', 'w', encoding='utf-8').write(out)
print('wrote index.html —', len(out.encode()), 'bytes')
PY
