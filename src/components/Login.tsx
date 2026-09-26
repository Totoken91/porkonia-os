"use client";
/** Ouverture de session : choix du profil, mot de passe (toujours accepté, toujours commenté). */
import { useState } from "react";
import type { ContentPack, UserProfile } from "@/content/types";
import { makeStr } from "@/os/context";
import { makeRng, pick } from "@/os/rng";
import { Icon } from "./Icon";

export function checkPassword(user: UserProfile, pw: string, pack: ContentPack, rnd: () => number): { ok: boolean; message: string } {
  if (user.guest) return { ok: true, message: pack.login.guestNotice };
  if (!pw.trim()) return { ok: false, message: pack.login.emptyPassword };
  if (user.password !== null && pw !== user.password) return { ok: false, message: pack.login.wrongPassword };
  if (/12|douze|douzi/i.test(pw)) return { ok: true, message: pack.login.patriotic };
  return { ok: true, message: pick(rnd, pack.login.acceptedAny) };
}

export function Login({ pack, onLogin }: { pack: ContentPack; onLogin(user: UserProfile): void }) {
  const str = makeStr(pack);
  const [userId, setUserId] = useState(pack.users[0]!.id);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [fails, setFails] = useState(0);
  const user = pack.users.find((u) => u.id === userId)!;

  const submit = (u: UserProfile) => {
    if (msg?.ok) return;
    const r = checkPassword(u, pw, pack, makeRng(Date.now()));
    setMsg({ ok: r.ok, text: r.message });
    if (r.ok) setTimeout(() => onLogin(u), 2200);
    else setFails((n) => n + 1);
  };

  const citizens = pack.users.filter((u) => !u.guest);
  const guest = pack.users.find((u) => u.guest);

  return (
    <div className="connexion" data-testid="login">
      <div className="trame" />
      <div className="connexion-grille">
        <div className="connexion-affiche">
          <small>{pack.os.vendor}</small>
          <h1>{pack.os.name}</h1>
          <p>
            {pack.os.edition} · {pack.os.version}
          </p>
        </div>
        <form
          className="pk-window focused connexion-fenetre"
          onSubmit={(e) => {
            e.preventDefault();
            submit(user);
          }}
        >
          <div className="pk-titlebar">
            <img src="/brand/embleme-64.png" alt="" width={18} height={18} />
            <h2>{str("login.titre")}</h2>
          </div>
          <div className="connexion-corps">
            <p className="invite">{pack.login.prompt}</p>
            {citizens.map((u) => (
              <button type="button" key={u.id} className="user-tile" aria-pressed={u.id === userId} onClick={() => { setUserId(u.id); setMsg(null); }}>
                <Icon name="carte" size={36} />
                <span>
                  <b>{u.displayName}</b>
                  <br />
                  {u.caption}
                </span>
              </button>
            ))}
            <label className="champ">
              {str("login.motdepasse")}
              <input className="pk-input" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} data-testid="login-password" autoComplete="off" />
            </label>
            {fails > 0 && user.passwordHint && <p className="indice">{user.passwordHint}</p>}
            {msg && (
              <p className={msg.ok ? "retour ok" : "retour"} role="status" data-testid="login-message">
                {msg.text}
              </p>
            )}
            <div className="actions">
              {guest && (
                <button type="button" className="pk-btn" onClick={() => submit(guest)}>
                  {str("login.invite")}
                </button>
              )}
              <button type="submit" className="pk-btn primary" data-testid="login-submit">
                {str("login.valider")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
