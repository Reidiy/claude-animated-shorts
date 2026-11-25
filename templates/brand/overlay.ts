// One Fix Later 2D overlay, drawn on a plain canvas so the same code runs in Remotion (BrandOverlay.tsx) and in
// stills/previews: phrase captions at 62 % height, blueprint term labels ("Meet the ___."), blueprint sketch wipe.
// Fonts must be loaded before drawing (fonts.ts in Remotion).

import { CAPTION, FONT, H, LABEL, PAL, W, WIPE } from "./brand";

type G = CanvasRenderingContext2D;
export type Word = { word: string; start: number; end: number };
export type Phrase = { words: Word[]; start: number; end: number; key: number /* index of the keyword in words, -1 none */ };

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const easeOut = (t: number) => 1 - (1 - clamp(t)) ** 3;
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9'-]/g, "");

/** group words.json into 2-4 word phrases; break on punctuation and pauses. `keywords`: terms to underline in coral. */
export const phrases = (words: Word[], keywords: string[] = []): Phrase[] => {
  const keys = new Set(keywords.flatMap((k) => k.split(/\s+/).map(norm)));
  const out: Phrase[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (!cur.length) return;
    // a lonely last word joins the previous phrase when that one still has room
    const prev = out[out.length - 1];
    if (cur.length < CAPTION.minWords && prev && prev.words.length < CAPTION.maxWords && cur[0].start - prev.end < CAPTION.maxGap) {
      prev.words.push(...cur); prev.end = cur[cur.length - 1].end;
    } else out.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end, key: -1 });
    cur = [];
  };
  words.forEach((w, i) => {
    const next = words[i + 1];
    cur.push(w);
    const punct = /[.,!?;:]$/.test(w.word);
    const gap = next ? next.start - w.end : 1;
    if (cur.length >= CAPTION.maxWords || (punct && cur.length >= CAPTION.minWords) || gap > CAPTION.maxGap) flush();
  });
  flush();
  for (const ph of out) ph.key = ph.words.findIndex((w) => keys.has(norm(w.word)));
  return out;
};

/** draw the phrase that is on screen at time t (s). Canvas is W x H (scale the context for other sizes). */
export const drawCaption = (g: G, list: Phrase[], t: number, fps = 30) => {
  const ph = list.find((p, i) => t >= p.start && t < (list[i + 1]?.start ?? p.end + 0.6));
  if (!ph) return;
  const age = (t - ph.start) * fps, s = 0.86 + 0.14 * easeOut(age / CAPTION.pop);
  const size = CAPTION.size;
  g.save();
  g.font = `${FONT.captionWeight} ${size}px ${FONT.caption}`;
  g.textBaseline = "middle";
  const space = g.measureText(" ").width;
  const parts = ph.words.map((w) => w.word);
  const widths = parts.map((w) => g.measureText(w).width);
  const total = widths.reduce((a, b) => a + b, 0) + space * (parts.length - 1);
  const cx = W / 2, cy = H * CAPTION.y;
  g.translate(cx, cy); g.scale(s, s); g.translate(-cx, -cy);
  // translucent Biru Cetak pill behind the whole phrase (legibility on any background)
  g.fillStyle = CAPTION.pill;
  g.beginPath();
  g.roundRect(cx - total / 2 - CAPTION.pillPadX, cy - size * 0.62, total + 2 * CAPTION.pillPadX, size * 1.5, size * 0.45);
  g.fill();
  let x = cx - total / 2;
  parts.forEach((w, i) => {
    g.shadowColor = CAPTION.shadow; g.shadowBlur = 18; g.shadowOffsetY = 4;
    g.fillStyle = PAL.chalk;
    g.fillText(w, x, cy);
    g.shadowColor = "transparent";
    if (i === ph.key) {
      const grow = easeOut((age - 2) / 6);
      g.fillStyle = PAL.coral;
      g.beginPath();
      g.roundRect(x, cy + size * 0.52, widths[i] * grow, CAPTION.underline, CAPTION.underline / 2);
      g.fill();
    }
    x += widths[i] + space;
  });
  g.restore();
};

/** blueprint term tag. f = frames since the term was said; (fromX, fromY) = sketchbook on screen, (x, y) = pin point. */
export const drawTermLabel = (g: G, term: string, f: number, x: number, y: number, fromX = W * 0.25, fromY = H * 0.8) => {
  if (f < 0 || f > LABEL.write + LABEL.fly + LABEL.hold + 6) return;
  const fly = easeOut((f - LABEL.write) / LABEL.fly);
  const out = clamp((f - LABEL.write - LABEL.fly - LABEL.hold) / 6);
  const px = fromX + (x - fromX) * fly, py = fromY + (y - fromY) * fly;
  const scale = 0.7 + 0.3 * fly;
  const text = term.toUpperCase();
  const shown = text.slice(0, Math.ceil(text.length * clamp(f / LABEL.write)));
  g.save();
  g.globalAlpha = 1 - out;
  g.font = `${FONT.titleWeight} ${LABEL.size}px ${FONT.title}`;
  const tw = g.measureText(text).width;
  const w = tw + 2 * LABEL.padX, h = LABEL.size + 2 * LABEL.padY;
  g.translate(px, py); g.scale(scale, scale); g.rotate((-2.5 * Math.PI) / 180);
  // pin line to the object
  if (fly >= 1) {
    g.strokeStyle = PAL.chalk; g.lineWidth = 5; g.setLineDash([10, 9]);
    g.beginPath(); g.moveTo(0, h / 2); g.lineTo(0, h / 2 + 70); g.stroke(); g.setLineDash([]);
    g.fillStyle = PAL.coral; g.beginPath(); g.arc(0, h / 2 + 78, 10, 0, Math.PI * 2); g.fill();
  }
  // tag
  g.shadowColor = "rgba(10,20,40,0.35)"; g.shadowBlur = 20; g.shadowOffsetY = 8;
  g.fillStyle = PAL.blueprint; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, LABEL.radius); g.fill();
  g.shadowColor = "transparent";
  // blueprint grid
  g.save(); g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, LABEL.radius); g.clip();
  g.strokeStyle = `rgba(244,241,232,${LABEL.gridAlpha})`; g.lineWidth = 1.5;
  for (let gx = -w / 2 + LABEL.grid; gx < w / 2; gx += LABEL.grid) { g.beginPath(); g.moveTo(gx, -h / 2); g.lineTo(gx, h / 2); g.stroke(); }
  for (let gy = -h / 2 + LABEL.grid; gy < h / 2; gy += LABEL.grid) { g.beginPath(); g.moveTo(-w / 2, gy); g.lineTo(w / 2, gy); g.stroke(); }
  g.restore();
  g.strokeStyle = PAL.chalk; g.lineWidth = 4; g.beginPath(); g.roundRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, LABEL.radius - 6); g.stroke();
  g.fillStyle = PAL.chalk; g.textBaseline = "middle"; g.textAlign = "left";
  g.fillText(shown, -tw / 2, 2);
  g.restore();
};

/** blueprint sketch wipe for a fix: f = frames since "So you...", 0..WIPE.frames. Lines sweep diagonally. */
export const drawSketchWipe = (g: G, f: number) => {
  if (f < 0 || f > WIPE.frames) return;
  const t = f / WIPE.frames, edge = -0.3 * W + t * 1.6 * (W + H);
  g.save();
  g.beginPath(); g.moveTo(edge - 260, 0); g.lineTo(edge, 0); g.lineTo(edge - H * 0.6, H); g.lineTo(edge - H * 0.6 - 260, H); g.closePath();
  g.fillStyle = "rgba(22,50,92,0.78)"; g.fill(); g.clip();
  g.strokeStyle = "rgba(244,241,232,0.35)"; g.lineWidth = 2;
  for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.restore();
};

/** a short is valid only if the script obeys the brand narration rules (see brand.ts NARRATION). */
export { NARRATION } from "./brand";
