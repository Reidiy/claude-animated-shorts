# Merge the look sandboxes (src/videos/<name>_<box>/) back into the main folder src/videos/<name>/, by owned files.
# Backs up main first (backup/<name>_<time>/), copies each sandbox's owned files, reports which owned files are
# missing or unchanged.
# Usage (from the Remotion project root, or set REMOTION_PROJECT):
#   python scripts/sandbox_merge.py <name> [cam,world,mat,char,post]
# The post box also owns the short's main component (<Name>.tsx): the one .tsx file in src/videos/<name>/, or set
# SHORT_MAIN=<File>.tsx when there are several.
import filecmp, glob, os, shutil, sys, time

if len(sys.argv) < 2 or sys.argv[1].startswith("-"):
    sys.exit("usage: python scripts/sandbox_merge.py <name> [cam,world,mat,char,post]")
name = sys.argv[1]
ROOT = os.path.abspath(os.path.expanduser(os.environ.get("REMOTION_PROJECT", ".")))
MAIN = os.path.join(ROOT, "src", "videos", name)
if not os.path.isdir(MAIN):
    sys.exit(f"no main folder {MAIN} (run from the Remotion project root or set REMOTION_PROJECT)")

main_tsx = os.environ.get("SHORT_MAIN")
if not main_tsx:
    tsx = sorted(os.path.basename(p) for p in glob.glob(os.path.join(MAIN, "*.tsx")))
    if len(tsx) != 1:
        sys.exit(f"found {tsx or 'no'} .tsx files in {MAIN}: set SHORT_MAIN=<File>.tsx")
    main_tsx = tsx[0]

OWN = {  # round 2 ownership of the bridge pass (round 1: world also owned paint/build, post owned grade)
    "cam": ["story.ts"],
    "world": ["world.ts", "lights.ts", "shade.ts", "grade.ts"],
    "mat": ["paint.ts", "build.ts"],
    "char": ["toon.ts", "cast.ts", "cardshade.ts"],
    "post": ["ink.ts", main_tsx, "lensblur.ts"],
}
which = sys.argv[2].split(",") if len(sys.argv) > 2 else list(OWN)
bad = [b for b in which if b not in OWN]
if bad:
    sys.exit(f"unknown sandbox {bad}; known: {', '.join(OWN)}")

bak = os.path.join(ROOT, "backup", time.strftime(f"{name}_%Y%m%d_%H%M%S"))
shutil.copytree(MAIN, bak)
print("backup ->", bak)
for box in which:
    src = os.path.join(ROOT, "src", "videos", f"{name}_{box}")
    for f in OWN[box]:
        a, b = os.path.join(src, f), os.path.join(MAIN, f)
        if not os.path.exists(a):
            print(f"  {box}: {f} not in sandbox (skipped)")
            continue
        if os.path.exists(b) and filecmp.cmp(a, b, shallow=False):
            print(f"  {box}: {f} unchanged")
            continue
        shutil.copy2(a, b)
        print(f"  {box}: {f} -> main")
