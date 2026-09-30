#!/usr/bin/env python3
"""Extract LTFRB fare guide PDFs into JSON fixtures and the EDSA Busway matrix.

Usage:
    python3 scripts/extract.py <dir-with-pdfs> [--fixtures fixtures] [--fares public/fares]

Requires `pdfplumber`. The PDFs are matched by keywords in their file names, so the
original LTFRB names ("Traditional PUJ.pdf", "PUB Provincial_Ordinary.pdf",
"Fare Matrix_R1_EDSA Busway Southbound...") work with or without upload prefixes.

Output (all money as decimal pesos, e.g. 14.25):
    fixtures/<mode>.json          km tables: rows of {km, old:{regular,discounted}, new:{...}}
    fixtures/edsa-busway-<dir>.json   station matrices (regular + discounted)
    fares/edsa-busway.json     the shipped MATRIX data file (source of truth)

A person must review the output before committing it (see spec §8).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

try:
    import pdfplumber
except ImportError:  # pragma: no cover
    sys.exit("pdfplumber is required: pip install pdfplumber")

NUM = re.compile(r"^\d{1,3}(,\d{3})*\.\d\d$")

# file-name keyword -> fixture id
KM_TABLES = {
    "traditional_puj": "puj-traditional",
    "modern_puj": "puj-modern",
    "provincial_ordinary": "pub-prov-ordinary",
    "provincial_aircon": "pub-prov-aircon",
    "provincial_deluxe": "pub-prov-deluxe",
    "provincial__super_deluxe": "pub-prov-super-deluxe",
    "provincial_super_deluxe": "pub-prov-super-deluxe",
    "provincial__luxury": "pub-prov-luxury",
    "provincial_luxury": "pub-prov-luxury",
    "city_aircon": "pub-city-aircon",
    "city_ordinary": "pub-city-ordinary",
}

SB_STATIONS = [
    "Monumento", "Bagong Barrio", "Balintawak", "Kaingin", "Fernando Poe Jr.",
    "SM North EDSA", "North Avenue", "Philam QC", "Quezon Avenue", "Kamuning",
    "Nepa Q. Mart", "Main Avenue", "Santolan", "Ortigas", "Guadalupe", "Buendia",
    "Ayala", "Tramo", "Taft Avenue", "Roxas Boulevard", "MOA",
    "DFA/Shell/Starbucks", "Ayala Malls/Aseana", "PITX",
]
NB_STATIONS = [
    "PITX", "City of Dreams", "DFA", "MOA", "Roxas Boulevard", "Taft Avenue",
    "Ayala", "Buendia", "Guadalupe", "Ortigas", "Santolan", "Main Avenue",
    "Nepa Q. Mart", "Kamuning", "Quezon Avenue", "Philam QC", "North Avenue",
    "SM North EDSA", "Fernando Poe Jr.", "Kaingin", "Balintawak", "Bagong Barrio",
    "Monumento",
]


def norm(name: str) -> str:
    return re.sub(r"[^a-z_]", "", name.lower().replace(" ", "_").replace("-", "_"))


def money(s: str) -> float:
    return float(s.replace(",", ""))


# ---------------------------------------------------------------- km tables
def extract_km_table(pdf_path: Path) -> list[dict]:
    """Rows look like:  km old_reg old_disc new_reg new_disc [km old_reg ...]"""
    rows: dict[int, dict] = {}
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text(layout=True) or ""
            for line in text.splitlines():
                toks = line.split()
                i = 0
                while i + 4 < len(toks) + 0 and i + 4 <= len(toks) - 1:
                    if toks[i].isdigit() and all(NUM.match(t) for t in toks[i + 1 : i + 5]):
                        km = int(toks[i])
                        rows[km] = {
                            "km": km,
                            "old": {"regular": money(toks[i + 1]), "discounted": money(toks[i + 2])},
                            "new": {"regular": money(toks[i + 3]), "discounted": money(toks[i + 4])},
                        }
                        i += 5
                    else:
                        i += 1
    return [rows[k] for k in sorted(rows)]


# ---------------------------------------------------------------- busway matrix
def extract_matrix(pdf_path: Path, stations: list[str]) -> dict:
    n = len(stations)
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[0]
        words = page.extract_words(x_tolerance=1.5, y_tolerance=2)

    # Only the grid: numbers above the "COMPUTATION OF FARES" footer.
    footer_y = min((w["top"] for w in words if w["text"].startswith("COMPUTATION")), default=page.height)
    nums = [w for w in words if NUM.match(w["text"]) and w["top"] < footer_y]
    # Column pitch: cluster the x0 of numeric words.
    xs = sorted({round(w["x0"]) for w in nums})
    # Merge x positions closer than 10pt into one column centre.
    cols: list[float] = []
    for x in xs:
        if cols and x - cols[-1] < 10:
            cols[-1] = (cols[-1] + x) / 2
        else:
            cols.append(float(x))
    pitch = min(b - a for a, b in zip(cols, cols[1:]))
    # Column 0 (origin == first station) never holds a number, so the first
    # numeric column is column 1.
    x_first = cols[0] - pitch

    # Rows: cluster the y positions of numeric words (each text line is one
    # cluster). Every origin except the last has two lines with numbers
    # (regular, then discounted), so line k belongs to origin k // 2.
    lines: list[float] = []
    for y in sorted(w["top"] for w in nums):
        if lines and y - lines[-1] < 4:
            continue
        lines.append(y)

    def line_index(y: float) -> int:
        return min(range(len(lines)), key=lambda k: abs(lines[k] - y))

    regular = [[None] * n for _ in range(n)]
    discounted = [[None] * n for _ in range(n)]
    for w in nums:
        j = round((w["x0"] - x_first) / pitch)
        k = line_index(w["top"])
        i, is_disc = divmod(k, 2)
        if not (0 <= i < n and 0 <= j < n):
            raise ValueError(f"{pdf_path.name}: word {w['text']} maps outside grid ({i},{j})")
        (discounted if is_disc else regular)[i][j] = money(w["text"])

    # Sanity checks.
    for i in range(n):
        for j in range(n):
            if j <= i:
                if regular[i][j] is not None or discounted[i][j] is not None:
                    raise ValueError(f"{pdf_path.name}: unexpected fare at ({i},{j})")
            else:
                if regular[i][j] is None or discounted[i][j] is None:
                    raise ValueError(f"{pdf_path.name}: missing fare at ({i},{j}) {stations[i]}->{stations[j]}")
        row_r = [regular[i][j] for j in range(i + 1, n)]
        if row_r != sorted(row_r):
            raise ValueError(f"{pdf_path.name}: fares not monotonic for origin {stations[i]}: {row_r}")
    return {"stations": stations, "regular": regular, "discounted": discounted}


# ---------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src", type=Path)
    ap.add_argument("--fixtures", type=Path, default=Path("fixtures"))
    ap.add_argument("--fares", type=Path, default=Path("fares"))
    args = ap.parse_args()
    args.fixtures.mkdir(parents=True, exist_ok=True)
    args.fares.mkdir(parents=True, exist_ok=True)

    pdfs = sorted(args.src.glob("*.pdf"))
    if not pdfs:
        sys.exit(f"no PDFs in {args.src}")

    busway: dict[str, dict] = {}
    for pdf in pdfs:
        key = norm(pdf.stem)
        if "busway" in key:
            direction = "southbound" if "south" in key else "northbound"
            stations = SB_STATIONS if direction == "southbound" else NB_STATIONS
            m = extract_matrix(pdf, stations)
            busway[direction] = m
            out = args.fixtures / f"edsa-busway-{direction}.json"
            out.write_text(json.dumps({"source": pdf.name, **m}, indent=1) + "\n")
            print(f"{pdf.name}: {direction} {len(stations)} stations -> {out}")
            continue
        for kw, mode_id in KM_TABLES.items():
            if kw in key:
                rows = extract_km_table(pdf)
                if not rows:
                    sys.exit(f"{pdf.name}: no rows parsed")
                out = args.fixtures / f"{mode_id}.json"
                out.write_text(json.dumps({"source": pdf.name, "mode": mode_id, "rows": rows}, indent=1) + "\n")
                print(f"{pdf.name}: {len(rows)} rows ({rows[0]['km']}-{rows[-1]['km']} km) -> {out}")
                break
        else:
            print(f"{pdf.name}: notice-only document, nothing tabular to extract")

    if len(busway) == 2:
        out = args.fares / "edsa-busway.json"
        existing = json.loads(out.read_text()) if out.exists() else {}
        # Southbound first: the UI shows directions in file order.
        existing["directions"] = {d: busway[d] for d in ("southbound", "northbound")}
        out.write_text(json.dumps(existing, indent=1) + "\n")
        print(f"wrote {out}")


if __name__ == "__main__":
    main()
