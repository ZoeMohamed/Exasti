import { MenuForm } from "@/components/menu/MenuForm";

export default async function AddMenuPage({ searchParams }: PageProps<"/dashboard/menu/tambah">) {
  const params = await searchParams;
  const panduan = Array.isArray(params.panduan) ? params.panduan[0] : params.panduan;
  return <MenuForm panduanAktif={panduan === "2"} />;
}
