import { PageHeader, EmptyState } from "@/components/ui/page-header";

export function ComingSoon({ title, description, sprint }: { title: string; description: string; sprint: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        title={`${sprint} delivers this module`}
        description="The schema is in place. The full interface ships in the next build pass — see the project plan."
      />
    </>
  );
}