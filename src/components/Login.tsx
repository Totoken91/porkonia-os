"use client";
/** Ouverture de session : choix du profil, mot de passe (toujours accepté, toujours commenté). */
import { useState } from "react";
import type { ContentPack, UserProfile } from "@/content/types";
import { makeStr } from "@/os/context";
import { makeRng, pick } from "@/os/rng";
import type { Fond } from "@/os/settings";
import { Icon } from "./Icon";
import { Wallpaper } from "./Wallpaper";

export function checkPassword(user: UserProfile, pw: string, pack: ContentPack, rnd: () => number): { ok: boolean; message: string } {
  if (user.guest) return { ok: true, message: pack.login.guestNotice };
  if (!pw.trim()) return { ok: false, message: pack.login.emptyPassword };
  if (user.password !== null && pw !== user.password) return { ok: false, message: pack.login.wrongPassword };
  if (/12|douze|douzi/i.test(pw)) return { ok: true, message: pack.login.patriotic };
  return { ok: true, message: pick(rnd, pack.login.acceptedAny) };
}

export function Login({ pack, fond, onLogin }: { pack: ContentPack; fond: Fond; onLogin(user: UserProfile): void }) {
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
      <Wallpaper pack={pack} fond={fond} />
      <form
        className="pk-window focused connexion-fenetre"
        onSubmit={(e) => {
          e.preventDefault();
          submit(user);
        }}
      >
        <div className="pk-titlebar">
          <Icon name="cadenas" size={16} />
          <h2>{str("login.titre")}</h2>
        </div>
        <div className="connexion-bandeau">
          <img src="/brand/embleme-64.png" alt="" width={48} height={48} />
          <div>
            <b>{pack.os.name}</b> <span>{pack.os.edition}</span>
            <small>{pack.os.vendor}</small>
          </div>
        </div>
        <div className="connexion-corps">
          <p className="invite">{pack.login.prompt}</p>
          <div className="connexion-profils">
            {citizens.map((u) => (
              <button type="button" key={u.id} className="user-tile" aria-pressed={u.id === userId} onClick={() => { setUserId(u.id); setMsg(null); }}>
                <Icon name="carte" size={28} />
                <span>
                  <b>{u.displayName}</b>
                  <br />
                  {u.caption}
                </span>
              </button>
            ))}
          </div>
          <label className="champ">
            <span>{str("login.motdepasse")} :</span>
            <input className="pk-input" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} data-testid="login-password" autoComplete="off" />
          </label>
          {fails > 0 && user.passwordHint && <p className="indice">{user.passwordHint}</p>}
          {msg && (
            <p className={msg.ok ? "retour ok" : "retour"} role="status" data-testid="login-message">
              {msg.text}
            </p>
          )}
          <div className="actions">
            <button type="submit" className="pk-btn primary" data-testid="login-submit">
              {str("login.valider")}
            </button>
            {guest && (
              <button type="button" className="pk-btn" onClick={() => submit(guest)}>
                {str("login.invite")}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
