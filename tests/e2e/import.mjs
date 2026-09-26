/**
 * Parcours navigateur de l'importation (prévisualisation → application → annulation).
 * Serveur à lancer sur une base VIDE et un dossier d'imports contenant l'extraction du mini-site :
 *   node scripts/porkopedia-extract.mjs --from tests/fixtures/mini-site --out /tmp/pk-imp/ext_…   (voir README)
 *   PORKONIA_DATA_DIR=/tmp/pk-imp-data PORKONIA_IMPORTS_DIR=/tmp/pk-imp npm start
 *   BASE_URL=http://localhost:3000 node tests/e2e/import.mjs
 */
import playwright from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const ok = (c, m) => {
  if (!c) throw new Error("ÉCHEC : " + m);
  console.log("✓ " + m);
};
const b = await playwright.chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const confirm = async () => {
  const d = p.locator("dialog[open]");
  await d.waitFor();
  await d.locator("button.pk-btn").first().click();
};
try {
  await p.goto(`${BASE}/import`);
  await p.click("a:has-text('Prévisualiser…') >> nth=0");
  await p.waitForURL(/\/import\/porkopedia\/ext_/);
  ok(await p.getByText("articles détectés").isVisible(), "prévisualisation affichée");
  ok((await p.locator(".stat-tile").first().innerText()).includes("3"), "3 articles détectés");
  await p.click("button[role=tab]:has-text('Liens & provenance')");
  ok(await p.getByText("gamma").first().isVisible(), "lien interne cassé signalé (beta → gamma)");
  await p.click("button:has-text('Appliquer l')");
  await confirm();
  await p.waitForURL(/\/import\/lot\/imp_/, { timeout: 60000 });
  ok(await p.getByText("articlesCrees : 3").isVisible(), "import appliqué : 3 articles créés");
  await p.goto(`${BASE}/a/douzi`);
  ok(await p.getByText("Article protégé.").isVisible(), "Douzi protégé après import");
  await p.goto(`${BASE}/import`);
  ok(await p.locator("tr", { hasText: "Appliqué" }).count() === 1, "import listé dans le registre");
  await p.click("button:has-text('Annuler…')");
  await confirm();
  await p.locator(".badge", { hasText: "Annulé" }).first().waitFor({ timeout: 60000 });
  ok(await p.locator(".badge", { hasText: "Annulé" }).count() === 1, "import annulé");
  await p.goto(`${BASE}/corbeille`);
  ok(await p.getByText("Alpha").first().isVisible(), "articles annulés présents dans la corbeille (rien d'effacé)");
  ok(errors.length === 0, "aucune erreur JavaScript" + (errors.length ? " : " + errors.join(" | ") : ""));
  console.log("\nParcours d'importation réussi.");
} finally {
  await b.close();
}
