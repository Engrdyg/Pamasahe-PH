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

LRT1_STATIONS = [
    "Dr. Santos", "Ninoy Aquino Avenue", "PITX", "MIA Road", "Redemptorist-Aseana", "Baclaran", "EDSA", "Libertad",
    "Gil Puyat", "Vito Cruz", "Quirino", "Pedro Gil", "UN Avenue", "Central", "Carriedo", "D. Jose", "Bambang",
    "Tayuman", "Blumentritt", "Abad Santos", "R. Papa", "5th Avenue", "Monumento", "Balintawak", "Fernando Poe Jr.",
]
# LRMC "New LRT-1 Stored Value Fare Matrix", effective April 2, 2025 (diagonal 16 = boarding fare, unused)
LRT1_SV = [
    [16, 19, 20, 22, 23, 26, 27, 28, 29, 31, 32, 33, 34, 36, 37, 38, 39, 40, 41, 42, 43, 45, 46, 49, 52],
    [19, 16, 18, 20, 21, 23, 24, 26, 27, 28, 29, 31, 32, 33, 35, 36, 36, 37, 38, 40, 41, 42, 44, 47, 50],
    [20, 18, 16, 18, 19, 22, 22, 24, 25, 27, 28, 29, 30, 32, 33, 34, 35, 36, 37, 38, 39, 40, 42, 45, 48],
    [22, 20, 18, 16, 17, 20, 20, 22, 23, 25, 26, 27, 28, 30, 31, 32, 33, 34, 35, 36, 37, 38, 40, 43, 46],
    [23, 21, 19, 17, 16, 18, 19, 21, 22, 23, 25, 26, 27, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 42, 45],
    [26, 23, 22, 20, 18, 16, 17, 19, 20, 21, 22, 24, 25, 27, 28, 29, 30, 30, 31, 33, 34, 35, 37, 40, 43],
    [27, 24, 22, 20, 19, 17, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 39, 42],
    [28, 26, 24, 22, 21, 19, 18, 16, 17, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 33, 34, 38, 40],
    [29, 27, 25, 23, 22, 20, 19, 17, 16, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30, 32, 33, 37, 39],
    [31, 28, 27, 25, 23, 21, 20, 19, 18, 16, 17, 19, 20, 22, 23, 24, 25, 25, 26, 28, 29, 30, 32, 35, 38],
    [32, 29, 28, 26, 25, 22, 22, 20, 19, 17, 16, 17, 19, 20, 21, 22, 23, 24, 25, 27, 28, 29, 31, 34, 37],
    [33, 31, 29, 27, 26, 24, 23, 21, 20, 19, 17, 16, 17, 19, 20, 21, 22, 23, 24, 25, 26, 28, 29, 33, 35],
    [34, 32, 30, 28, 27, 25, 24, 22, 21, 20, 19, 17, 16, 18, 19, 20, 21, 22, 23, 24, 25, 27, 28, 32, 34],
    [36, 33, 32, 30, 29, 27, 26, 24, 23, 22, 20, 19, 18, 16, 17, 18, 19, 20, 21, 23, 23, 25, 27, 30, 33],
    [37, 35, 33, 31, 30, 28, 27, 25, 24, 23, 21, 20, 19, 17, 16, 17, 18, 19, 20, 21, 22, 24, 25, 29, 31],
    [38, 36, 34, 32, 31, 29, 28, 26, 25, 24, 22, 21, 20, 18, 17, 16, 17, 18, 19, 20, 21, 23, 24, 28, 30],
    [39, 36, 35, 33, 32, 30, 29, 27, 26, 25, 23, 22, 21, 19, 18, 17, 16, 17, 18, 20, 20, 22, 23, 27, 30],
    [40, 37, 36, 34, 33, 30, 30, 28, 27, 25, 24, 23, 22, 20, 19, 18, 17, 16, 17, 19, 20, 21, 23, 26, 29],
    [41, 38, 37, 35, 34, 31, 31, 29, 28, 26, 25, 24, 23, 21, 20, 19, 18, 17, 16, 18, 19, 20, 22, 25, 28],
    [42, 40, 38, 36, 35, 33, 32, 30, 29, 28, 27, 25, 24, 23, 21, 20, 20, 19, 18, 16, 17, 19, 20, 24, 26],
    [43, 41, 39, 37, 36, 34, 33, 31, 30, 29, 28, 26, 25, 23, 22, 21, 20, 20, 19, 17, 16, 18, 19, 23, 25],
    [45, 42, 40, 38, 37, 35, 34, 33, 32, 30, 29, 28, 27, 25, 24, 23, 22, 21, 20, 19, 18, 16, 18, 21, 24],
    [46, 44, 42, 40, 39, 37, 36, 34, 33, 32, 31, 29, 28, 27, 25, 24, 23, 23, 22, 20, 19, 18, 16, 20, 22],
    [49, 47, 45, 43, 42, 40, 39, 38, 37, 35, 34, 33, 32, 30, 29, 28, 27, 26, 25, 24, 23, 21, 20, 16, 19],
    [52, 50, 48, 46, 45, 43, 42, 40, 39, 38, 37, 35, 34, 33, 31, 30, 30, 29, 28, 26, 25, 24, 22, 19, 16],
]
# Single journey = stored value rounded up to the next ₱5 (checked against the SJT image)
LRT1_SJT_SPOT = {(0, 1): 20, (0, 24): 55, (0, 3): 25, (0, 9): 35, (0, 13): 40, (0, 18): 45, (0, 22): 50,
                 (7, 22): 35, (13, 24): 35, (14, 23): 30, (16, 17): 20, (17, 24): 30, (21, 23): 25, (22, 24): 25,
                 (22, 23): 20, (9, 17): 25, (2, 3): 20, (5, 6): 20}


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

    check_square("LRT-1 SV", LRT1_SV, 25)
    LRT1_SJT = [[(0 if i == j else -(-LRT1_SV[i][j] // 5) * 5) for j in range(25)] for i in range(25)]
    for (i, j), v in LRT1_SJT_SPOT.items():
        assert LRT1_SJT[i][j] == v, f"LRT-1 SJT ({i},{j}) derived {LRT1_SJT[i][j]} != image {v}"
    for i in range(25):
        for j in range(i + 1, 25):
            # fares never decrease when the trip gets longer along the line
            if j + 1 < 25:
                assert LRT1_SV[i][j] <= LRT1_SV[i][j + 1], f"LRT-1 SV row {i}: {LRT1_SV[i][j]} > {LRT1_SV[i][j+1]} at {j}"

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
    mode(
        "lrt-1", "LRT-1", "LRT-1", "LRMC", "https://lrmc.ph", "2025-04-02", LRT1_STATIONS,
        {"single-journey": matrix(LRT1_SJT, 25, 20), "stored-value": matrix(LRT1_SV, 25, 20)},
        "LRMC fare matrix effective April 2, 2025 (Dr. Santos to Fernando Poe Jr.). LRT-1 is not covered by the DOTr 50% discount. Student / senior / PWD 20% is computed; the station may round differently.",
        "Fare matrix ng LRMC epektibo April 2, 2025 (Dr. Santos hanggang Fernando Poe Jr.). Hindi sakop ng 50% diskwento ng DOTr ang LRT-1. Kinuwenta ang 20% ng estudyante / senior / PWD; maaaring iba ang pag-round sa istasyon.",
    )

    manifest = json.loads((fares / "manifest.json").read_text())
    for m in ["lrt-1", "lrt-2", "mrt-3"]:
        if m not in manifest["modes"]:
            manifest["modes"].append(m)
    (fares / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
    print("rail OK: lrt-1, lrt-2, mrt-3 written; manifest updated")


if __name__ == "__main__":
    main()
