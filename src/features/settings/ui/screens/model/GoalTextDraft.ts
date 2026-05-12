export interface GoalTextDraft {
  sourceMs: number;
  value: string;
}

export function msToMinutes(value: number): number {
  return Math.round(value / 60000);
}

export function minutesToMs(value: number): number {
  return Math.round(value) * 60000;
}

export function createGoalTextDraft(sourceMs: number): GoalTextDraft {
  return {
    sourceMs,
    value: String(msToMinutes(sourceMs)),
  };
}

export function parseGoalMinutes(value: string): number {
  return value === "" ? 0 : parseInt(value, 10);
}

export function resolveGoalTextDraft(
  draft: GoalTextDraft,
  sourceMs: number
): GoalTextDraft {
  if (draft.sourceMs === sourceMs) {
    return draft;
  }

  const nextMinutes = msToMinutes(sourceMs);
  if (parseGoalMinutes(draft.value) === nextMinutes) {
    return {
      sourceMs,
      value: draft.value,
    };
  }

  return createGoalTextDraft(sourceMs);
}
