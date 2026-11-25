# Story events of ONE short, for sfx.py / music.py / mix.py. This file is the bridge short's version
# ("The Bridge That Fell for a Song"): rewrite it for every new short. Generic timings (FPS, TOTAL, shot ranges,
# crossfades, flash) come from timeline.py, which reads shots.json; constants that exist in story.ts / cast.ts
# (SNAP, HITS, PUSH0...) are read from there too, so only story curves and camera distances are mirrored by hand.
import math
import numpy as np
import timeline as T

TITLE = "The Bridge That Fell for a Song"

C = T.CONST
SNAP, DROP0, DROP1 = C["SNAP"], C["DROP0"], C["DROP1"]   # story.ts
FLASH = T.FLASH
HITS = C["HITS"]                                           # cast.ts (pass it to story_shots.py as an extra file)
SWING_T, PUSH0 = C["SWING_T"], C["PUSH0"]                  # cast.ts
PUSHES = [PUSH0 + k * SWING_T for k in range(4)]
TOURIST_T0 = 62.08                                         # cast.ts tourists() local t0
TOURIST_SHOT = T.LAST


def tau_of(shot, t):
    """story time per shot (story.ts SHOTS[].tau)"""
    return 29.5 + t if shot == 1 else (t - 31 if shot == 13 else t)


AMP = [(14.85, 0), (17.8, 0.07), (21.4, 0.13), (27.4, 0.26), (33.0, 0.46), (SNAP, 0.55), (SNAP + 0.35, 0.0)]
STOMP = [(21.4, 1.0), (27.4, 1.35), (33, 1.5)]


def amp(tau):
    return T.lin(AMP, tau) if tau >= AMP[0][0] else 0.0


def stomp(tau):
    return T.lin(STOMP, tau)


# camera -> marching column distance (m) per shot, from the camera keys in story.ts (frame, move frames, metres)
COLUMN_CAM = {
    1: [(0, 0, 15.2), (48, 9, 6.7), (88, 9, 4.3)],
    2: [(126, 0, 80.0), (190, 10, 66.0), (246, 10, 51.0)],
    3: [(280, 0, 51.0), (283, 14, 6.45), (353, 10, 3.55)],
    4: [(440, 0, 3.55), (444, 13, 11.6), (497, 10, 7.9)],
    5: [(530, 0, 7.9), (534, 13, 5.0), (585, 10, 3.9)],
    6: [(640, 0, 3.9), (643, 11, 3.3), (717, 12, 11.9), (768, 10, 7.0)],
    7: [(820, 0, 7.0), (823, 12, 11.4), (871, 11, 7.4), (925, 11, 4.1)],
    8: [(984, 0, 4.1), (987, 12, 19.5), (1039, 8, 18.5), (1062, 18, 25.0), (1099, 1, 8.5)],
    13: [(1614, 0, 9.0), (1685, 10, 6.9)],
}


def column_distance(t):
    s = T.shot_at(t)
    keys = COLUMN_CAM.get(s)
    if not keys:
        return 60.0
    f = t * T.FPS
    ld = math.log(keys[0][2])
    for kf, dur, d in keys[1:]:
        if f < kf:
            break
        ld = ld + (math.log(d) - ld) * T.easeout((f - kf) / max(dur, 1))
    return math.exp(ld)


def footfalls():
    """every footfall of the marching column while it is on screen: (t, shot, tau, foot 0/1)"""
    out = []
    for k in range(0, int(T.DUR * 2) + 1):
        t = k * 0.5
        s = T.shot_at(t)
        if T.field(s, "crowd") not in ("march", "fall"):
            continue
        tau = tau_of(s, t)
        if T.field(s, "crowd") == "fall" and tau > SNAP + 0.25:     # column stops ("stand") at SNAP + 0.25
            continue
        out.append((t, s, tau, k % 2))
    return out


def tourist_steps():
    """last shot: 24 soldiers strolling out of step, each with its own speed and phase (cast.ts tourists())"""
    t0 = TOURIST_T0
    a, b = T.shot_t(TOURIST_SHOT)
    steps = []
    for i in range(24):
        sp = 0.55 + T.hh(i) * 0.5
        ph0 = T.hh(i, 5)
        x = (T.hh(i, 3) - 0.5) * 4.0
        k = 0
        while True:
            # phase = ((t - t0) * sp / 1.4 + ph0) % 1; a footfall at phase 0 and 0.5
            t = t0 + (k * 0.5 - ph0) * 1.4 / sp
            k += 1
            if t < a - 0.1:
                continue
            if t > T.DUR:
                break
            z = -4 + (i / 24) * 28 + T.hh(i, 2) * 1.5 - sp * (t - t0)
            steps.append((t, i, x, z, sp))
    return steps


def tourist_cam(t):
    """approx camera position in the last shot (story.ts keys 1857 / 1905 / 1962)"""
    f = t * T.FPS
    p = np.array([1.7, 7.75, -15.5]) + np.array([0, 0, 0.006]) * (f - 1857)
    if f >= 1905:
        q = np.array([-1.3, 7.6, -13]) + np.array([0, 0, 0.006]) * (f - 1905)
        p = p + (q - p) * T.easeout((f - 1905) / 10)
    if f >= 1962:
        q = np.array([17, 15, -44]) + np.array([-0.01, 0.004, 0]) * (f - 1962)
        p = p + (q - p) * T.easeout((f - 1962) / 24)
    return p


def swing_amp_deg(t):
    s = lambda x: (lambda u: u * u * (3 - 2 * u))(min(1.0, max(0.0, x)))
    return 6 + sum(11 * s((t - tp) / 0.3) for tp in PUSHES)


# ------------------------------------------------------------------ mix settings (mix.py)
# music level per music.SECTIONS name, LU relative to the voice in that section (after ducking); "+3 dB music" standard
# (user standard: bed -10 instead of the old -13; sway/swing deliberately softer and warmer, rule/tourists leave room
# for the hammer blows and the strolling footsteps). Sections not listed get MUSIC_TARGET_DEFAULT.
MUSIC_TARGET = {"hook": -9.5, "town": -10.5, "march": -10.0, "bounce": -10.0, "whistle": -9.5, "tension": -10.0,
                "sway": -12.0, "swing": -11.5, "march2": -10.5, "rule": -11.5, "tourists": -11.0}
MUSIC_TARGET_DEFAULT = -10.0
SILENT_SECTION = ("dropout", "tension")   # (music section with no music, section whose level its tail decays at)
SECTION_START = {"sway": 43.1}            # switch the level here instead of at the section start
HARD_SWITCHES = [FLASH, 43.1]             # level switches that fall in silence: no 0.4 s smoothing there

# music rides (start, end, dB): keep the quiet sentence-final words on top; the band blooms again in the gap after them
DIPS = [(3.65, 4.30, -3.0),     # hook fill under "...walking across it."
        (26.95, 27.36, -2.0),   # whistling column under "...every step."
        (32.20, 32.77, -4.0),   # tension crescendo under "...breaks step." -> blooms into the dead stop before "Then,"
        (61.25, 61.98, -3.0)]   # rule roll under "...in step."

# loudness report sections (name, start s, end s); leave out to get one row per shot
_s = T.shot_t
REPORT = [("hook (1)", 0.0, _s(1)[1]), ("town (2)", *_s(2)), ("march (3)", *_s(3)), ("bounce (4-5)", _s(4)[0], _s(5)[1]),
          ("whistle (6)", *_s(6)), ("groan (7)", *_s(7)), ("snap+fall (8)", *_s(8)), ("water (9-10)", _s(9)[0], _s(10)[1]),
          ("sway (11)", *_s(11)), ("swing (12)", *_s(12)), ("march2 (13)", *_s(13)), ("rule (14)", *_s(14)),
          ("tourists (15)", _s(15)[0], T.DUR)]
