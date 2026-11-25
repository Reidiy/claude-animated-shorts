# Writes shots.json from a short's story.ts: fps, total frames, shots (frame ranges + their string fields such as
# light/crowd), crossfade windows, the white flash, planned hard cuts and kicks, and every numeric constant.
# scripts/short_qa.py reads it to ignore planned cuts/flashes, and the sound scripts (audio/timeline.py) read it so
# every sound lands on the picture without copying timings by hand.
#
# Usage: python scripts/story_shots.py <story.ts> [out.json] [extra.ts ...]
#   out.json defaults to out/<name>/shots.json, where <name> is the folder story.ts lives in (src/videos/<name>/).
#   extra.ts files (e.g. cast.ts) only add their numeric constants, e.g. HITS = [59.79, 60.33].
import json, os, re, sys

if len(sys.argv) < 2:
    sys.exit(__doc__ or "usage: python scripts/story_shots.py <story.ts> [out.json] [extra.ts ...]")
story = sys.argv[1]
name = os.path.basename(os.path.dirname(os.path.abspath(story)))
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join("out", name, "shots.json")
src = open(story, encoding="utf-8").read()

NUM = r"-?\d+(?:\.\d+)?"


def constants(text):
    """numeric `const NAME = 1.5` (also comma lists `const A = 1, B = 2`) and numeric arrays `const N = [1, 2]`"""
    c = {}
    for decl in re.findall(r"^\s*(?:export\s+)?const\s+([^;\n]*)", text, re.M):
        for k, v in re.findall(rf"\b([A-Z][A-Z0-9_]*)\s*(?::[^=,]+)?=\s*({NUM})\s*(?=,|$)", decl):
            c[k] = float(v) if "." in v else int(v)
        for k, arr in re.findall(r"\b([A-Z][A-Z0-9_]*)\s*(?::[^=]+)?=\s*\[([^\[\]]*)\]", decl):
            items = [x.strip() for x in arr.split(",") if x.strip()]
            if items and all(re.fullmatch(NUM, x) for x in items):
                c[k] = [float(x) for x in items]
    return c


const = constants(src)
for extra in sys.argv[3:]:
    for k, v in constants(open(extra, encoding="utf-8").read()).items():
        const.setdefault(k, v)

fps = int(const.get("FPS", 30))
total = int(const["TOTAL"])
frame = lambda v: int(v) if re.fullmatch(r"\d+", v) else int(const[v])   # "130" or a constant name like TOTAL

shots = []
for body in re.findall(r"\{\s*id:\s*(\d+\s*,[^{}\n]*)\}", src[src.find("SHOTS"):]):
    m = re.match(r"(\d+)\s*,\s*a:\s*(\w+)\s*,\s*b:\s*(\w+)", body)
    if not m:
        continue
    s = {"id": int(m.group(1)), "a": frame(m.group(2)), "b": frame(m.group(3))}
    s.update({k: v for k, v in re.findall(r"(\w+):\s*\"([^\"]*)\"", body)})
    shots.append(s)
if not shots:
    sys.exit(f"no SHOTS entries like `{{ id: 1, a: 0, b: 130, ... }}` found in {story}")

m = re.search(r"XFADE[^=]*=\s*\{([^}]*)\}", src)
xf = {int(k): int(v) for k, v in re.findall(r"(\d+):\s*(\d+)", m.group(1))} if m else {}
xfade = [[s["a"] - xf[s["id"]] // 2, s["a"] + xf[s["id"]] // 2] for s in shots if s["id"] in xf]
flash = const.get("FLASH_AT")

# planned hard cuts inside shots (camera keys with cut: true) and kicks (impact flip-shakes, 7 frames + 1)
cuts = [[int(f), int(f)] for f in re.findall(r"\{\s*f:\s*(\d+),\s*cut:\s*true", src)]
kicks = []
m = re.search(r"const KICKS[^=]*=\s*\[(.*?)\];", src, re.S)
if m:
    for t0, _ in re.findall(r"\[\s*([\w.]+)\s*,\s*([\d.]+)\s*\]", m.group(1)):
        f0 = round((const[t0] if t0 in const else float(t0)) * fps)
        kicks.append([f0, f0 + 8])

meta = {"story": os.path.abspath(story), "fps": fps, "total": total, "shots": shots,
        "xfade": xfade, "xfade_frames": xf, "planned": cuts + kicks, "const": const}
if flash is not None:
    meta["flash"] = [int(flash), int(flash) + 4]
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
json.dump(meta, open(out, "w", encoding="utf-8"), indent=1)
print(out, "|", len(shots), "shots,", total, "frames @", fps, "fps | xfade", xfade, "| flash", flash,
      "| cuts", [c[0] for c in cuts], "| kicks", kicks)
