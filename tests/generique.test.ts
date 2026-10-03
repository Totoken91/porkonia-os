import { describe, expect, it } from "vitest";
import type { Program } from "../src/content/types";
import { deplierGenerique } from "../src/os/generique";
import { at, programLength, sousTitre, voiceAt } from "../src/apps/channel-pork/timeline";

const base: Program = {
  id: "x",
  title: "X",
  kind: "journal",
  slides: [{ image: "a.jpg", seconds: 10 }],
  subtitles: [{ at: 1, dur: 2, voice: "v.mp3", text: "Bonsoir." }],
};

describe("deplierGenerique", () => {
  it("laisse un programme sans générique tel quel", () => {
    expect(deplierGenerique(base)).toBe(base);
  });
  it("ajoute le carton, joue le jingle sans sous-titre, puis décale tout le programme", () => {
    const p = deplierGenerique({ ...base, generique: { image: "g.png", secondes: 4.5, son: "g.mp3" } });
    expect(programLength(p)).toBe(14.5);
    expect(at(p, 1).slide).toBe(0);
    expect(p.slides[0]).toMatchObject({ image: "g.png", fixe: true });
    expect(voiceAt(p, 1)).toMatchObject({ src: "g.mp3" });
    expect(sousTitre(p, 1)).toBeFalsy();
    expect(voiceAt(p, 5.6)).toMatchObject({ src: "v.mp3" });
    expect(sousTitre(p, 5.6)).toBe("Bonsoir.");
  });
  it("pour une bande intégrale (jingle déjà en tête), décale sans ajouter de voix", () => {
    const p = deplierGenerique({ ...base, bande: "b.mp3", generique: { image: "g.png", secondes: 3 } });
    expect(p.subtitles).toHaveLength(1);
    expect(p.subtitles[0]!.at).toBe(4);
  });
});
