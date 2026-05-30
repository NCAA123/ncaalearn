import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
export const Route = createFileRoute("/_authenticated/exams")({
  head: () => ({ meta: [{ title: "Examinations — NCAA Academy" }] }),
  component: () => <ComingSoon title="Examinations" description="Certification and recertification exams." sprint="Sprint 5–6" />,
});