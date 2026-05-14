/**
 * Edit Problem dialog launched from a Library row. Lets the user fix
 * misimported metadata (difficulty / title / url / isPremium) and curate
 * topic + company assignments. Touched fields are flagged in
 * `Problem.userEdits` via `markUserEdit: true` so subsequent re-imports
 * preserve the manual overrides.
 */
import Autocomplete, {
  createFilterOptions,
} from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import React, { useState } from "react";

import {
  createCustomCompany,
  editProblem,
} from "../../../../../data/repositories/v7ActionRepository";

import type {
  CompanyLabel,
  ProblemView,
  TopicLabel,
} from "../../../domain/model";
import type { Difficulty } from "@features/problems";

export interface EditProblemModalProps {
  open: boolean;
  problem: ProblemView | null;
  topicChoices: TopicLabel[];
  companyChoices: CompanyLabel[];
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
}

const DIFFICULTY_OPTIONS: Difficulty[] = ["Easy", "Medium", "Hard", "Unknown"];

interface DraftState {
  title: string;
  difficulty: Difficulty;
  url: string;
  isPremium: boolean;
  topicIds: TopicLabel[];
  companyIds: CompanyLabel[];
}

/** Sentinel id used when the user wants to create a new custom Company
 * directly from the Autocomplete. The dropdown surfaces it as
 * `+ Add "<typed name>"`. The onChange handler swaps the sentinel for a
 * real CompanyLabel after dispatching CREATE_CUSTOM_COMPANY. */
const CREATE_COMPANY_SENTINEL = "__create_company__";

const companyFilter = createFilterOptions<CompanyLabel>({
  matchFrom: "any",
  trim: true,
});

/** Extracts the typed name out of a sentinel option's label `+ Add "X"`. */
function extractSentinelName(label: string): string {
  const match = /^\+ Add "(.+)"$/.exec(label);
  return match?.[1]?.trim() ?? "";
}

/**
 * Walks the Autocomplete's onChange payload, replacing free-solo strings
 * and the create-new sentinel with real CompanyLabel entries. Each new
 * entry dispatches CREATE_CUSTOM_COMPANY (idempotent on the handler
 * side — repeated names map to the same canonical id). Failures are
 * logged and the entry is dropped so the rest of the selection still
 * commits.
 */
async function resolveCompanySelection(
  next: ReadonlyArray<string | CompanyLabel>,
): Promise<CompanyLabel[]> {
  const resolved: CompanyLabel[] = [];
  const seenIds = new Set<string>();

  for (const entry of next) {
    let candidateName: string | null = null;
    let candidate: CompanyLabel | null = null;

    if (typeof entry === "string") {
      candidateName = entry.trim();
    } else if (entry.id === CREATE_COMPANY_SENTINEL) {
      candidateName = extractSentinelName(entry.name);
    } else {
      candidate = entry;
    }

    if (candidate) {
      if (!seenIds.has(candidate.id)) {
        seenIds.add(candidate.id);
        resolved.push(candidate);
      }
      continue;
    }

    if (!candidateName) continue;
    try {
      const result = await createCustomCompany({ name: candidateName });
      if (result?.id) {
        const created: CompanyLabel = {
          id: result.id,
          name: candidateName,
        };
        if (!seenIds.has(created.id)) {
          seenIds.add(created.id);
          resolved.push(created);
        }
      }
    } catch (err) {
      // Drop the bad entry rather than failing the whole selection.
      console.warn("Failed to create custom company", candidateName, err);
    }
  }

  return resolved;
}

function makeDraft(problem: ProblemView | null): DraftState {
  if (!problem) {
    return {
      title: "",
      difficulty: "Unknown",
      url: "",
      isPremium: false,
      topicIds: [],
      companyIds: [],
    };
  }
  return {
    title: problem.title,
    difficulty: problem.difficulty,
    url: problem.url,
    isPremium: problem.isPremium,
    topicIds: [...problem.topics],
    companyIds: [...problem.companies],
  };
}

export function EditProblemModal(props: EditProblemModalProps) {
  const { open, problem, topicChoices, companyChoices, onClose, onSaved } =
    props;

  const [draft, setDraft] = useState<DraftState>(() => makeDraft(problem));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync the draft when the dialog opens for a different problem
  // by deriving it during render instead of inside an effect.
  const [prevProblemSlug, setPrevProblemSlug] = useState<string | undefined>(problem?.slug);
  const [prevOpen, setPrevOpen] = useState(open);

  if (problem?.slug !== prevProblemSlug || open !== prevOpen) {
    setPrevProblemSlug(problem?.slug);
    setPrevOpen(open);
    setDraft(makeDraft(problem));
    setError(null);
  }

  const handleSave = async () => {
    if (!problem) return;
    setSaving(true);
    setError(null);
    try {
      const patch = buildPatch(draft, problem);
      await editProblem({
        slug: problem.slug,
        patch,
        markUserEdit: true,
      });
      await onSaved?.();
      onClose();
    } catch (err) {
      setError((err as Error).message || "Could not save the changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="edit-problem-dialog-title"
    >
      <DialogTitle id="edit-problem-dialog-title">
        {problem ? `Edit · ${problem.title}` : "Edit Problem"}
      </DialogTitle>
      <DialogContent dividers>
        {problem ? (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Title"
              value={draft.title}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, title: event.target.value }))
              }
              fullWidth
              size="small"
            />

            <FormControl size="small" fullWidth>
              <InputLabel id="edit-problem-difficulty">Difficulty</InputLabel>
              <Select
                labelId="edit-problem-difficulty"
                label="Difficulty"
                value={draft.difficulty}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    difficulty: event.target.value as Difficulty,
                  }))
                }
              >
                {DIFFICULTY_OPTIONS.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="LeetCode URL"
              value={draft.url}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, url: event.target.value }))
              }
              fullWidth
              size="small"
            />

            <Autocomplete
              multiple
              options={topicChoices}
              value={draft.topicIds}
              onChange={(_, next) => {
                setDraft((prev) => ({ ...prev, topicIds: next }));
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => option.name}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Topics"
                  placeholder="Add topic…"
                  size="small"
                />
              )}
            />

            <Autocomplete
              multiple
              freeSolo
              options={companyChoices}
              value={draft.companyIds}
              filterOptions={(options, params) => {
                const filtered = companyFilter(options, params);
                const inputValue = params.inputValue.trim();
                const matchesExisting = options.some(
                  (option) =>
                    option.name.toLowerCase() === inputValue.toLowerCase(),
                );
                if (inputValue && !matchesExisting) {
                  filtered.push({
                    id: CREATE_COMPANY_SENTINEL,
                    name: `+ Add "${inputValue}"`,
                  } satisfies CompanyLabel);
                }
                return filtered;
              }}
              onChange={async (_, next) => {
                const resolved = await resolveCompanySelection(next);
                setDraft((prev) => ({ ...prev, companyIds: resolved }));
              }}
              isOptionEqualToValue={(option, value) =>
                typeof option !== "string" &&
                typeof value !== "string" &&
                option.id === value.id
              }
              getOptionLabel={(option) =>
                typeof option === "string" ? option : option.name
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Companies"
                  placeholder="Type a company name to add a new one…"
                  size="small"
                />
              )}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={draft.isPremium}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      isPremium: event.target.checked,
                    }))
                  }
                />
              }
              label="LeetCode Premium"
            />

            {error ? (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            ) : null}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={saving || !problem}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Builds the patch payload the v7 EDIT_PROBLEM handler expects, including
 * only fields the user actually changed so `userEdits` flags don't get set
 * on untouched fields.
 */
function buildPatch(draft: DraftState, original: ProblemView) {
  const patch: {
    title?: string;
    difficulty?: Difficulty;
    url?: string;
    isPremium?: boolean;
    topicIds?: string[];
    companyIds?: string[];
  } = {};
  if (draft.title.trim() && draft.title !== original.title) {
    patch.title = draft.title.trim();
  }
  if (draft.difficulty !== original.difficulty) {
    patch.difficulty = draft.difficulty;
  }
  if (draft.url.trim() && draft.url !== original.url) {
    patch.url = draft.url.trim();
  }
  if (draft.isPremium !== original.isPremium) {
    patch.isPremium = draft.isPremium;
  }
  const topicIds = draft.topicIds.map((t) => t.id);
  if (!sameStringArray(topicIds, original.topics.map((t) => t.id))) {
    patch.topicIds = topicIds;
  }
  const companyIds = draft.companyIds.map((c) => c.id);
  if (!sameStringArray(companyIds, original.companies.map((c) => c.id))) {
    patch.companyIds = companyIds;
  }
  return patch;
}

function sameStringArray(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
