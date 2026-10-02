/**
 * Relais du Courrier d'État : le citoyen écrit à une personnalité, la réponse est rédigée en personnage par un modèle
 * ouvert hébergé par Groq (offre gratuite). Ce fichier n'existe que sur le serveur (build Vercel, voir next.config.ts) :
 * la clé GROQ_API_KEY ne quitte jamais le serveur, et l'invite (consignes + fiche du pack) est fixée ici, pas par le
 * navigateur, pour que le relais ne serve à rien d'autre qu'à faire répondre les personnages.
 */
import { porkosPack } from "@/content/packs/porkos";
import { construireMessages, nettoyerReponse, validerDemande } from "@/os/correspondance";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODELE = process.env.GROQ_MODELE || "openai/gpt-oss-120b";
const API = "https://api.groq.com/openai/v1/chat/completions";

const refus = (erreur: string, status: number) => Response.json({ erreur }, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  const cle = process.env.GROQ_API_KEY;
  if (!cle) return refus("relais non configuré", 503);
  // Seules les pages de PorkOS appellent le relais.
  const origine = req.headers.get("origin");
  const hote = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origine && hote && new URL(origine).host !== hote) return refus("origine refusée", 403);

  let brut: unknown;
  try {
    brut = await req.json();
  } catch {
    return refus("demande illisible", 400);
  }
  const d = validerDemande(brut, porkosPack.correspondants);
  if (typeof d === "string") return refus(d, 400);
  const c = porkosPack.correspondants.find((x) => x.id === d.correspondant)!;

  let r: Response;
  try {
    r = await fetch(API, {
      method: "POST",
      headers: { authorization: `Bearer ${cle}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: MODELE,
        messages: construireMessages(c, d),
        temperature: 0.9,
        max_completion_tokens: 900,
        // Modèle à raisonnement : on le garde bref et on ne renvoie que la lettre.
        reasoning_effort: "low",
        include_reasoning: false,
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    return refus("relais injoignable", 502);
  }
  if (r.status === 429) return refus("quota atteint", 429);
  if (!r.ok) return refus(`relais en erreur (${r.status})`, 502);
  const j = (await r.json().catch(() => null)) as { choices?: { message?: { content?: string } }[] } | null;
  const texte = j?.choices?.[0]?.message?.content;
  if (!texte?.trim()) return refus("réponse vide", 502);
  return Response.json({ corps: nettoyerReponse(texte) }, { headers: { "cache-control": "no-store" } });
}
