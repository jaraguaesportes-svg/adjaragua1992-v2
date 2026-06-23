import { EntityList } from "@/components/ui/EntityList";

export default function Page() {
  return (
    <EntityList
      title="Competitions"
      description="Tela inicial de administração da coleção competitions."
      collection="competitions"
      fields={["id", "slug", "status", "sourceIds", "createdAt", "updatedAt"]}
    />
  );
}
