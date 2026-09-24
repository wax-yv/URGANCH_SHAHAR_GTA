"""Qayta urinish — FAIL bo'lgan tile'lar ro'yxati bilan."""
import json, os, sys, time, urllib.request, urllib.parse

OVERPASS = "https://overpass.kumi.systems/api/interpreter"
S = 41.5225; W = 60.5848; N = 41.5879; E = 60.6758
OUT = "public/data/tiles"

def fetch(q, timeout=90):
    data = urllib.parse.urlencode({"data": q}).encode()
    req = urllib.request.Request(OVERPASS, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())

if __name__ == "__main__":
    pairs = [tuple(map(int, p.split(","))) for p in sys.argv[1:]]
    os.makedirs(OUT, exist_ok=True)
    for r, c in pairs:
        fn = f"{OUT}/t_{r}_{c}.json"
        if os.path.exists(fn) and os.path.getsize(fn) > 1000:
            print(f"skip t_{r}_{c}", flush=True); continue
        s = S + (N - S) * r / 4; n = S + (N - S) * (r + 1) / 4
        w = W + (E - W) * c / 4; e = W + (E - W) * (c + 1) / 4
        ok = False
        for attempt in (1, 2, 3):
            try:
                b = fetch(f"[out:json][timeout:70];(nwr({s},{w},{n},{e})[building];);out tags center 4000;")
                bels = [x for x in b.get("elements", []) if x["type"] != "count"]
                rw = fetch(f"[out:json][timeout:70];(way({s},{w},{n},{e})[highway~'^(motorway|trunk|primary|secondary|tertiary|residential|living_street|service)$'];);out geom 1500;")
                wels = [x for x in rw.get("elements", []) if x["type"] == "way"]
                json.dump({"bbox": [s, w, n, e], "buildings": bels, "roads": wels, "water": []},
                          open(fn, "w"), ensure_ascii=False)
                print(f"OK t_{r}_{c}: b={len(bels)} r={len(wels)}", flush=True)
                ok = True; break
            except Exception as ex:
                print(f"RETRY t_{r}_{c} a{attempt}: {str(ex)[:100]}", flush=True)
                time.sleep(20)
        if not ok:
            print(f"GIVEUP t_{r}_{c}", flush=True)
        time.sleep(15)
    print("DONE", flush=True)
