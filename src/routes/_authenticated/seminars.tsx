import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
export const Route = createFileRoute("/_authenticated/seminars")({
  head: () => ({ meta: [{ title: "Seminars — NCAA Academy" }] }),
  component: () => <ComingSoon title="Seminars" description="Online, in-person and hybrid arbiter seminars." sprint="Sprint 4" />,
});