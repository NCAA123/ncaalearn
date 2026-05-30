import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
export const Route = createFileRoute("/_authenticated/certificates")({
  head: () => ({ meta: [{ title: "Certificates — NCAA Academy" }] }),
  component: () => <ComingSoon title="My certificates" description="Download and verify your digital certificates." sprint="Sprint 7" />,
});