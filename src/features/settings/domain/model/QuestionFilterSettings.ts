export interface QuestionFilterSettings {
  /** When on, premium-locked problems are treated as suspended — they
   * don't appear in the queue and surface with a Suspended badge in
   * the library/tracks tables. */
  skipPremium: boolean;
}
