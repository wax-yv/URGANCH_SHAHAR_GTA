"""POI yetmaganlarni toldirish: bank/shop/food."""
import json, time, urllib.request, urllib.parse

OVERPASS = "https://overpass.private.coffee/api/interpreter"
S = 41.5225; W = 60.5848; N = 41.5879; E = 60.6758
OUT = "public/data/poi.json"
Q = {
    "bank": f"(nwr({S},{W},{N},{E})[amenity=bank];);out tags center 500;",
    "shop": f"(nwr({S},{W},{N},{E})[shop];);out tags center 1500;",
    "food": f"(nwr({S},{W},{N},{E})[amenity~'^(restaurant|cafe|fast_food)$'];);out tags center 800;",
}

def fetch(q):
    data = urllib.parse.urlencode({"data": "[out:json][timeout:70];" + q}).encode()
    req = urllib.request.Request(OVERPASS, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=85) as r:
        return json.loads(r.read().decode())

if __name__ == "__main__":
    allp = json.load(open(OUT))
    for k, q in Q.items():
        if allp.get(k):
            print(f"skip {k} ({len(allp[k])})", flush=True); continue
        for a in (1, 2, 3):
            try:
                j = fetch(q)
                els = [x for x in j.get("elements", []) if x["type"] != "count"]
                allp[k] = els
                print(f"OK {k}: {len(els)}", flush=True)
                break
            except Exception as ex:
                print(f"RETRY {k} a{a}: {str(ex)[:90]}", flush=True); time.sleep(20)
        time.sleep(10)
    json.dump(allp, open(OUT, "w"), ensure_ascii=False)
    print("SAVED", {k: len(v) for k, v in allp.items()}, flush=True)
