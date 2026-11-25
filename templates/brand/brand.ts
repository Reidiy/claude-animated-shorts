// One Fix Later: channel brand kit (locked 2026-11-25). Every short of the channel imports its colours, fonts,
// caption and label geometry from here, so the look stays the same from video to video.
// Brand guide (source of truth for the rules below): "Panduan Branding One Fix Later (v3, final)".

export const CHANNEL = "One Fix Later";

/** brand palette: brand elements (Juno, captions, labels, thumbnails) use ONLY these. Story objects keep real colours. */
export const PAL = {
  blueprint: "#16325C", // Biru Cetak: Juno's outline, label background, blueprint lines
  teal: "#1FA79A", // Toska Juno: overalls, "fix" accents
  coral: "#FF6B4A", // Coral: keywords, "problem" accents, supporting-cast accessory
  chalk: "#F4F1E8", // Kapur: caption + label text
  pencil: "#F2C14E", // Kuning Pensil: one small idea icon per scene at most
} as const;

/** character ink (replaces the bridge cast's plum INK for our own cast) */
export const INK = PAL.blueprint;

/** fonts (SIL OFL). In Remotion load them with @remotion/google-fonts (see fonts.ts). */
export const FONT = {
  title: "Fredoka", // labels, thumbnails
  titleWeight: 600,
  caption: "Nunito", // captions
  captionWeight: 800,
} as const;

/** frame geometry for the 1080x1920 composition (scale with the canvas for the 1440x2560 export) */
export const W = 1080;
export const H = 1920;

export const CAPTION = {
  y: 0.62, // phrase centre at 62 % of the frame height, above the Shorts title/buttons
  minWords: 2,
  maxWords: 4,
  maxGap: 0.35, // a pause longer than this (s) always starts a new phrase
  size: 74, // px at 1080 wide
  pop: 4, // frames of the pop-in (scale 0.86 -> 1.0)
  underline: 9, // px, coral underline under the keyword
  shadow: "rgba(22,50,92,0.55)", // soft blueprint shadow for legibility (no black outline)
  pill: "rgba(22,50,92,0.62)", // translucent Biru Cetak pill behind the whole phrase
  pillPadX: 34,
} as const;

export const LABEL = {
  size: 58, // px Fredoka
  padX: 34,
  padY: 20,
  radius: 18,
  grid: 22, // px between blueprint grid lines inside the tag
  gridAlpha: 0.22,
  write: 10, // frames: the term is "written" letter by letter
  fly: 8, // frames: tag flies from the sketchbook to its pin point
  hold: 54, // frames the tag stays after landing (~1.8 s)
} as const;

export const WIPE = { frames: 8 } as const; // blueprint sketch wipe on every "So you..." fix

/** narration rules (scripts are checked against these) */
export const NARRATION = {
  language: "en",
  person: "you",
  problem: "But",
  fix: ["So you", "Easy fix:"],
  reveal: (term: string) => `Meet the ${term}.`,
  actBreak: "Fast forward:",
  signOff: "Follow for the next fix.",
  termsPerShort: [5, 7] as [number, number],
  wordsPerSecond: 3.0,
  lengthSec: [60, 90] as [number, number],
  /** never in our scripts (too close to the studied reference) */
  banned: [/that's the\s/i, /\bif you .+, you've got a\b/i, /send this to (that|a) friend/i, /(^|[.!?]\s+)Now\b/],
} as const;

/** structure: the short starts on the hook at frame 0 and ends right after the sign-off. No intro, outro or jingle. */
export const NO_INTRO_OUTRO = true;
