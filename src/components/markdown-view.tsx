"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { expandInternalSyntax, type LinkIndex } from "@/domain/markdown";

/** Rendu Markdown sûr (pas de HTML brut interprété), avec liens internes et médias résolus. */
export function MarkdownView({ body, index }: { body: string; index: LinkIndex }) {
  return (
    <div className="prose-porko">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{expandInternalSyntax(body, index)}</ReactMarkdown>
    </div>
  );
}
