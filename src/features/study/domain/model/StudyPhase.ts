import type { StudyPhaseEnum } from "./StudyPhaseEnum";

export type StudyPhase = keyof typeof StudyPhaseEnum | "Suspended";
