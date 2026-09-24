"""Full 7.2x7.6 fetch — 4x4 tile, har biri ~1.8km. Overpass kumi."""
import json, os, time, urllib.request, urllib.parse

OVERPASS = "https://overpass.kumi.systems/api/interpreter"
S = 41.5225; W = 60.5848; N = 41.5879; E = 60.6758
ROWS = COLS = 4
OUT = "public/data/tiles"

def fetch(q, timeout=70):
    data = urllib.parse.urlencode({"data": q}).encode()
    req = urllib.request.Request(OVERPASS, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())

def tile_bbox(r, c):
    s = S + (N - S) * r / ROWS
    n = S + (N - S) * (r + 1) / ROWS
    w = W + (E - W) * c / COLS
    e = W + (E - W) * (c + 1) / COLS
    return s, w, n, e

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    total_b = 0
    for r in range(ROWS):
        for c in range(COLS):
            s, w, n, e = tile_bbox(r, c)
            fn = f"{OUT}/t_{r}_{c}.json"
            if os.path.exists(fn) and os.path.getsize(fn) > 1000:
                print(f"skip t_{r}_{c}"); continue
            try:
                qb = f"[out:json][timeout:60];(nwr({s},{w},{n},{e})[building];);out tags center 4000;"
                b = fetch(qb)
                bels = [x for x in b.get("elements", []) if x["type"] != "count"]
                qr = f"[out:json][timeout:60];(way({s},{w},{n},{e})[highway];);out geom 3000;"
                try:
                    rw = fetch(qr)
                    wels = [x for x in rw.get("elements", []) if x["type"] == "way"]
                except Exception as ex:
                    print("road fail", r, c, ex); wels = []
                qw = f"[out:json][timeout:60];(nwr({s},{w},{n},{e})[natural=water];way({s},{w},{n},{e})[waterway];);out geom center 500;"
                try:
                    ww = fetch(qw)
                    wa = [x for x in ww.get("elements", []) if x["type"] != "count"]
                except Exception:
                    wa = []
                json.dump({"bbox": [s, w, n, e], "buildings": bels, "roads": wels, "water": wa},
                          open(fn, "w"), ensure_ascii=False)
                total_b += len(bels)
                print(f"OK t_{r}_{c}: b={len(bels)} r={len(wels)} w={len(wa)} total_b={total_b}")
            except Exception as ex:
                print("FAIL", r, c, ex)
            time.sleep(3)
    print("DONE total_b~", total_b)
