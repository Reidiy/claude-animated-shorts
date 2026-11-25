# Create (or re-sync) the look-pass sandboxes of a short: copies src/videos/<name>/ to src/videos/<name>_<box>/ and
# writes a sandbox entry src/sandboxes/<box>/index.tsx that registers only that copy, under the same composition id
# as the main short. Re-run it after every merge (scripts/sandbox_merge.py) to re-sync all sandboxes from main.
# Usage (from the Remotion project root, or set REMOTION_PROJECT):
#   python scripts/make_sandboxes.py <name> [cam,world,mat,char,post] [--comp <CompositionId>]
# The main component is read from the one .tsx in src/videos/<name>/ (or SHORT_MAIN=<File>.tsx): its exported
# `React.FC` and its exported `*_FRAMES` constant. The composition id defaults to the component's name.
# Render a sandbox: SHORT_ENTRY=src/sandboxes/<box>/index.tsx node scripts/stills.mjs out/<name>/<box>/x_ 100,400 0.5
import glob, os, re, shutil, sys

args = [a for a in sys.argv[1:]]
comp = None
if "--comp" in args:
    i = args.index("--comp"); comp = args[i + 1]; del args[i:i + 2]
if not args:
    sys.exit("usage: python scripts/make_sandboxes.py <name> [cam,world,mat,char,post] [--comp <CompositionId>]")
name = args[0]
boxes = args[1].split(",") if len(args) > 1 else ["cam", "world", "mat", "char", "post"]
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
src = open(os.path.join(MAIN, main_tsx), encoding="utf-8").read()
fc = re.findall(r"export const (\w+): React\.FC\b", src)
frames = re.findall(r"export const (\w+_FRAMES)\b", src)
if len(fc) != 1 or len(frames) != 1:
    sys.exit(f"{main_tsx}: expected one exported React.FC and one exported *_FRAMES constant, found {fc} / {frames}")
fc, frames, mod = fc[0], frames[0], os.path.splitext(main_tsx)[0]
comp = comp or fc

for box in boxes:
    dst = os.path.join(ROOT, "src", "videos", f"{name}_{box}")
    shutil.copytree(MAIN, dst, dirs_exist_ok=True)
    entry = os.path.join(ROOT, "src", "sandboxes", box, "index.tsx")
    os.makedirs(os.path.dirname(entry), exist_ok=True)
    open(entry, "w", encoding="utf-8").write(
        f"// Sandbox entry for the look pass ({box}): renders only src/videos/{name}_{box}/. Written by scripts/make_sandboxes.py.\n"
        'import React from "react";\n'
        'import { Composition, registerRoot } from "remotion";\n'
        f'import {{ {fc}, {frames} }} from "../../videos/{name}_{box}/{mod}";\n\n'
        f'const Root: React.FC = () => <Composition id="{comp}" component={{{fc}}} durationInFrames={{{frames}}} fps={{30}} width={{1080}} height={{1920}} />;\n'
        "registerRoot(Root);\n")
    print(f"{box}: src/videos/{name}_{box}/ synced from main, entry {os.path.relpath(entry, ROOT)} (composition {comp})")
