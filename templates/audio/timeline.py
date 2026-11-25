# Generic picture timeline for the sound scripts. Nothing in here is specific to one short: every timing comes from
# shots.json, which scripts/story_shots.py writes from the short's story.ts (FPS, TOTAL, SHOTS, XFADE, FLASH_AT and
# every numeric `const` in the file). Story-specific events (impacts, footfalls, camera distances...) live in
# events.py next to this file, which is the part you rewrite for each new short.
#
# Where shots.json is looked up, first hit wins:
#   1. $SHORT_SHOTS (path to a shots.json)
#   2. <project folder>/shots.json   (the folder above audio/, e.g. ~/<name>-short/shots.json)
#   3. audio/shots.json              (next to this file)
import json
import math
import os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def _find_shots():
    for p in (os.environ.get("SHORT_SHOTS"), os.path.join(ROOT, "shots.json"), os.path.join(HERE, "shots.json")):
        if p and os.path.exists(p):
            return p
    raise FileNotFoundError(
        "timeline.py: no shots.json found. Lock the picture, then run "
        "`python scripts/story_shots.py src/videos/<name>/story.ts <project folder>/shots.json` in the Remotion project, "
        "or point $SHORT_SHOTS at the file.")


SHOTS_PATH = _find_shots()
_meta = json.load(open(SHOTS_PATH, encoding="utf-8"))

FPS = int(_meta.get("fps", 30))
TOTAL = int(_meta["total"])
DUR = TOTAL / FPS
fr = lambda f: f / FPS

CONST = _meta.get("const", {})                      # every numeric `const NAME = value` in story.ts
# id -> {"a": first frame, "b": end frame, plus any string fields of the shot (e.g. light, crowd)}
SHOTS = {s["id"]: s for s in _meta["shots"]}
XFADE = {int(k): v for k, v in _meta.get("xfade_frames", {}).items()}   # shot id -> crossfade length (frames)
FLASH = fr(_meta["flash"][0]) if _meta.get("flash") else None          # white flash start (s), or None
FIRST, LAST = min(SHOTS), max(SHOTS)


def shot_t(i):
    s = SHOTS[i]
    return fr(s["a"]), fr(s["b"])


def shot_at(t):
    f = t * FPS
    for i, s in SHOTS.items():
        if s["a"] <= f < s["b"]:
            return i
    return LAST


def field(i, key, default=None):
    """a string field of shot i from story.ts, e.g. field(3, "crowd")"""
    return SHOTS[i].get(key, default)


# ------------------------------------------------------------------ small shared helpers
def lin(pts, x):
    return float(np.interp(x, [p[0] for p in pts], [p[1] for p in pts]))


_lin = lin


def hh(i, s=0):
    """same hash as cast.ts (IEEE doubles, so it reproduces the JS values)"""
    v = math.sin(i * 127.1 + s * 311.7) * 43758.5453
    return v - math.floor(v)


def easeout(u):
    u = min(1.0, max(0.0, u))
    return 1 - (1 - u) ** 4


def dist_fx(d):
    """camera distance (m) -> (gain dB, low-pass Hz, reverb send) for sounds placed in the world"""
    d = max(d, 3.5)
    g = -14.0 * math.log10(d / 3.5)
    lpf = float(np.clip(17000 * (3.5 / d) ** 0.55, 1800, 17000))
    send = 0.06 + 0.45 * float(np.clip(math.log(d / 3.5) / math.log(25), 0, 1))
    return g, lpf, send


def words(path):
    return json.load(open(path, encoding="utf-8"))
