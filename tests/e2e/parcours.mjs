/**
 * Parcours de bout en bout (Chromium/Playwright) contre une instance lancée :
 *   BASE_URL=http://localhost:3000 node tests/e2e/parcours.mjs
 * Crée des données de test (préfixées « E2E ») dans la base courante : à lancer sur une base jetable
 * (PORKONIA_DATA_DIR=/tmp/porkonia-e2e npm run dev).
 */
import playwright from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const stamp = Date.now().toString(36);
const ok = (cond, msg) => {
  if (!cond) throw new Error("ÉCHEC : " + msg);
  console.log("✓ " + msg);
};

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const confirmDialog = async () => {
  const dlg = page.locator("dialog[open]");
  await dlg.waitFor();
  await dlg.locator("button.pk-btn").first().click();
};

try {
  // 1. Fiche personnage
  await page.goto(`${BASE}/personnages/nouveau`);
  await page.fill('input[name="canonicalName"]', `E2E Individu ${stamp}`);
  await page.fill('textarea[name="appearance"]', "Chapeau melon réglementaire.");
  await page.click("button:has-text('Créer la fiche')");
  await page.waitForURL(/\/personnages\/per_/);
  const charId = page.url().split("/").pop();
  ok(await page.getByText(`E2E Individu ${stamp}`).first().isVisible(), "fiche personnage créée " + charId);

  // modification + persistance après rechargement
  await page.fill('input[name="role"]', "Testeur assermenté");
  await page.click("button:has-text('Enregistrer (nouvelle révision 2)')");
  await page.getByText("Fiche enregistrée (révision 2)").waitFor();
  await page.reload();
  ok((await page.inputValue('input[name="role"]')) === "Testeur assermenté", "modification persistée après rechargement");

  // 2. Article
  await page.goto(`${BASE}/articles/nouveau`);
  await page.fill("input >> nth=0", `E2E Article ${stamp}`);
  await page.fill('textarea[aria-label="Corps de l\'article (Markdown)"]', "## Section\n\nTexte **gras** et lien [[guichet-4|guichet]].\n\n| a | b |\n|---|---|\n| 1 | 2 |");
  ok(await page.locator(".prose-porko table").first().isVisible(), "prévisualisation Markdown (tableau) affichée");
  await page.getByLabel(`E2E Individu ${stamp}`).check();
  await page.click("button:has-text('Créer le brouillon')");
  await page.waitForURL(/\/articles\/art_/);
  const artId = page.url().split("/").pop();
  ok(true, "article créé " + artId);

  // 3. Validation
  await page.click("button:has-text('Valider pour publication')");
  await confirmDialog();
  await page.locator(".badge", { hasText: "Validé" }).first().waitFor();
  ok(true, "article validé");

  // 4. Publication
  await page.goto(`${BASE}/publication`);
  await page.click("button:has-text('Créer la publication')");
  await confirmDialog();
  await page.getByText(/Publication n°\d+ créée/).waitFor({ timeout: 15000 });
  ok(true, "publication créée (non vérifiée)");

  // 5. API publique
  const res = await page.request.get(`${BASE}/api/public/v1/articles/${artId}`);
  const json = await res.json();
  ok(res.status() === 200 && json.article.title === `E2E Article ${stamp}`, "API publique renvoie l'article publié");
  const draft = await page.request.get(`${BASE}/api/public/v1/articles/la-prefecture-des-publications-article-de-demonstration`);
  ok(draft.status() === 404, "un brouillon n'est PAS exposé par l'API publique");

  // 6. Contexte IA
  await page.goto(`${BASE}/contextes?personnage=${charId}`);
  await page.click("button:has-text('Assembler le paquet documentaire')");
  const ctx = page.locator('textarea[aria-label="Contexte généré"]');
  await ctx.waitFor();
  const text = await ctx.inputValue();
  ok(text.includes(`E2E Individu ${stamp}`) && text.includes("Chapeau melon"), "contexte IA contient la fiche et l'apparence");
  ok(!text.includes("E2E Article"), "contexte IA n'inclut pas d'article non sélectionné");

  // 7. Protection du portrait : une variante non homologuée ne peut pas devenir portrait
  await page.goto(`${BASE}/personnages`);
  await page.click("text=Agent Groinard (démo)");
  await page.click("button[role=tab]:has-text('Portrait & galerie')");
  const variantCard = page.locator(".pk-window", { hasText: "Variante non officielle" }).last();
  ok(await variantCard.locator("button:has-text('Définir comme portrait')").isDisabled(), "variante non officielle : bouton portrait désactivé");

  ok(errors.length === 0, "aucune erreur JavaScript dans la page" + (errors.length ? " : " + errors.join(" | ") : ""));
  console.log("\nParcours complet réussi.");
} finally {
  await browser.close();
}
