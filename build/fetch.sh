#!/bin/sh
# Natural Earth 1:50m vectors — public domain. Only needed to regenerate mapdata.json.
cd "$(dirname "$0")" || exit 1
base=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson
for f in ne_50m_admin_0_countries ne_50m_geography_marine_polys ne_50m_lakes; do
  echo "fetching $f"
  curl -sSfL -o "$f.geojson" "$base/$f.geojson"
done
