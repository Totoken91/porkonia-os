/** Fond d'écran du bureau (uni, portrait centré, mosaïque d'emblèmes ou image du pack). */
import type { ContentPack } from "@/content/types";
import type { Fond } from "@/os/settings";

/** Image du pack désignée par un fond « image:<id> » ; un identifiant inconnu revient au vert bouteille. */
export function imageDeFond(pack: ContentPack, fond: Fond) {
  return fond.startsWith("image:") ? pack.wallpaper?.images?.find((i) => `image:${i.id}` === fond) : undefined;
}

export function Wallpaper({ pack, fond }: { pack: ContentPack; fond: Fond }) {
  const img = imageDeFond(pack, fond);
  if (img) return <div className="fond fond-image" style={{ backgroundImage: `url(${img.image})` }} aria-hidden="true" />;
  const uni = fond.startsWith("image:") ? "bouteille" : fond;
  return (
    <div className={`fond fond-${uni}`} aria-hidden="true">
      {uni === "fondateur" && pack.wallpaper?.portrait && <img src={pack.wallpaper.portrait} alt="" referrerPolicy="no-referrer" />}
    </div>
  );
}
