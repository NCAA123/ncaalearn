import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — NCAA Academy" }] }),
  component: () => <ComingSoon title="Admin overview" description="System metrics and management." sprint="Sprint 8" />,
});