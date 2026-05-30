import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
export const Route = createFileRoute("/_authenticated/license")({
  head: () => ({ meta: [{ title: "My License — NCAA Academy" }] }),
  component: () => <ComingSoon title="My License" description="Active license, status and renewal." sprint="Sprint 7" />,
});