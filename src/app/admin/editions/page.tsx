import { EntityList } from "@/components/ui/EntityList";

export default function Page() {
  return (
    <EntityList
      title="Editions"
      description="Tela inicial de administração da coleção editions."
      collection="editions"
      fields={["id", "slug", "status", "sourceIds", "createdAt", "updatedAt"]}
    />
  );
}
