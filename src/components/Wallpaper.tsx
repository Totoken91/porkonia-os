/** Fond d'écran du bureau (uni, portrait centré ou mosaïque d'emblèmes). */
import type { ContentPack } from "@/content/types";
import type { Fond } from "@/os/settings";

export function Wallpaper({ pack, fond }: { pack: ContentPack; fond: Fond }) {
  return (
    <div className={`fond fond-${fond}`} aria-hidden="true">
      {fond === "fondateur" && pack.wallpaper?.portrait && <img src={pack.wallpaper.portrait} alt="" referrerPolicy="no-referrer" />}
    </div>
  );
}
