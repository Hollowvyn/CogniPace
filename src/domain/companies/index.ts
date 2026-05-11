export type { Company } from "./model";
export {
  asCompanyStudySet,
  buildCompanyPool,
  resolveActiveCompanyPool,
  type CompanyPool,
} from "./pool";
export {
  coverageQuotaForToday,
  daysUntilTarget,
  isInterviewTargetActive,
  isInterviewTargetForCompany,
  resolveEffectiveDailyGoal,
} from "./interviewTarget";
