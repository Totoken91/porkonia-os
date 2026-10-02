import { describe, expect, it } from "vitest";
import type { Correspondant } from "../src/content/types";
import { porkosPack } from "../src/content/packs/porkos";
import { MAX_CORPS, MAX_FIL, consignes, construireMessages, filAvec, nettoyerReponse, texteDuCitoyen, trouverCorrespondant, validerDemande } from "../src/os/correspondance";

const liste = porkosPack.correspondants;
const marcel = liste.find((c) => c.id === "marcel") as Correspondant;

describe("correspondants du pack", () => {
  it("ont des identifiants et adresses uniques, une fiche courte et une réponse de secours", () => {
    expect(new Set(liste.map((c) => c.id)).size).toBe(liste.length);
    expect(new Set(liste.map((c) => c.adresse)).size).toBe(liste.length);
    for (const c of liste) {
      expect(c.adresse).toMatch(/^.+ <[^@\s]+@[^>\s]+\.pork>$/);
      expect(c.fiche.length).toBeLessThan(1400);
      expect(c.secours.length).toBeGreaterThan(20);
      expect(c.source).toBeTruthy();
    }
  });
  it("sont tous annoncés dans le courrier du Bureau du Courrier Citoyen", () => {
    const annonce = porkosPack.mails.find((m) => m.id === "m-carnet")!;
    for (const c of liste) expect(annonce.body).toContain(/<([^>]+)>/.exec(c.adresse)![1]);
  });
});

describe("trouverCorrespondant", () => {
  it("reconnaît l'adresse seule ou avec le nom, sans tenir compte de la casse", () => {
    expect(trouverCorrespondant("marcel.cochonnet@pignet.pork", liste)?.id).toBe("marcel");
    expect(trouverCorrespondant("Tonton <MARCEL.cochonnet@pignet.pork>", liste)?.id).toBe("marcel");
    expect(trouverCorrespondant("inconnu@pignet.pork", liste)).toBeUndefined();
    expect(trouverCorrespondant("", liste)).toBeUndefined();
  });
});

describe("texteDuCitoyen", () => {
  it("retire le message cité et la signature", () => {
    const corps = "Bonjour tonton\n\n-- \nCitoyen\n\n----- Message d'origine -----\nDe : Marcel\n> salut";
    expect(texteDuCitoyen(corps, "-- \nCitoyen")).toBe("Bonjour tonton");
  });
});

describe("validerDemande", () => {
  it("refuse ce qui n'est pas une demande bien formée", () => {
    expect(validerDemande(null, liste)).toBe("demande illisible");
    expect(validerDemande({ correspondant: "personne", corps: "x" }, liste)).toBe("correspondant inconnu");
    expect(validerDemande({ correspondant: "marcel", corps: "   " }, liste)).toBe("courrier vide");
    expect(validerDemande({ correspondant: "marcel", corps: "x".repeat(MAX_CORPS + 1) }, liste)).toBe("courrier trop long");
  });
  it("borne le fil et ignore les échanges mal formés", () => {
    const fil = [...Array(9)].map((_, i) => ({ de: i % 2 ? "personnage" : "citoyen", texte: `n${i}` }));
    const d = validerDemande({ correspondant: "marcel", objet: "Nappe", corps: " Coucou ", fil: [...fil, { de: "pirate", texte: "x" }, 3] }, liste);
    expect(typeof d).toBe("object");
    if (typeof d === "string") return;
    expect(d.corps).toBe("Coucou");
    expect(d.fil).toHaveLength(MAX_FIL);
    expect(d.fil.at(-1)!.texte).toBe("n8");
  });
});

describe("construireMessages", () => {
  it("pose les consignes et la fiche, le fil, puis le courrier", () => {
    const m = construireMessages(marcel, { correspondant: "marcel", objet: "Nappe", corps: "Elle fait combien ?", fil: [{ de: "personnage", texte: "Salut mon grand" }] });
    expect(m[0]!.role).toBe("system");
    expect(m[0]!.content).toContain("Tu es Tonton Marcel");
    expect(m[0]!.content).toContain(marcel.fiche);
    expect(m[1]).toEqual({ role: "assistant", content: "Salut mon grand" });
    expect(m.at(-1)).toEqual({ role: "user", content: "Objet : Nappe\n\nElle fait combien ?" });
  });
  it("interdit au personnage de sortir de son rôle", () => {
    expect(consignes(marcel)).toMatch(/intelligence artificielle/);
  });
});

describe("nettoyerReponse", () => {
  it("retire le Markdown et l'objet, et borne la longueur", () => {
    expect(nettoyerReponse("Objet : Re\n\n**Salut** *mon grand*\n\n\n\n- une chaise")).toBe("Salut mon grand\n\n— une chaise");
    expect(nettoyerReponse("mot ".repeat(1000)).length).toBeLessThanOrEqual(2501);
  });
});

describe("filAvec", () => {
  it("reprend les derniers échanges avec ce seul correspondant", () => {
    const msgs = [
      { folder: "envoyes", to: "Tonton Marcel <marcel.cochonnet@pignet.pork>", from: "moi", body: "Question" },
      { folder: "reception", from: "Tonton Marcel <marcel.cochonnet@pignet.pork>", to: "moi", body: "Réponse" },
      { folder: "reception", from: "Autre <x@y.pork>", to: "moi", body: "Bruit" },
    ];
    expect(filAvec(msgs, marcel)).toEqual([
      { de: "citoyen", texte: "Question" },
      { de: "personnage", texte: "Réponse" },
    ]);
  });
});
