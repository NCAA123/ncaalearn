import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
export const Route = createFileRoute("/_authenticated/cpd")({
  head: () => ({ meta: [{ title: "CPD Tracker — NCAA Academy" }] }),
  component: () => <ComingSoon title="CPD Tracker" description="Log and review your CPD activities." sprint="Sprint 7 / 11" />,
});