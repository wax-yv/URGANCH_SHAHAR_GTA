"""POI qatlam: parking, maktab, bank, dokon, restoran — main fetch tugagach ishga tushadi."""
import json, os, time, urllib.request, urllib.parse

OVERPASS = "https://overpass.kumi.systems/api/interpreter"
S = 41.5225; W = 60.5848; N = 41.5879; E = 60.6758
OUT = "public/data/poi.json"

QUERIES = {
    "parking": f"(nwr({S},{W},{N},{E})[amenity=parking];);out geom center 800;",
    "school": f"(nwr({S},{W},{N},{E})[amenity=school];);out tags center 500;",
    "bank": f"(nwr({S},{W},{N},{E})[amenity=bank];);out tags center 500;",
    "shop": f"(nwr({S},{W},{N},{E})[shop];);out tags center 1500;",
    "food": f"(nwr({S},{W},{N},{E})[amenity~'^(restaurant|cafe|fast_food)$'];);out tags center 800;",
    "hospital": f"(nwr({S},{W},{N},{E})[amenity~'^(hospital|clinic|pharmacy)$'];);out tags center 500;",
}

def fetch(q):
    data = urllib.parse.urlencode({"data": "[out:json][timeout:60];" + q}).encode()
    req = urllib.request.Request(OVERPASS, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=75) as r:
        return json.loads(r.read().decode())

if __name__ == "__main__":
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    allp = {}
    for k, q in QUERIES.items():
        try:
            j = fetch(q)
            els = [x for x in j.get("elements", []) if x["type"] != "count"]
            allp[k] = els
            print(f"OK {k}: {len(els)}")
        except Exception as ex:
            print("FAIL", k, ex); allp[k] = []
        time.sleep(4)
    json.dump(allp, open(OUT, "w"), ensure_ascii=False)
    print("SAVED", OUT)
