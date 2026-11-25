// Juno: the channel's main character (One Fix Later). A young inventor who tries the simplest fix first, fails in a
// funny way, then sketches the better one. Drawn as a flat 2D card with a uniform Biru Cetak outline, to be placed in
// the 3D world like the bridge cast (same design space, so cast.ts Pool/Actor can host her).
//
// Construction (brand guide, "Tokoh utama: Juno"), deliberately NOT the bean-head construction in bridge/toon.ts:
// - wide round head (H/W ~0.88) with a small chin, ~1/3.5 of the body height
// - upright oval eyes + thick expressive brows, no blush
// - curly hair tied up with a pencil, round welding goggles on the forehead (down over the eyes when testing a fix)
// - teal overalls with pockets, coral tee, brown boots, blue sketchbook in one hand
// - outline: one even weight in Biru Cetak (no thick-thin plum ink)
//
// Design space 600 x 1000 units, soles at y = 975 (same as toon.ts), so a Req { w: 600, h: 1000 } works as is.

import { PAL } from "./brand";

type P2 = [number, number];
type G = CanvasRenderingContext2D;

export type JunoPose = "stand" | "point" | "shrug" | "sketch";
export type JunoFace = "happy" | "think" | "oops" | "proud";
export type JunoOpts = {
  pose?: JunoPose;
  face?: JunoFace;
  goggles?: "up" | "down";
  /** 0..1, closes the eyes for a blink */
  blink?: number;
  /** -1..1, eyes and mouth shift toward the side she looks at */
  look?: number;
  /** canvas angle the key light comes FROM (radians); the far side gets a soft shade */
  light?: number;
  /** outline width in design units */
  ol?: number;
};

const C = {
  ink: PAL.blueprint,
  skin: "#F3C7A1",
  skinShade: "#E0A983",
  hair: "#3A2626",
  hairHi: "#5A3A36",
  tee: PAL.coral,
  teeShade: "#D9553A",
  overall: PAL.teal,
  overallShade: "#178579",
  pocket: "#1B958A",
  stitch: "#9EE3DA",
  boot: "#6B4A32",
  sole: "#3E2A1D",
  book: "#2E5FA3",
  bookPage: PAL.chalk,
  lens: "#BFE9E4",
  rim: "#5B6B7A",
  strap: PAL.blueprint,
  pencil: PAL.pencil,
  eraser: PAL.coral,
  mouth: "#6A2433",
  white: "#FFFFFF",
};

const rad = (d: number) => (d * Math.PI) / 180;

class Ink {
  constructor(public g: G, public ol: number) {}
  path(pts: P2[], close = true) {
    const g = this.g;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    if (close) g.closePath();
  }
  shape(pts: P2[], fill: string | null, ol = this.ol) {
    const g = this.g;
    this.path(pts);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (ol) { g.lineWidth = ol; g.strokeStyle = C.ink; g.lineJoin = "round"; g.stroke(); }
  }
  ell(cx: number, cy: number, rx: number, ry: number, fill: string | null, ol = this.ol, rot = 0) {
    this.shape(ellipse(cx, cy, rx, ry, rot), fill, ol);
  }
  /** round-capped limb with an outline */
  limb(pts: P2[], fill: string, w: number) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = C.ink; g.lineWidth = w + 2 * this.ol; g.stroke();
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  line(pts: P2[], w: number, col: string = C.ink) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = col; g.lineWidth = w; g.stroke();
  }
  dot(x: number, y: number, r: number, col: string) {
    const g = this.g; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = col; g.fill();
  }
  /** soft shade on the side away from the light, clipped to a shape */
  shade(pts: P2[], col: string, light: number, cx: number, cy: number, R: number) {
    const g = this.g;
    g.save(); this.path(pts); g.clip();
    const gx = cx + Math.cos(light) * 0.5 * R, gy = cy + Math.sin(light) * 0.5 * R;
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, 1.35 * R);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.72, "rgba(0,0,0,0)"); gr.addColorStop(1, col);
    g.fillStyle = gr; g.fillRect(cx - 2 * R, cy - 2 * R, 4 * R, 4 * R);
    g.restore();
  }
}

const ellipse = (cx: number, cy: number, rx: number, ry: number, rot = 0, n = 56): P2[] => {
  const pts: P2[] = [], r = rad(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
  }
  return pts;
};

/** wide round head with a small chin: circle-ish top, jaw narrowing below the cheeks */
const headPts = (cx: number, cy: number, rx: number, ry: number): P2[] => {
  const pts: P2[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, s = Math.sin(a);
    const narrow = s > 0 ? 1 - 0.2 * s ** 2.2 : 1; // lower half tapers toward the chin
    const drop = s > 0 ? 1 + 0.06 * s ** 4 : 1; // tiny chin point
    pts.push([cx + rx * Math.cos(a) * narrow, cy + ry * s * drop]);
  }
  return pts;
};

const rrect = (x0: number, y0: number, x1: number, y1: number, r: number): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]] as const)
    for (let i = 0; i <= 8; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / 8)), cy + r * Math.sin(rad(a + (90 * i) / 8))]);
  return pts;
};

/** draw Juno into the 600 x 1000 design space of the current canvas transform */
export const drawJuno = (g: G, opts: JunoOpts = {}) => {
  const { pose = "stand", face = "happy", goggles = "up", blink = 0, look = 0, light = rad(-130), ol = 9 } = opts;
  const p = new Ink(g, ol);
  const hx = 300, hy = 245, hrx = 138, hry = 122; // head
  const neckY = hy + hry - 6;
  const shY = 410, hipY = 690, kneeY = 820, soleY = 975;

  // ---------------- legs + boots ----------------
  for (const s of [-1, 1]) {
    const x = hx + s * 52;
    p.limb([[x, hipY - 30], [x + s * 4, kneeY], [x + s * 6, soleY - 70]], C.overall, 78);
    p.shape(rrect(x + s * 6 - 52 + s * 10, soleY - 92, x + s * 6 + 52 + s * 10, soleY, 34), C.boot);
    p.shape(rrect(x + s * 6 - 54 + s * 10, soleY - 22, x + s * 6 + 54 + s * 10, soleY, 10), C.sole);
  }

  // ---------------- back arm (holds the sketchbook) ----------------
  const bookHand: P2 = pose === "sketch" ? [hx - 40, 600] : [hx - 168, 640];
  p.limb([[hx - 118, shY + 30], [hx - 158, 520], bookHand], C.skin, 54);
  p.limb([[hx - 118, shY + 30], [hx - 140, 480]], C.tee, 70); // coral sleeve
  const drawBook = () => {
    const bk = pose === "sketch"
      ? rrect(hx - 120, 520, hx + 40, 660, 10)
      : rrect(bookHand[0] - 70, bookHand[1] - 95, bookHand[0] + 42, bookHand[1] + 55, 10);
    p.shape(bk, C.book);
    if (pose === "sketch") p.shape(rrect(hx - 108, 532, hx + 28, 648, 6), C.bookPage, 4);
    else p.line([[bookHand[0] - 58, bookHand[1] - 80], [bookHand[0] - 58, bookHand[1] + 42]], 6, C.stitch);
    p.ell(bookHand[0] + 8, bookHand[1], 30, 30, C.skin);
  };
  if (pose !== "sketch") drawBook();

  // ---------------- torso: coral tee + teal overalls ----------------
  const torso: P2[] = [[hx - 112, shY], [hx + 112, shY], [hx + 128, hipY], [hx - 128, hipY]];
  p.shape(torso, C.tee);
  const bib: P2[] = [[hx - 92, shY + 70], [hx + 92, shY + 70], [hx + 128, hipY + 10], [hx - 128, hipY + 10]];
  p.shape(bib, C.overall);
  p.shade(bib, "rgba(10,60,70,0.35)", light, hx, (shY + hipY) / 2, 170);
  for (const s of [-1, 1]) p.line([[hx + s * 80, shY + 76], [hx + s * 96, shY + 4]], 20, C.overall); // straps
  for (const s of [-1, 1]) p.line([[hx + s * 80, shY + 76], [hx + s * 96, shY + 4]], 3, C.ink);
  p.shape(rrect(hx - 54, shY + 112, hx + 54, shY + 190, 12), C.pocket, 6); // chest pocket
  p.line([[hx - 44, shY + 126], [hx + 44, shY + 126]], 4, C.stitch);
  // pencil in the pocket
  p.shape([[hx + 22, shY + 116], [hx + 36, shY + 116], [hx + 36, shY + 60], [hx + 29, shY + 44], [hx + 22, shY + 60]], C.pencil, 5);
  for (const s of [-1, 1]) p.shape(rrect(hx + s * 70 - 34, hipY - 92, hx + s * 70 + 34, hipY - 30, 10), C.pocket, 6);
  p.dot(hx - 80, shY + 78, 8, C.stitch); p.dot(hx + 80, shY + 78, 8, C.stitch); // buttons

  if (pose === "sketch") drawBook(); // open sketchbook held in front of the overalls

  // ---------------- front arm (pose) ----------------
  const sh: P2 = [hx + 118, shY + 30];
  const arm: P2[] = pose === "point" ? [sh, [hx + 186, shY - 60], [hx + 210, shY - 170]]
    : pose === "shrug" ? [sh, [hx + 210, shY + 70], [hx + 240, shY - 20]]
    : pose === "sketch" ? [sh, [hx + 150, 560], [hx + 40, 600]]
    : [sh, [hx + 160, 520], [hx + 168, 640]];
  p.limb(arm, C.skin, 54);
  p.limb([arm[0], [(arm[0][0] + arm[1][0]) / 2 + 6, (arm[0][1] + arm[1][1]) / 2]], C.tee, 70);
  const hand = arm[2];
  p.ell(hand[0], hand[1], 31, 31, C.skin);
  if (pose === "point") p.limb([[hand[0], hand[1] - 18], [hand[0] + 4, hand[1] - 66]], C.skin, 20); // index finger up
  if (pose === "sketch") p.line([[hand[0] - 8, hand[1] - 6], [hand[0] - 52, hand[1] - 44]], 12, C.pencil);

  // ---------------- neck + head ----------------
  p.shape(rrect(hx - 34, neckY - 20, hx + 34, shY + 16, 12), C.skin);
  // hair back volume (curly cloud behind the head)
  const curls: [number, number, number][] = [[-120, -40, 52], [-80, -96, 58], [-20, -122, 62], [48, -118, 60], [106, -84, 56], [132, -30, 48]];
  for (const [dx, dy, r] of curls) p.ell(hx + dx, hy + dy, r, r, C.hair);
  // top-knot bun + pencil through it
  p.ell(hx + 10, hy - 168, 54, 46, C.hair);
  p.shape([[hx - 80, hy - 214], [hx - 68, hy - 228], [hx + 100, hy - 128], [hx + 88, hy - 114]], C.pencil, 6);
  p.shape([[hx - 80, hy - 214], [hx - 68, hy - 228], [hx - 88, hy - 242], [hx - 100, hy - 228]], C.eraser, 6);
  p.shape([[hx + 100, hy - 128], [hx + 88, hy - 114], [hx + 118, hy - 108]], C.skinShade, 5);
  const head = headPts(hx, hy, hrx, hry);
  p.shape(head, C.skin);
  p.shade(head, "rgba(170,90,60,0.28)", light, hx, hy, hrx);
  // fringe curls over the forehead
  for (const [dx, dy, r] of [[-96, -78, 40], [-44, -104, 42], [14, -110, 40], [70, -96, 40], [112, -60, 34]] as [number, number, number][])
    p.ell(hx + dx, hy + dy, r, r * 0.86, C.hair);
  p.dot(hx - 40, hy - 112, 10, C.hairHi); p.dot(hx + 66, hy - 102, 9, C.hairHi);
  // ears
  for (const s of [-1, 1]) p.ell(hx + s * (hrx - 2), hy + 14, 20, 26, C.skin);

  // ---------------- face ----------------
  const fx = hx + look * 22;
  const eyeY = hy + 6;
  if (goggles === "down") {
    p.line([[hx - hrx + 4, eyeY - 4], [hx + hrx - 4, eyeY - 4]], 18, C.strap);
    for (const s of [-1, 1]) { p.ell(fx + s * 44, eyeY, 40, 40, C.rim); p.ell(fx + s * 44, eyeY, 30, 30, C.lens, 4); }
    for (const s of [-1, 1]) p.ell(fx + s * 44, eyeY + 2, 10, 15, C.ink, 0);
  } else {
    // goggles resting on the forehead
    p.line([[hx - hrx + 6, hy - 66], [hx + hrx - 6, hy - 66]], 16, C.strap);
    for (const s of [-1, 1]) { p.ell(hx + s * 42, hy - 70, 32, 30, C.rim); p.ell(hx + s * 42, hy - 70, 22, 20, C.lens, 4); }
    p.dot(hx - 48, hy - 76, 5, C.white); p.dot(hx + 36, hy - 76, 5, C.white);
    // upright oval eyes
    const open = 1 - Math.min(1, Math.max(0, blink));
    for (const s of [-1, 1]) {
      if (open > 0.15) p.ell(fx + s * 40, eyeY, 12, 21 * open, C.ink, 0);
      else p.line([[fx + s * 40 - 12, eyeY], [fx + s * 40 + 12, eyeY]], 6);
    }
    // thick tapered brows
    const browLift = face === "oops" ? -14 : face === "think" ? -6 : 0;
    for (const s of [-1, 1]) {
      const tilt = face === "think" ? (s < 0 ? 8 : -4) : face === "oops" ? -6 * s : 4 * s;
      p.line([[fx + s * 22, eyeY - 38 + browLift + tilt], [fx + s * 62, eyeY - 44 + browLift - tilt]], 12);
    }
  }
  // nose: small soft hook
  p.line([[fx + 4, hy + 30], [fx + 12, hy + 46], [fx + 2, hy + 50]], 5);
  // mouth
  const my = hy + 74;
  if (face === "happy" || face === "proud") {
    p.shape([[fx - 34, my - 6], [fx + 34, my - 6], [fx + 22, my + 16], [fx, my + 24], [fx - 22, my + 16]], C.mouth, 6);
    p.shape([[fx - 24, my - 4], [fx + 24, my - 4], [fx + 18, my + 4], [fx - 18, my + 4]], C.white, 0);
  } else if (face === "oops") {
    p.ell(fx + 4, my + 6, 14, 18, C.mouth, 6);
  } else {
    p.line([[fx - 16, my + 4], [fx + 18, my]], 6);
  }
  // freckles: a fixed, small signature
  for (const [dx, dy] of [[-62, 36], [-50, 44], [-70, 48], [62, 36], [50, 44], [70, 48]]) p.dot(fx + dx, hy + dy, 3.2, "#C98763");
};

/** Req factory for bridge/cast.ts Pool: `pool.get(junoReq("point", "happy"))` */
export const junoReq = (pose: JunoPose = "stand", face: JunoFace = "happy", goggles: "up" | "down" = "up", k = 1) => ({
  key: `juno:${pose}:${face}:${goggles}`,
  w: 600,
  h: 1000,
  k,
  draw: (pen: { g: G }) => drawJuno(pen.g, { pose, face, goggles }),
});
