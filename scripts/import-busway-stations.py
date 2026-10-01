#!/usr/bin/env python3
"""Merge EDSA Busway station details (coordinates, notes) from a KMZ/KML
export into fares/edsa-busway.json as a per-direction `stationInfo` array
aligned with each direction's `stations` list.

Usage: python3 scripts/import-busway-stations.py sources/EDSA_Busway_stations.kmz

The KMZ has two numbered layers: layer 0 runs PITX -> Monumento (northbound),
layer 1 runs Monumento -> PITX (southbound). Station names in the map differ
slightly from the LTFRB fare matrix, so they are matched through MATCH below.
The fare matrix stays the source of truth for station names and fares.
"""
from __future__ import annotations

import json
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"k": "http://www.opengis.net/kml/2.2"}

# matrix station name -> KMZ placemark name (per direction when they differ)
MATCH: dict[str, str | dict[str, str]] = {
    "Kaingin": "Kaingin Road",
    "Fernando Poe Jr.": "Roosevelt (Fernando Poe Jr.)",
    "Philam QC": "Philam (Quezon City)",
    "Nepa Q. Mart": "Nepa Q-Mart",
    "Ortigas": "Ortigas (SM Megamall)",
    "Ayala": {"southbound": "Ayala (One Ayala)", "northbound": "Ayala (Northbound)"},
    "MOA": "SM Mall of Asia",
    "DFA/Shell/Starbucks": "DFA (Bradco Avenue)",
    "DFA": "DFA (Bradco Avenue)",
    "Ayala Malls/Aseana": "Ayala Malls Manila Bay (Aseana)",
    # The matrix's northbound "City of Dreams" stop is the Aseana stop on the
    # map, whose note reads "Near City of Dreams / Ayala Malls Manila Bay".
    "City of Dreams": "Ayala Malls Manila Bay (Aseana)",
}
LAYER_DIR = {"0": "northbound", "1": "southbound"}


def read_kml(path: Path) -> str:
    if path.suffix.lower() == ".kmz":
        with zipfile.ZipFile(path) as z:
            name = next(n for n in z.namelist() if n.endswith(".kml"))
            return z.read(name).decode("utf-8")
    return path.read_text(encoding="utf-8")


def main() -> None:
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "sources/EDSA_Busway_stations.kmz")
    out = Path("fares/edsa-busway.json")
    root = ET.fromstring(read_kml(src))

    # placemarks per direction, keyed by name (first occurrence wins)
    by_dir: dict[str, dict[str, dict]] = {"northbound": {}, "southbound": {}}
    for pm in root.iter(f"{{{NS['k']}}}Placemark"):
        name = (pm.findtext("k:name", namespaces=NS) or "").strip()
        style = pm.findtext("k:styleUrl", namespaces=NS) or ""
        layer = style.split("-")[2] if style.count("-") >= 3 else "0"  # #icon-seq2-<layer>-<n>-...
        coords = pm.find(".//k:coordinates", namespaces=NS)
        if coords is None:
            continue
        lng, lat = (float(v) for v in coords.text.strip().split(",")[:2])
        note = " ".join((pm.findtext("k:description", namespaces=NS) or "").split())
        d = LAYER_DIR.get(layer, "northbound")
        by_dir[d].setdefault(name, {"mapName": name, "lat": lat, "lng": lng, "note": note})

    data = json.loads(out.read_text())
    missing: list[str] = []
    for d, direction in data["directions"].items():
        info = []
        for st in direction["stations"]:
            m = MATCH.get(st, st)
            key = m[d] if isinstance(m, dict) else m
            rec = by_dir[d].get(key) or by_dir["southbound" if d == "northbound" else "northbound"].get(key)
            if not rec:
                missing.append(f"{d}: {st} (looked for {key!r})")
                info.append(None)
            else:
                info.append(rec)
        direction["stationInfo"] = info
    data["stationSource"] = src.name
    out.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")
    if missing:
        sys.exit("unmatched stations:\n  " + "\n  ".join(missing))
    print(f"wrote stationInfo for {', '.join(data['directions'])} -> {out}")


if __name__ == "__main__":
    main()
