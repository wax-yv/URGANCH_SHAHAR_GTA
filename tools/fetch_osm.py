"""Faza-0: OSM fetch — Urganch markaz tile test."""
import json, sys, urllib.request, urllib.parse

OVERPASS = "https://overpass.kumi.systems/api/interpreter"
# markaz 2x2km test: 41.5417,60.6212,41.5617,60.6412
BBOX_TEST = (41.5417, 60.6212, 41.5617, 60.6412)

def fetch(q):
    data = urllib.parse.urlencode({"data": q}).encode()
    req = urllib.request.Request(OVERPASS, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())

def count_buildings(bbox):
    s, w, n, e = bbox
    q = f"[out:json][timeout:40];(nwr({s},{w},{n},{e})[building];);out tags center 2000;"
    j = fetch(q)
    els = [x for x in j.get("elements", []) if x["type"] != "count"]
    return els

if __name__ == "__main__":
    els = count_buildings(BBOX_TEST)
    print(f"BUILDINGS_TEST={len(els)}")
    named = [x for x in els if x.get("tags", {}).get("name")]
    print(f"NAMED={len(named)}")
    for x in named[:10]:
        t = x.get("tags", {})
        print("-", t.get("name"), "|", t.get("building"), "|", x.get("center") or {k: x.get(k) for k in ("lat", "lon") if k in x})
    with open("data/sample_buildings.json", "w") as f:
        json.dump(els[:500], f, ensure_ascii=False)
    print("SAVED data/sample_buildings.json")
