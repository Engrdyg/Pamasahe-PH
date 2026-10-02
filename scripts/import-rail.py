#!/usr/bin/env python3
"""Rail (MRT/LRT) fare matrices transcribed from the official 2026 fare-matrix
images (DOTr MRT-3 and LRTA LRT-2, both 50% discounted for all riders from
March 23, 2026). Writes fares/<line>.json and fixtures/<line>-*.json.

Each matrix is checked before writing: it must be symmetric, and the
discounted LRT-2 single-journey fares must equal the pre-discount fares
halved and rounded half up; MRT-3 must follow its station-count tiers.
Rerun after correcting any value: python3 scripts/import-rail.py
"""
from __future__ import annotations

import json
from pathlib import Path

MRT3_STATIONS = [
    "North Avenue", "Quezon Avenue", "GMA Kamuning", "Araneta Center-Cubao", "Santolan-Annapolis",
    "Ortigas", "Shaw Boulevard", "Boni", "Guadalupe", "Buendia", "Ayala", "Magallanes", "Taft Avenue",
]
# DOTr MRT-3 "50% discounted fare for all", starting March 23, 2026 (SJT, Beep, cashless)
MRT3 = [
    [0, 6, 6, 8, 8, 10, 10, 10, 12, 12, 12, 14, 14],
    [6, 0, 6, 6, 8, 8, 10, 10, 10, 12, 12, 12, 14],
    [6, 6, 0, 6, 6, 8, 8, 10, 10, 10, 12, 12, 12],
    [8, 6, 6, 0, 6, 6, 8, 8, 10, 10, 10, 12, 12],
    [8, 8, 6, 6, 0, 6, 6, 8, 8, 10, 10, 10, 12],
    [10, 8, 8, 6, 6, 0, 6, 6, 8, 8, 10, 10, 10],
    [10, 10, 8, 8, 6, 6, 0, 6, 6, 8, 8, 10, 10],
    [10, 10, 10, 8, 8, 6, 6, 0, 6, 6, 8, 8, 10],
    [12, 10, 10, 10, 8, 8, 6, 6, 0, 6, 6, 8, 8],
    [12, 12, 10, 10, 10, 8, 8, 6, 6, 0, 6, 6, 8],
    [12, 12, 12, 10, 10, 10, 8, 8, 6, 6, 0, 6, 6],
    [14, 12, 12, 12, 10, 10, 10, 8, 8, 6, 6, 0, 6],
    [14, 14, 12, 12, 12, 10, 10, 10, 8, 8, 6, 6, 0],
]
MRT3_TIERS = {1: 6, 2: 6, 3: 8, 4: 8, 5: 10, 6: 10, 7: 10, 8: 12, 9: 12, 10: 12, 11: 14, 12: 14}

LRT2_STATIONS = [
    "Recto", "Legarda", "Pureza", "V. Mapa", "J. Ruiz", "Gilmore", "Betty Go-Belmonte",
    "Araneta Center-Cubao", "Anonas", "Katipunan", "Santolan", "Marikina-Pasig", "Antipolo",
]
# LRTA 2026 single journey, discounted 50%
LRT2_SJT = [
    [0, 8, 10, 10, 10, 13, 13, 13, 13, 15, 15, 18, 18],
    [8, 0, 8, 10, 10, 10, 13, 13, 13, 13, 15, 15, 18],
    [10, 8, 0, 8, 10, 10, 10, 10, 13, 13, 15, 15, 15],
    [10, 10, 8, 0, 8, 10, 10, 10, 10, 13, 13, 15, 15],
    [10, 10, 10, 8, 0, 8, 10, 10, 10, 10, 13, 13, 15],
    [13, 10, 10, 10, 8, 0, 8, 10, 10, 10, 13, 13, 15],
    [13, 13, 10, 10, 10, 8, 0, 8, 10, 10, 10, 13, 13],
    [13, 13, 10, 10, 10, 10, 8, 0, 8, 10, 10, 13, 13],
    [13, 13, 13, 10, 10, 10, 10, 8, 0, 8, 10, 10, 13],
    [15, 13, 13, 13, 10, 10, 10, 10, 8, 0, 10, 10, 13],
    [15, 15, 15, 13, 13, 13, 10, 10, 10, 10, 0, 8, 10],
    [18, 15, 15, 15, 13, 13, 13, 13, 10, 10, 8, 0, 10],
    [18, 18, 15, 15, 15, 15, 13, 13, 13, 13, 10, 10, 0],
]
# LRTA 2026 stored value (Beep), discounted 50%; diagonal (6.50) is the boarding fee, unused
LRT2_SV = [
    [6.50, 7.50, 8.00, 9.00, 9.50, 10.50, 11.00, 11.50, 12.50, 13.00, 14.00, 15.50, 16.50],
    [7.50, 6.50, 7.50, 8.50, 9.00, 9.50, 10.50, 11.00, 12.00, 12.50, 13.50, 14.50, 16.00],
    [8.00, 7.50, 6.50, 7.50, 8.00, 9.00, 9.50, 10.00, 11.00, 11.50, 13.00, 14.00, 15.00],
    [9.00, 8.50, 7.50, 6.50, 7.50, 8.00, 8.50, 9.50, 10.00, 11.00, 12.00, 13.00, 14.50],
    [9.50, 9.00, 8.00, 7.50, 6.50, 7.00, 8.00, 8.50, 9.50, 10.00, 11.00, 12.00, 13.50],
    [10.50, 9.50, 9.00, 8.00, 7.00, 6.50, 7.50, 8.00, 9.00, 9.50, 10.50, 11.50, 13.00],
    [11.00, 10.50, 9.50, 8.50, 8.00, 7.50, 6.50, 7.50, 8.00, 9.00, 10.00, 11.00, 12.50],
    [11.50, 11.00, 10.00, 9.50, 8.50, 8.00, 7.50, 6.50, 7.50, 8.00, 9.50, 10.50, 11.50],
    [12.50, 12.00, 11.00, 10.00, 9.50, 9.00, 8.00, 7.50, 6.50, 7.00, 8.50, 9.50, 11.00],
    [13.00, 12.50, 11.50, 11.00, 10.00, 9.50, 9.00, 8.00, 7.00, 6.50, 8.00, 9.00, 10.50],
    [14.00, 13.50, 13.00, 12.00, 11.00, 10.50, 10.00, 9.50, 8.50, 8.00, 6.50, 7.50, 9.00],
    [15.50, 14.50, 14.00, 13.00, 12.00, 11.50, 11.00, 10.50, 9.50, 9.00, 7.50, 6.50, 8.00],
    [16.50, 16.00, 15.00, 14.50, 13.50, 13.00, 12.50, 11.50, 11.00, 10.50, 9.00, 8.00, 6.50],
]
# LRTA single journey before the 50% discount (the "old" fare)
LRT2_SJT_OLD = [
    [0, 15, 20, 20, 20, 25, 25, 25, 25, 30, 30, 35, 35],
    [15, 0, 15, 20, 20, 20, 25, 25, 25, 25, 30, 30, 35],
    [20, 15, 0, 15, 20, 20, 20, 20, 25, 25, 30, 30, 30],
    [20, 20, 15, 0, 15, 20, 20, 20, 20, 25, 25, 30, 30],
    [20, 20, 20, 15, 0, 15, 20, 20, 20, 20, 25, 25, 30],
    [25, 20, 20, 20, 15, 0, 15, 20, 20, 20, 25, 25, 30],
    [25, 25, 20, 20, 20, 15, 0, 15, 20, 20, 20, 25, 25],
    [25, 25, 20, 20, 20, 20, 15, 0, 15, 20, 20, 25, 25],
    [25, 25, 25, 20, 20, 20, 20, 15, 0, 15, 20, 20, 25],
    [30, 25, 25, 25, 20, 20, 20, 20, 15, 0, 20, 20, 25],
    [30, 30, 30, 25, 25, 25, 20, 20, 20, 20, 0, 15, 20],
    [35, 30, 30, 30, 25, 25, 25, 25, 20, 20, 15, 0, 20],
    [35, 35, 30, 30, 30, 30, 25, 25, 25, 25, 20, 20, 0],
]


def check_square(name: str, m: list[list[float]], n: int) -> None:
    assert len(m) == n, f"{name}: {len(m)} rows, expected {n}"
    for i, row in enumerate(m):
        assert len(row) == n, f"{name}: row {i} has {len(row)} cells"
        for j in range(n):
            assert m[i][j] == m[j][i], f"{name}: not symmetric at ({i},{j}): {m[i][j]} vs {m[j][i]}"


def half_up(v: float) -> int:
    return int(v / 2 + 0.5)


def matrix(regular: list[list[float]], n: int, discount_pct: int) -> dict:
    """Upper-triangular (i<j) regular and 20%-off matrices, null elsewhere."""
    reg = [[(regular[i][j] if i < j else None) for j in range(n)] for i in range(n)]
    disc = [[(round(regular[i][j] * (100 - discount_pct) / 100, 2) if i < j else None) for j in range(n)] for i in range(n)]
    return {"regular": reg, "discounted": disc}


def main() -> None:
    n = 13
    check_square("MRT-3", MRT3, n)
    for i in range(n):
        for j in range(n):
            if i != j:
                assert MRT3[i][j] == MRT3_TIERS[abs(i - j)], f"MRT-3 ({i},{j}) {MRT3[i][j]} != tier {MRT3_TIERS[abs(i-j)]}"
    check_square("LRT-2 SJT", LRT2_SJT, n)
    check_square("LRT-2 SV", LRT2_SV, n)
    check_square("LRT-2 SJT old", LRT2_SJT_OLD, n)
    for i in range(n):
        for j in range(n):
            if i != j:
                assert LRT2_SJT[i][j] == half_up(LRT2_SJT_OLD[i][j]), f"LRT-2 SJT ({i},{j}) {LRT2_SJT[i][j]} != half of {LRT2_SJT_OLD[i][j]}"

    fares = Path("fares")
    fixtures = Path("fixtures")

    def mode(id, en, fil, source, source_url, effective, stations, products, notes_en, notes_fil, extra=None):
        d = {
            "id": id, "name": {"en": en, "fil": fil}, "category": "rail", "method": "MATRIX", "kind": "ticket",
            "effective": effective, "source": source, "sourceUrl": source_url, "sourceDoc": f"{source} fare matrix (2026)",
            "minFare": {"regular": min(v for p in products.values() for row in p["regular"] for v in row if v), "discounted": None},
            "discountPct": 20,
            "notes": {"en": notes_en, "fil": notes_fil},
            "directions": {},
        }
        d["minFare"]["discounted"] = round(d["minFare"]["regular"] * 0.8, 2)
        for key, p in products.items():
            d["directions"][key] = {"stations": stations, **p}
        if extra:
            d.update(extra)
        (fares / f"{id}.json").write_text(json.dumps(d, indent=1, ensure_ascii=False) + "\n")
        for key, p in products.items():
            (fixtures / f"{id}-{key}.json").write_text(json.dumps({"source": d["sourceDoc"], "stations": stations, **p}, indent=1) + "\n")

    mode(
        "mrt-3", "MRT-3", "MRT-3", "DOTr MRT-3", "https://dotrmrt3.gov.ph", "2026-03-23", MRT3_STATIONS,
        {"single-journey": matrix(MRT3, n, 20), "stored-value": matrix(MRT3, n, 20)},
        "50% discounted fare for all riders since March 23, 2026 (same price for single journey, Beep and cashless). Student / senior / PWD 20% is computed from it; the station may round differently.",
        "50% diskwento para sa lahat simula March 23, 2026 (pareho ang presyo ng single journey, Beep at cashless). Kinuwenta ang 20% ng estudyante / senior / PWD mula rito; maaaring iba ang pag-round sa istasyon.",
    )
    sjt = matrix(LRT2_SJT, n, 20)
    sjt["previous"] = {"regular": [[(LRT2_SJT_OLD[i][j] if i < j else None) for j in range(n)] for i in range(n)]}
    mode(
        "lrt-2", "LRT-2", "LRT-2", "LRTA", "https://www.lrta.gov.ph/lrt-2-fare-adjustment/", "2026-03-23", LRT2_STATIONS,
        {"single-journey": sjt, "stored-value": matrix(LRT2_SV, n, 20)},
        "50% discounted fares since March 23, 2026. Based on a ₱13.29 boarding fee + ₱1.21/km distance fee as validated by LRTA. Student / senior / PWD 20% is computed; the station may round differently.",
        "50% diskwento simula March 23, 2026. Batay sa ₱13.29 boarding fee + ₱1.21/km na distance fee ayon sa LRTA. Kinuwenta ang 20% ng estudyante / senior / PWD; maaaring iba ang pag-round sa istasyon.",
    )
    # LRT-1: no official matrix received yet
    (fares / "lrt-1.json").write_text(json.dumps({
        "id": "lrt-1", "name": {"en": "LRT-1", "fil": "LRT-1"}, "category": "rail", "method": "MATRIX", "kind": "ticket",
        "effective": "2026-03-23", "source": "LRMC", "status": "pending_data", "minFare": {"regular": 0, "discounted": 0},
        "notes": {"en": "Awaiting the official LRT-1 fare matrix.", "fil": "Hinihintay ang opisyal na fare matrix ng LRT-1."},
        "directions": {},
    }, indent=1, ensure_ascii=False) + "\n")

    manifest = json.loads((fares / "manifest.json").read_text())
    for m in ["lrt-1", "lrt-2", "mrt-3"]:
        if m not in manifest["modes"]:
            manifest["modes"].append(m)
    (fares / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
    print("rail OK: mrt-3, lrt-2 written; lrt-1 pending; manifest updated")


if __name__ == "__main__":
    main()
