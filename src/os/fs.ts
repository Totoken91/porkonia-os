/** Navigation dans le système de fichiers du pack (chemins = noms joints par « / »). */
import type { FsNode } from "@/content/types";

export const splitPath = (path: string): string[] => path.split("/").filter(Boolean);
export const joinPath = (parts: string[]): string => parts.join("/");

export function resolve(root: FsNode, path: string): FsNode | null {
  let node: FsNode = root;
  for (const name of splitPath(path)) {
    if (node.type !== "dossier") return null;
    const next: FsNode | undefined = node.children.find((c) => c.name === name);
    if (!next) return null;
    node = next;
  }
  return node;
}

export const parentPath = (path: string): string => joinPath(splitPath(path).slice(0, -1));
export const childPath = (path: string, name: string): string => joinPath([...splitPath(path), name]);
