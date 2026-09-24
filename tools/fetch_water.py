"""Suv qatlami — markaziy 4 tile uchun waterway/natural=water (kichik query)."""
import json, os, time, urllib.request, urllib.parse

EPS = [
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
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
    for r in range(4):
        for c in range(4):
            fn = f"{OUT}/t_{r}_{c}.json"
            if not os.path.exists(fn):
                continue
            d = json.load(open(fn))
            if d.get("water"):
                continue
            s = S + (N - S) * r / 4; n = S + (N - S) * (r + 1) / 4
            w = W + (E - W) * c / 4; e = W + (E - W) * (c + 1) / 4
            try:
                j = fetch(f"[out:json][timeout:60];(way({s},{w},{n},{e})[waterway];way({s},{w},{n},{e})[natural=water];);out geom 300;")
                els = [x for x in j.get("elements", []) if x["type"] != "count"]
                if els:
                    d["water"] = els
                    json.dump(d, open(fn, "w"), ensure_ascii=False)
                    print(f"OK water t_{r}_{c}: {len(els)}", flush=True)
                else:
                    print(f"empty t_{r}_{c}", flush=True)
            except Exception as ex:
                print(f"FAIL water t_{r}_{c}: {str(ex)[:80]}", flush=True)
            time.sleep(12)
    print("DONE", flush=True)
