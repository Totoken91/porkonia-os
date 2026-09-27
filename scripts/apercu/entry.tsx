import { createRoot } from "react-dom/client";
import { PorkOS } from "@/components/PorkOS";
import { porkosPack } from "@/content/packs/porkos";
createRoot(document.getElementById("porkos")!).render(<PorkOS pack={porkosPack} />);
