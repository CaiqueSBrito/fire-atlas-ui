import { redirect } from "next/navigation";

// Entrada do ambiente principal: abre direto no mapa (CA01).
export default function ExploreIndex() {
  redirect("/explore/map");
}
