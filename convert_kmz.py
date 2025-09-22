import sys, zipfile, json
from xml.dom import minidom
from pathlib import Path

if len(sys.argv) < 2:
    print("Usage: python convert_kmz.py input.kmz")
    sys.exit(1)

kmz_file = sys.argv[1]
out_file = "data.geojson"

with zipfile.ZipFile(kmz_file, "r") as kmz:
    kmz.extractall("kmz_extract")

kml_path = Path("kmz_extract/doc.kml")
doc = minidom.parse(str(kml_path))

placemarks = doc.getElementsByTagName("Placemark")
features = []

for pm in placemarks:
    name = pm.getElementsByTagName("name")[0].firstChild.nodeValue if pm.getElementsByTagName("name") else "Unnamed"
    coords_text = pm.getElementsByTagName("coordinates")
    if not coords_text:
        continue
    coords = coords_text[0].firstChild.nodeValue.strip()
    coords_list = []
    for coord in coords.split():
        lon, lat, *_ = coord.split(",")
        coords_list.append([float(lon), float(lat)])
    if len(coords_list) > 2:
        geometry = {"type": "Polygon", "coordinates": [coords_list]}
    else:
        geometry = {"type": "Point", "coordinates": coords_list[0]}
    features.append({"type": "Feature", "properties": {"name": name}, "geometry": geometry})

geojson_data = {"type": "FeatureCollection", "features": features}
with open(out_file, "w") as f:
    json.dump(geojson_data, f)

print(f"Converted {kmz_file} -> {out_file} with {len(features)} features.")
