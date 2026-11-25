# One Fix Later: channel sound kit (brand guide "Musik dan efek suara"), all own synthesis, no samples.
# - workshop(): light "workshop" underscore, 110 bpm, wood percussion + pizzicato bass + marimba melody.
#   It steps up one level (density, register, a shaker) at every "Fast forward:" act break.
# - brand SFX: pencil scratch (sketch appears), click (fix locks in), boing (Juno's first try fails),
#   tick (term label lands).
# - NO jingle, intro or outro sting: the short starts on the hook and ends on "Follow for the next fix."
#
# Use in a short: music.py builds `workshop(T.DUR, act_breaks=[...])` instead of the bridge march; sfx.py adds
# brand cues at the times in events.py (FIXES, FAILS, TERMS). `python brand_audio.py out.wav` renders a 24 s demo.
import sys
import numpy as np
from dsp import SR, TAU, ns, tt, rng, lp, hp, bp, fades, modal, pan, place, make_ir, convolve_st, integrated, dbg, write_wav
import instruments as I

F = I.m2f
BPM = 110.0
BEAT = 60.0 / BPM

# F major, 4-bar loop: F  Dm  Bb  C  (I vi IV V); bass roots and marimba chord tones (midi)
PROG = [(41, [65, 69, 72]), (38, [62, 65, 69]), (34, [62, 65, 70]), (36, [64, 67, 72])]
# 2-bar marimba motif per act (beat, length in beats, scale step): steps index the F major pentatonic
PENTA = [65, 67, 69, 72, 74, 77, 79, 81, 84]
MOTIF = [(0, .5, 2), (.5, .5, 3), (1, 1, 4), (2, .5, 3), (2.5, .5, 2), (3, 1, 0),
         (4, .5, 1), (4.5, .5, 2), (5, .5, 3), (5.5, .5, 5), (6, 1.5, 4), (7.5, .5, 3)]


# ---------------------------------------------------------------- instruments
def marimba(f, vel=0.7, r=None, dur=1.2):
    """wooden bar: strong fundamental, tuned 4th and 10th partials, fast mallet click"""
    r = r or rng(0)
    t = tt(dur)
    k = (440.0 / f) ** 0.3
    y = modal(dur, [(f, 1.0, 0.42 * k), (f * 3.93, 0.22 * vel, 0.06 * k), (f * 9.2, 0.06 * vel, 0.015)], r)
    click = bp(r.standard_normal(len(t)), 900, 4000) * np.exp(-t / 0.0015) * 0.18 * vel
    return fades((y + click) * vel * (1 - np.exp(-t / 0.002)), 0.0005, 0.04)


def woodblock(vel=0.6, r=None, f=1050.0):
    r = r or rng(0)
    y = modal(0.18, [(f, 1.0, 0.035), (f * 2.7, 0.35, 0.012), (f * 4.1, 0.12, 0.006)], r)
    return fades(y * vel, 0.0003, 0.02)


def shaker(vel=0.3, r=None, dur=0.09):
    r = r or rng(0)
    t = tt(dur)
    y = hp(r.standard_normal(len(t)), 5000) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return y * vel * 0.35


def bass(f, dur, vel=0.7, r=None):
    return I.pluck(f, vel, r, dur=dur + 0.25, bright=0.25, pos=0.22)


# ---------------------------------------------------------------- score
def workshop(dur, act_breaks=(), seed=2026, bpm=BPM, start_level=0):
    """stereo underscore of `dur` s. act_breaks: times (s) of each "Fast forward:"; the level goes up by one at each."""
    r = rng(seed)
    beat = 60.0 / bpm
    out = np.zeros((2, ns(dur) + SR))
    breaks = sorted(act_breaks)
    level_at = lambda t: start_level + sum(1 for b in breaks if t >= b)
    nbeats = int(dur / beat) + 1
    for bi in range(nbeats):
        t = bi * beat
        lv = level_at(t)
        bar, pos = divmod(bi, 4)
        root, chord = PROG[bar % 4]
        # wood percussion: block on 2 and 4, softer ghost notes from level 1
        if pos in (1, 3):
            place(out, pan(woodblock(0.55, r), 0.25), t)
        if lv >= 1 and pos in (0, 2):
            place(out, pan(woodblock(0.22, r, f=780.0), -0.2), t + beat / 2)
        if lv >= 2:
            for h in range(2):
                place(out, pan(shaker(0.5 if h == 0 else 0.3, r), 0.45), t + h * beat / 2)
        # pizzicato bass: root on 1, fifth on 3 (walking 8ths from level 2)
        if pos == 0:
            place(out, pan(bass(F(root), beat * 1.6, 0.8, r), -0.1), t)
        if pos == 2:
            place(out, pan(bass(F(root + 7), beat * 1.6, 0.65, r), -0.1), t)
        if lv >= 2 and pos in (1, 3):
            place(out, pan(bass(F(root + (12 if pos == 1 else 5)), beat * 0.8, 0.45, r), -0.1), t + beat / 2)
        # marimba comping: chord tones on the off-beats
        for j, m in enumerate(chord):
            place(out, pan(marimba(F(m + (12 if lv >= 3 else 0)), 0.28, r, 0.6), 0.3 - 0.3 * j), t + beat / 2 + 0.008 * j)
    # motif: every 2 bars, an octave up from level 2
    motif_len = 8 * beat
    k = 0
    while k * motif_len < dur:
        t0 = k * motif_len
        lv = level_at(t0)
        shift = 12 if lv >= 2 else 0
        for (b, ln, step) in MOTIF:
            if lv == 0 and k % 2 == 1:
                break  # level 0: motif only every other phrase, lots of air under the voice
            place(out, pan(marimba(F(PENTA[step] + shift), 0.55, r, 1.0), 0.1), t0 + b * beat)
        k += 1
    out = out[:, : ns(dur)]
    room = make_ir(0.55, seed=7, hf=0.6)
    wet = convolve_st(out, room)[:, : out.shape[1]]
    y = out + 0.18 * wet
    return fades(y, 0.002, 0.25)


# ---------------------------------------------------------------- brand SFX
def pencil_scratch(dur=0.45, r=None):
    """graphite on paper: band noise with stroke bursts (sketch appears)"""
    r = r or rng(11)
    t = tt(dur)
    n = len(t)
    strokes = np.zeros(n)
    for s0 in np.arange(0, dur, 0.11):
        a = ns(s0)
        L = min(n - a, ns(0.09))
        strokes[a:a + L] += np.sin(np.linspace(0, np.pi, L)) ** 1.5
    grain = bp(r.standard_normal(n), 2500, 7500) * (0.6 + 0.4 * np.abs(r.standard_normal(n)) ** 0.5)
    return fades(grain * strokes * 0.5, 0.002, 0.03)


def fix_click(r=None):
    """two-part latch click (fix locks in)"""
    r = r or rng(12)
    a = modal(0.08, [(2400, 1.0, 0.006), (5200, 0.5, 0.003)], r)
    b = modal(0.1, [(1700, 1.0, 0.012), (3900, 0.4, 0.005)], r)
    y = np.zeros(ns(0.14))
    y[: len(a)] += a
    k = ns(0.035)
    y[k: k + len(b)] += 0.8 * b[: len(y) - k]
    return fades(y * 0.8, 0.0002, 0.02)


def fail_boing(r=None, f0=180.0):
    """sprung-wire boing with a downward wobble (Juno's first try fails)"""
    r = r or rng(13)
    dur = 0.7
    t = tt(dur)
    f = f0 * (1 + 0.5 * np.exp(-t / 0.06)) * (1 + 0.06 * np.sin(TAU * 9 * t) * np.exp(-t / 0.3))
    ph = TAU * np.cumsum(f) / SR
    y = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3.01 * ph)) * np.exp(-t / 0.22)
    return fades(y * 0.6, 0.001, 0.05)


def label_tick(r=None):
    """small wooden tick (term label lands on its pin)"""
    return woodblock(0.7, r or rng(14), f=1650.0)


# ---------------------------------------------------------------- demo
if __name__ == "__main__":
    out_path = sys.argv[1] if len(sys.argv) > 1 else "brand_demo.wav"
    D = 24.0
    mus = workshop(D, act_breaks=[8.0, 16.0])
    sfx = np.zeros((2, ns(D)))
    for t in (1.0, 9.0, 17.0):
        place(sfx, pan(fail_boing(), -0.2), t)
        place(sfx, pan(pencil_scratch(), 0.1), t + 1.6)
        place(sfx, pan(fix_click(), 0.0), t + 2.4)
        place(sfx, pan(label_tick(), 0.3), t + 3.4)
    mix = mus * dbg(-8) + sfx * dbg(-4)
    mix *= dbg(-16 - integrated(mix))
    write_wav(out_path, mix)
    print(f"wrote {out_path}: {D:.0f} s, integrated {integrated(mix):.1f} LUFS")
