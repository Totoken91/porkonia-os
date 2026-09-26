import "server-only";
import { connection } from "next/server";
import { readDb } from "@/data/store";
import type { Database } from "@/domain/types";

/** Lecture de la base pour un rendu de page (toujours à la requête, jamais figée au build). */
export async function getDb(): Promise<Readonly<Database>> {
  await connection();
  return readDb();
}
