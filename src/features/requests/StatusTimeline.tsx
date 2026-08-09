import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDateTime } from "@/lib/format"
import { STATUS_LABELS } from "@/domain/requestStatus"
import { DRIVER_FORWARD_SEQUENCE, type RequestStatus } from "@/types/enums"
import { AttachmentField } from "@/components/shared/AttachmentField"
import type { HistoricoStatusSolicitacao } from "@/types/entities"

interface StatusTimelineProps {
  currentStatus: RequestStatus
  hadScheduledStart: boolean
  historico: HistoricoStatusSolicitacao[]
}

type StepState = "completed" | "current" | "skipped" | "upcoming"

interface Step {
  status: RequestStatus
  state: StepState
  entry?: HistoricoStatusSolicitacao
}

export function StatusTimeline({ currentStatus, hadScheduledStart, historico }: StatusTimelineProps) {
  const sequence: RequestStatus[] = hadScheduledStart
    ? ["agendada", ...DRIVER_FORWARD_SEQUENCE]
    : DRIVER_FORWARD_SEQUENCE

  const isCancelled = currentStatus === "cancelada"
  const currentIndex = sequence.indexOf(currentStatus)

  const steps: Step[] = sequence.map((status, index) => {
    const entry = historico.find((h) => h.status === status)
    let state: StepState
    if (entry) state = status === currentStatus ? "current" : "completed"
    else if (!isCancelled && index < currentIndex) state = "skipped"
    else if (isCancelled && index < sequence.length) state = entry ? "completed" : "skipped"
    else state = "upcoming"
    return { status, state, entry }
  })

  const cancelledEntry = historico.find((h) => h.status === "cancelada")

  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
  function toggle(status: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  return (
    <div className="space-y-0">
      {steps.map((step, index) => (
        <TimelineRow
          key={step.status}
          step={step}
          isLast={index === steps.length - 1 && !isCancelled}
          isExpanded={expanded.has(step.status)}
          onToggle={() => toggle(step.status)}
        />
      ))}
      {isCancelled && cancelledEntry && (
        <TimelineRow
          step={{ status: "cancelada", state: "current", entry: cancelledEntry }}
          isLast
          isExpanded={expanded.has("cancelada")}
          onToggle={() => toggle("cancelada")}
          cancelledVariant
        />
      )}
    </div>
  )
}

function TimelineRow({
  step,
  isLast,
  isExpanded,
  onToggle,
  cancelledVariant = false,
}: {
  step: Step
  isLast: boolean
  isExpanded: boolean
  onToggle: () => void
  cancelledVariant?: boolean
}) {
  const canExpand = !!step.entry
  const isDone = step.state === "completed" || step.state === "current"

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs",
            cancelledVariant
              ? "border-destructive bg-destructive text-destructive-foreground"
              : isDone
                ? "border-primary bg-primary text-primary-foreground"
                : step.state === "skipped"
                  ? "border-border bg-muted text-muted-foreground"
                  : "border-border bg-background text-muted-foreground",
          )}
        >
          {cancelledVariant ? (
            <X className="size-3.5" />
          ) : isDone ? (
            <Check className="size-3.5" />
          ) : null}
        </div>
        {!isLast && <div className="w-px flex-1 bg-border" />}
      </div>
      <div className={cn("min-w-0 flex-1", !isLast && "pb-4")}>
        <button
          type="button"
          disabled={!canExpand}
          onClick={onToggle}
          className={cn(
            "flex w-full items-center gap-2 text-left text-sm",
            canExpand && "cursor-pointer",
            !isDone && !cancelledVariant && "text-muted-foreground",
          )}
        >
          <span className="font-medium">
            {STATUS_LABELS[step.status]}
            {step.state === "skipped" && !cancelledVariant && " (pulado)"}
          </span>
          {step.entry && (
            <span className="text-xs text-muted-foreground">
              {formatDateTime(step.entry.changed_at)}
            </span>
          )}
          {canExpand && (
            <ChevronDown className={cn("size-3.5 transition-transform", isExpanded && "rotate-180")} />
          )}
        </button>
        {isExpanded && step.entry && (
          <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
            <p className="text-xs text-muted-foreground">
              Por {step.entry.changed_by_name}
            </p>
            {step.entry.notes && <p>{step.entry.notes}</p>}
            {step.entry.attachments.length > 0 && (
              <AttachmentField value={step.entry.attachments} readOnly />
            )}
          </div>
        )}
      </div>
    </div>
  )
}