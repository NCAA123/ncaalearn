import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { TournamentHall3D } from "@/components/simulation/TournamentHall3D";
import { BoardExerciseRunner } from "@/components/learning/BoardExerciseRunner";
import { IncidentPanel } from "@/components/simulation/IncidentPanel";
import {
  completeAttempt,
  getScenarioForPlay,
  startAttempt,
  submitStepAnswer,
} from "@/lib/simulation.functions";

export const Route = createFileRoute("/_authenticated/simulations/$scenarioId")({
  head: () => ({ meta: [{ title: "Simulation — NCAA Academy" }] }),
  component: PlaySimulationPage,
});

type StepResult = { isCorrect: boolean; pointsAwarded: number; feedback: string | null; correctChoiceId: string | null };

function PlaySimulationPage() {
  const { scenarioId } = Route.useParams();
  const qc = useQueryClient();

  const getScenarioFn = useServerFn(getScenarioForPlay);
  const startFn = useServerFn(startAttempt);
  const submitFn = useServerFn(submitStepAnswer);
  const completeFn = useServerFn(completeAttempt);

  const {
    data: scenarioData,
    isLoading: loadingScenario,
    isError: scenarioErrored,
    error: scenarioError,
  } = useQuery({
    queryKey: ["simulation-play", scenarioId],
    queryFn: () => getScenarioFn({ data: { scenarioId } }),
    retry: false,
  });

  const {
    data: attemptData,
    isLoading: loadingAttempt,
    isError: attemptErrored,
    error: attemptError,
  } = useQuery({
    queryKey: ["simulation-attempt", scenarioId],
    queryFn: () => startFn({ data: { scenarioId } }),
    enabled: !scenarioErrored,
    retry: false,
  });

  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [result, setResult] = useState<StepResult | null>(null);
  const [finalSummary, setFinalSummary] = useState<{ score: number; maxScore: number; percentage: number; passed: boolean } | null>(null);

  useEffect(() => {
    if (attemptData) setAnsweredIds(attemptData.answeredStepIds);
  }, [attemptData]);

  const steps = scenarioData?.steps ?? [];
  const activeStep = steps.find((s) => !answeredIds.includes(s.id)) ?? null;
  const allAnswered = steps.length > 0 && !activeStep;

  const submit = useMutation({
    mutationFn: () => {
      if (!attemptData || !activeStep || !selectedChoice) throw new Error("Not ready");
      return submitFn({ data: { attemptId: attemptData.attemptId, stepId: activeStep.id, choiceId: selectedChoice } });
    },
    onSuccess: (res) => setResult(res),
  });

  const complete = useMutation({
    mutationFn: () => {
      if (!attemptData) throw new Error("Not ready");
      return completeFn({ data: { attemptId: attemptData.attemptId } });
    },
    onSuccess: (res) => {
      setFinalSummary(res);
      qc.invalidateQueries({ queryKey: ["my-simulation-attempts"] });
    },
  });

  function nextStation() {
    if (activeStep) setAnsweredIds((ids) => [...ids, activeStep.id]);
    setSelectedChoice(null);
    setResult(null);
  }

  if (scenarioErrored || attemptErrored) {
    return (
      <div>
        <Link to="/simulations" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to simulations
        </Link>
        <PageHeader title="Simulation unavailable" />
        <p className="text-sm text-muted-foreground max-w-md">
          {(scenarioError || attemptError) instanceof Error
            ? (scenarioError || attemptError)?.message
            : "This simulation couldn't be loaded -- it may not be published yet, or you may not have access to it."}
        </p>
      </div>
    );
  }

  if (loadingScenario || loadingAttempt || !scenarioData) {
    return (
      <div>
        <PageHeader title="Simulation" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <Link to="/simulations" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to simulations
      </Link>
      <PageHeader title={scenarioData.scenario.title} description={scenarioData.scenario.description ?? undefined} />

      <TournamentHall3D
        steps={steps}
        activeStepId={activeStep?.id ?? null}
        answeredStepIds={answeredIds}
      />

      <div className="mt-5 rounded-xl border border-border bg-card p-5 max-w-2xl">
        {finalSummary ? (
          <div className="text-center space-y-3">
            <div
              className={
                "inline-flex h-14 w-14 items-center justify-center rounded-full " +
                (finalSummary.passed ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/15 text-destructive")
              }
            >
              {finalSummary.passed ? <CheckCircle2 className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {finalSummary.passed ? "Passed" : "Not this time"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {finalSummary.score}/{finalSummary.maxScore} points ({finalSummary.percentage}%) — passing score is{" "}
              {scenarioData.scenario.passing_score}%
            </p>
            <Button asChild>
              <Link to="/simulations">Back to simulations</Link>
            </Button>
          </div>
        ) : allAnswered ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-foreground">All stations complete — ready to see your result?</p>
            <Button onClick={() => complete.mutate()} disabled={complete.isPending}>
              {complete.isPending ? "Scoring…" : "Finish simulation"}
            </Button>
          </div>
        ) : activeStep?.context?.incident ? (
          <div className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Station {steps.findIndex((s) => s.id === activeStep.id) + 1} of {steps.length}
            </p>
            <IncidentPanel key={activeStep.id} incident={activeStep.context.incident} stepId={activeStep.id} onDone={() => nextStation()} />
          </div>
        ) : activeStep?.context?.board_exercise ? (
          <div className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Station {steps.findIndex((s) => s.id === activeStep.id) + 1} of {steps.length}
            </p>
            <BoardExerciseRunner
              key={activeStep.id}
              exercise={activeStep.context.board_exercise}
              stepId={activeStep.id}
              mode="practice"
              onDone={() => nextStation()}
            />
          </div>
        ) : activeStep ? (
          <div className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Station {steps.findIndex((s) => s.id === activeStep.id) + 1} of {steps.length}
            </p>
            <p className="text-sm font-medium text-foreground leading-relaxed">{activeStep.prompt}</p>

            <div className="grid gap-2">
              {activeStep.choices.map((c) => {
                const isChosen = selectedChoice === c.id;
                const isCorrectChoice = result && result.correctChoiceId === c.id;
                const showState = !!result && (isChosen || isCorrectChoice);
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={!!result}
                    onClick={() => setSelectedChoice(c.id)}
                    className={
                      "text-left text-sm rounded-lg border px-3 py-2 transition " +
                      (showState
                        ? isCorrectChoice
                          ? "border-emerald-500/60 bg-emerald-500/10"
                          : isChosen
                            ? "border-destructive/60 bg-destructive/10"
                            : "border-border"
                        : isChosen
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted/40")
                    }
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {result?.feedback && (
              <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 border border-border px-3 py-2">
                {result.feedback}
              </p>
            )}

            <div className="flex justify-end">
              {result ? (
                <Button onClick={nextStation}>Next station</Button>
              ) : (
                <Button onClick={() => submit.mutate()} disabled={!selectedChoice || submit.isPending}>
                  {submit.isPending ? "Submitting…" : "Submit ruling"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">This simulation has no stations yet.</p>
        )}
      </div>
    </div>
  );
}
