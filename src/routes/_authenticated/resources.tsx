import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
export const Route = createFileRoute("/_authenticated/resources")({
  head: () => ({ meta: [{ title: "Resources — NCAA Academy" }] }),
  component: () => <ComingSoon title="Resource Library" description="Downloadable rules, guides and reference materials." sprint="Sprint 8" />,
});