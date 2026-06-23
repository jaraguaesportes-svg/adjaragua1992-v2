import { EntityList } from "@/components/ui/EntityList";

export default function Page() {
  return (
    <EntityList
      title="Sources"
      description="Tela inicial de administração da coleção sources."
      collection="sources"
      fields={["id", "slug", "status", "sourceIds", "createdAt", "updatedAt"]}
    />
  );
}
