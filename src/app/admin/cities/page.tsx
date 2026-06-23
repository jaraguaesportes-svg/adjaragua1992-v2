import { EntityList } from "@/components/ui/EntityList";

export default function Page() {
  return (
    <EntityList
      title="Cities"
      description="Tela inicial de administração da coleção cities."
      collection="cities"
      fields={["id", "slug", "status", "sourceIds", "createdAt", "updatedAt"]}
    />
  );
}
