import { MenuForm } from "@/components/menu/MenuForm";

export default async function AddMenuPage({ searchParams }: PageProps<"/dashboard/menu/tambah">) {
  const params = await searchParams;
  const tur = Array.isArray(params.tur) ? params.tur[0] : params.tur;
  return <MenuForm turAktif={tur === "2"} />;
}
