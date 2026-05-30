import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — NCAA Academy" }] }),
  component: () => <ComingSoon title="Notifications" description="Your in-app notifications." sprint="Sprint 7" />,
});