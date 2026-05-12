/** Internal tone tables shared across primitives. */
import { cognipaceTokens } from "@design-system/theme";
import { alpha } from "@mui/material/styles";

import { Tone } from "../../ui/presentation/studyState";

export type AssistTone = Tone | "warning";

export const toneStyles: Record<Tone, { background: string; color: string }> = {
  default: {
    background: alpha(cognipaceTokens.mutedText, 0.12),
    color: cognipaceTokens.mutedText,
  },
  accent: {
    background: alpha(cognipaceTokens.accent, 0.16),
    color: cognipaceTokens.accentSoft,
  },
  info: {
    background: alpha(cognipaceTokens.info, 0.16),
    color: cognipaceTokens.info,
  },
  success: {
    background: alpha(cognipaceTokens.success, 0.16),
    color: cognipaceTokens.success,
  },
  danger: {
    background: alpha(cognipaceTokens.danger, 0.16),
    color: cognipaceTokens.danger,
  },
};

export const assistToneStyles: Record<AssistTone, { border: string; text: string }> = {
  default: {
    border: alpha(cognipaceTokens.outlineStrong, 0.18),
    text: cognipaceTokens.mutedText,
  },
  accent: {
    border: alpha(cognipaceTokens.accentSoft, 0.24),
    text: cognipaceTokens.accentSoft,
  },
  info: {
    border: alpha(cognipaceTokens.info, 0.24),
    text: cognipaceTokens.info,
  },
  success: {
    border: alpha(cognipaceTokens.success, 0.24),
    text: cognipaceTokens.success,
  },
  warning: {
    border: alpha(cognipaceTokens.warning, 0.32),
    text: cognipaceTokens.warning,
  },
  danger: {
    border: alpha(cognipaceTokens.danger, 0.24),
    text: cognipaceTokens.danger,
  },
};
