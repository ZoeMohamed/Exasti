import { MenuForm } from "@/components/menu/MenuForm";

export default async function AddMenuPage({ searchParams }: PageProps<"/dashboard/menu/tambah">) {
  const params = await searchParams;
  const dari = Array.isArray(params.dari) ? params.dari[0] : params.dari;
  return <MenuForm kembaliKePanduan={dari === "panduan"} />;
}
