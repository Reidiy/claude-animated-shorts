// Remotion layer that puts the One Fix Later overlay over a short: captions, term labels, sketch wipes.
// Usage inside <Name>Short, as the LAST child of the AbsoluteFill (above the three.js canvas):
//   <BrandOverlay words={WORDS} terms={TERMS} fixes={FIXES} />
// WORDS: words.json; TERMS: [{ term: "hoist machine", at: 12.4, x: 640, y: 520 }] (at = time the term is said, s;
// x, y = pin point in 1080x1920 px); FIXES: times (s) of every "So you..." / "Easy fix:".
// No intro or outro: the composition starts on the hook at frame 0 and ends right after "Follow for the next fix."
import React, { useEffect, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig, delayRender, continueRender } from "remotion";
import { H, W } from "./brand";
import { drawCaption, drawSketchWipe, drawTermLabel, phrases, Word } from "./overlay";
import { fontsReady } from "./fonts";

export type Term = { term: string; at: number; x: number; y: number };

export const BrandOverlay: React.FC<{ words: Word[]; terms?: Term[]; fixes?: number[]; captions?: boolean }> = ({
  words, terms = [], fixes = [], captions = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const list = useMemo(() => phrases(words, terms.map((t) => t.term)), [words, terms]);
  const [handle] = React.useState(() => delayRender("brand fonts"));
  const [ready, setReady] = React.useState(false);
  useEffect(() => { fontsReady.then(() => { setReady(true); continueRender(handle); }); }, [handle]);

  useEffect(() => {
    const c = ref.current;
    if (!c || !ready) return;
    const g = c.getContext("2d")!;
    g.setTransform(width / W, 0, 0, height / H, 0, 0);
    g.clearRect(0, 0, W, H);
    const t = frame / fps;
    for (const f of fixes) drawSketchWipe(g, frame - Math.round(f * fps));
    for (const tm of terms) drawTermLabel(g, tm.term, frame - Math.round(tm.at * fps), tm.x, tm.y);
    if (captions) drawCaption(g, list, t, fps);
  }, [frame, fps, width, height, list, terms, fixes, captions, ready]);

  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};
