import { describe, expect, it } from "vitest";
import type { Mail } from "@/content/types";
import { deliver, forward, inFolder, initBoite, markRead, move, reply, sanitizeBoite, saveDraft, send, unread } from "@/os/mailbox";
import { porkosPack } from "@/content/packs/porkos";

const m = (id: string, extra: Partial<Mail> = {}): Mail => ({ id, folder: "reception", from: "A <a@x>", to: "moi", date: "hier", subject: `S ${id}`, body: "Ligne 1\nLigne 2", ...extra });

describe("boîte aux lettres", () => {
  it("n'ouvre au départ que les messages déjà arrivés, puis livre les tardifs une seule fois", () => {
    let b = initBoite([m("a"), m("b", { later: true })]);
    expect(b.messages.map((x) => x.id)).toEqual(["a"]);
    b = deliver(b, m("b", { later: true }), "maintenant");
    b = deliver(b, m("b", { later: true }), "encore");
    expect(b.messages.filter((x) => x.id === "b")).toHaveLength(1);
    expect(unread(b)).toBe(2);
    expect(inFolder(b, "reception")[0]!.id).toBe("b");
  });
  it("lit, déplace en corbeille, ne détruit jamais", () => {
    let b = initBoite([m("a")]);
    b = markRead(b, "a");
    expect(unread(b)).toBe(0);
    b = move(b, "a", "corbeille");
    expect(inFolder(b, "corbeille")).toHaveLength(1);
    expect(b.messages).toHaveLength(1);
  });
  it("brouillons et envois", () => {
    let b = initBoite([]);
    let id: string;
    [b, id] = saveDraft(b, { to: "x", subject: "Objet", body: "..." }, "moi", "t");
    [b] = saveDraft(b, { to: "y", subject: "Objet 2", body: "…" }, "moi", "t", id);
    expect(inFolder(b, "brouillons")).toHaveLength(1);
    expect(inFolder(b, "brouillons")[0]!.to).toBe("y");
    const [b2, envoi] = send(b, { to: "y", subject: "Objet 2", body: "…" }, "moi", "t", id);
    expect(inFolder(b2, "brouillons")).toHaveLength(0);
    expect(inFolder(b2, "envoyes")[0]!.id).toBe(envoi.id);
  });
  it("répond et transfère en citant l'original", () => {
    const r = reply(m("a"), "--\nCitoyen");
    expect(r.subject).toBe("RE: S a");
    expect(r.to).toBe("A <a@x>");
    expect(r.body).toContain("> Ligne 2");
    expect(reply({ ...m("a"), subject: "RE: S a" }, "").subject).toBe("RE: S a");
    expect(forward(m("a"), "").subject).toBe("TR: S a");
  });
  it("répare une boîte enregistrée abîmée", () => {
    expect(sanitizeBoite(null, [m("a")]).messages).toHaveLength(1);
    expect(sanitizeBoite({ seq: 3, messages: [m("z"), { id: 1 }] }, []).messages.map((x) => x.id)).toEqual(["z"]);
  });
  it("le pack a une boîte crédible : chaque dossier est peuplé, les tardifs sont livrés par une règle", () => {
    const b = initBoite(porkosPack.mails);
    for (const d of ["reception", "envoyes", "brouillons", "corbeille"] as const) expect(inFolder(b, d).length).toBeGreaterThan(0);
    const tardifs = porkosPack.mails.filter((x) => x.later).map((x) => x.id);
    expect(tardifs.length).toBeGreaterThan(0);
    const livres = porkosPack.rules.flatMap((r) => (r.action.type === "mail" ? [r.action.id] : []));
    for (const id of tardifs) expect(livres).toContain(id);
    expect(new Set(porkosPack.mails.map((x) => x.id)).size).toBe(porkosPack.mails.length);
  });
});
