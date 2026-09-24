"""Tez fetch — pastki qatorlar (2-3), yengil query: binolar + asosiy yollar. Main bilan parallel."""
import json, os, sys, time, urllib.request, urllib.parse

OVERPASS = "https://overpass.kumi.systems/api/interpreter"
S = 41.5225; W = 60.5848; N = 41.5879; E = 60.6758
ROWS = COLS = 4
OUT = "public/data/tiles"

def fetch(q, timeout=75):
    data = urllib.parse.urlencode({"data": q}).encode()
    req = urllib.request.Request(OVERPASS, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())

def tile_bbox(r, c):
    return (S + (N - S) * r / ROWS, W + (E - W) * c / COLS,
            S + (N - S) * (r + 1) / ROWS, W + (E - W) * (c + 1) / COLS)

if __name__ == "__main__":
    r0, r1 = int(sys.argv[1]), int(sys.argv[2])
    os.makedirs(OUT, exist_ok=True)
    for r in range(r0, r1 + 1):
        for c in range(COLS):
            fn = f"{OUT}/t_{r}_{c}.json"
            if os.path.exists(fn) and os.path.getsize(fn) > 1000:
                print(f"skip t_{r}_{c}", flush=True); continue
            s, w, n, e = tile_bbox(r, c)
            try:
                b = fetch(f"[out:json][timeout:55];(nwr({s},{w},{n},{e})[building];);out tags center 4000;")
                bels = [x for x in b.get("elements", []) if x["type"] != "count"]
                rw = fetch(f"[out:json][timeout:55];(way({s},{w},{n},{e})[highway~'^(motorway|trunk|primary|secondary|tertiary|residential|living_street|service)$'];);out geom 1500;")
                wels = [x for x in rw.get("elements", []) if x["type"] == "way"]
                json.dump({"bbox": [s, w, n, e], "buildings": bels, "roads": wels, "water": []},
                          open(fn, "w"), ensure_ascii=False)
                print(f"OK t_{r}_{c}: b={len(bels)} r={len(wels)}", flush=True)
            except Exception as ex:
                print("FAIL", r, c, str(ex)[:120], flush=True)
            time.sleep(5)
    print("DONE", flush=True)
