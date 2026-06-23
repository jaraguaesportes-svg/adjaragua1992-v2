import { EntityList } from "@/components/ui/EntityList";

export default function Page() {
  return (
    <EntityList
      title="Opponents"
      description="Tela inicial de administração da coleção opponents."
      collection="opponents"
      fields={["id", "slug", "status", "sourceIds", "createdAt", "updatedAt"]}
    />
  );
}
