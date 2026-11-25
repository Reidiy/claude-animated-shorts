// Brand fonts for Remotion (SIL OFL): `npm i @remotion/google-fonts` (same version as remotion).
import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";

const fredoka = loadFredoka("normal", { weights: ["600"], subsets: ["latin"] });
const nunito = loadNunito("normal", { weights: ["800"], subsets: ["latin"] });

/** resolves when both brand fonts can be used on a canvas */
export const fontsReady: Promise<void> = Promise.all([fredoka.waitUntilDone(), nunito.waitUntilDone()]).then(() => undefined);
