import { NextResponse } from "next/server";
import { registerDocx } from "@/bible/docx-store";

/** Réception d'un DOCX : copie intacte (empreinte), analyse, puis redirection vers la prévisualisation. */
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".docx")) return NextResponse.json({ error: "Fichier .docx attendu." }, { status: 400 });
  try {
    const r = await registerDocx(Buffer.from(await file.arrayBuffer()), file.name);
    return NextResponse.redirect(new URL(`/import/bible/${r.sha256}`, req.url), 303);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
