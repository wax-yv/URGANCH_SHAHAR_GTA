"""Qolgan tile'larni avtomatik topib yuklash — zanjir oxirgi halqa."""
import json, os, sys, time, urllib.request, urllib.parse

EPS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
S = 41.5225; W = 60.5848; N = 41.5879; E = 60.6758
OUT = "public/data/tiles"
epi = 0

def fetch(q, timeout=90):
    global epi
    last = None
    for _ in EPS:
        ep = EPS[epi % len(EPS)]; epi += 1
        try:
            data = urllib.parse.urlencode({"data": q}).encode()
            req = urllib.request.Request(ep, data=data, method="POST")
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode())
        except Exception as ex:
            last = ex
    raise last

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    missing = []
    for r in range(4):
        for c in range(4):
            fn = f"{OUT}/t_{r}_{c}.json"
            if not (os.path.exists(fn) and os.path.getsize(fn) > 1000):
                missing.append((r, c))
    print("MISSING:", missing, flush=True)
    for r, c in missing:
        fn = f"{OUT}/t_{r}_{c}.json"
        s = S + (N - S) * r / 4; n = S + (N - S) * (r + 1) / 4
        w = W + (E - W) * c / 4; e = W + (E - W) * (c + 1) / 4
        bels = []
        for a in (1, 2, 3):
            try:
                b = fetch(f"[out:json][timeout:70];(nwr({s},{w},{n},{e})[building];);out tags center 4000;")
                bels = [x for x in b.get("elements", []) if x["type"] != "count"]
                break
            except Exception as ex:
                print(f"RETRY-B t_{r}_{c} a{a}: {str(ex)[:90]}", flush=True); time.sleep(20)
        wels = []
        for a in (1, 2):
            try:
                rw = fetch(f"[out:json][timeout:70];(way({s},{w},{n},{e})[highway~'^(motorway|trunk|primary|secondary|tertiary|residential|living_street|service)$'];);out geom 1500;")
                wels = [x for x in rw.get("elements", []) if x["type"] == "way"]
                break
            except Exception as ex:
                print(f"RETRY-R t_{r}_{c} a{a}: {str(ex)[:90]}", flush=True); time.sleep(15)
        if bels:
            json.dump({"bbox": [s, w, n, e], "buildings": bels, "roads": wels, "water": []},
                      open(fn, "w"), ensure_ascii=False)
            print(f"OK t_{r}_{c}: b={len(bels)} r={len(wels)}", flush=True)
        else:
            print(f"GIVEUP t_{r}_{c}", flush=True)
        time.sleep(15)
    print("DONE", flush=True)
