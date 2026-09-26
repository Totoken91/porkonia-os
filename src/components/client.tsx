"use client";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/app/actions";
import { IconWarning } from "./icons";

export function ResultMessage({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <div className={`pk-alert ${result.ok ? "ok" : "error"}`} role={result.ok ? "status" : "alert"}>
      <span>{result.ok ? result.message : `${result.code === "CONFLIT" ? "CONFLIT — " : ""}${result.error}`}</span>
    </div>
  );
}

export interface ConfirmSpec {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
}

/** Boîte de confirmation explicite pour toute action sensible (supprimer, restaurer, remplacer…). */
export function useConfirm() {
  const ref = useRef<HTMLDialogElement>(null);
  const [spec, setSpec] = useState<ConfirmSpec | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const ask = (s: ConfirmSpec) =>
    new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setSpec(s);
      queueMicrotask(() => ref.current?.showModal());
    });
  const close = (ok: boolean) => {
    ref.current?.close();
    resolver.current?.(ok);
    resolver.current = null;
  };
  const dialog = (
    <dialog ref={ref} className="pk-dialog" onCancel={() => close(false)}>
      {spec && (
        <div className="pk-window">
          <div className="pk-titlebar">
            <span>{spec.title}</span>
          </div>
          <div className="pk-body flex gap-3">
            <IconWarning size={32} className="shrink-0" />
            <div className="text-[12px] leading-relaxed">{spec.message}</div>
          </div>
          <div className="flex justify-end gap-2 px-3 pb-3">
            <button type="button" className={`pk-btn ${spec.danger ? "danger" : "primary"}`} onClick={() => close(true)}>
              {spec.confirmLabel}
            </button>
            <button type="button" className="pk-btn" autoFocus onClick={() => close(false)}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
  return { ask, dialog };
}

export function ActionButton({
  action,
  children,
  className = "pk-btn",
  confirm,
  onDone,
  disabled,
  title,
}: {
  action: () => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  confirm?: ConfirmSpec;
  onDone?: (r: ActionResult) => void;
  disabled?: boolean;
  title?: string;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const router = useRouter();
  const { ask, dialog } = useConfirm();
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        className={className}
        disabled={pending || disabled}
        title={title}
        onClick={async () => {
          if (confirm && !(await ask(confirm))) return;
          start(async () => {
            const r = await action();
            setResult(r);
            onDone?.(r);
            router.refresh();
          });
        }}
      >
        {pending ? "Traitement…" : children}
      </button>
      {result && (
        <span className={`text-[11px] ${result.ok ? "text-[#245a1a]" : "text-[#8a1a12]"}`}>
          {result.ok ? result.message : result.error}
        </span>
      )}
      {dialog}
    </span>
  );
}

export function CopyButton({ text, label = "Copier" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="pk-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "Copié ✓" : label}
    </button>
  );
}

export function DownloadButton({ content, filename, mime = "text/markdown", label }: { content: string; filename: string; mime?: string; label: string }) {
  return (
    <button
      type="button"
      className="pk-btn"
      onClick={() => {
        const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
    >
      {label}
    </button>
  );
}

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return <span>{now ? now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</span>;
}
