import type { CompanyLabel } from "./CompanyLabel";
import type { TopicLabel } from "./TopicLabel";
import type { EditableProblemField } from "../problems/model";
import type { Difficulty } from "../types/Difficulty";


/**
 * UI-friendly view of a Problem. Identical to the entity except topic
 * and company FKs are pre-joined to display labels and `editedFields`
 * is a flat list (the underlying flag map is awkward to iterate).
 */
export interface ProblemView {
  slug: string;
  title: string;
  difficulty: Difficulty;
  isPremium: boolean;
  url: string;
  leetcodeId?: string;
  topics: TopicLabel[];
  companies: CompanyLabel[];
  editedFields: EditableProblemField[];
}
