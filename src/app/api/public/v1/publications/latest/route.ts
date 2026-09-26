import { readDb } from "@/data/store";
import { publicationPackage } from "@/export/export";
import { corsHeaders } from "../../cors";

export async function GET() {
  const pkg = publicationPackage(await readDb());
  if (!pkg) return new Response(JSON.stringify({ error: "Aucune publication" }), { status: 404, headers: corsHeaders() });
  return new Response(JSON.stringify({ apiVersion: 1, ...pkg }), { headers: corsHeaders() });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
