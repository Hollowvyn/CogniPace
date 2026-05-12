/** Dashboard settings screen. The screen owns its own draft + intents
 * via `useSettingsScreen` (the feature's ViewModel hook); the View is
 * a function of that model. Cross-feature concerns (backup export /
 * import, study-history reset) still arrive as props until those
 * features migrate in Phase 7. */
import { SurfaceDivider } from "@design-system/atoms";
import Box from "@mui/material/Box";

import { useSettingsScreen } from "../hooks/useSettingsScreen";

import {
  SettingsCanvas,
  SettingsGrid,
  SettingsSection,
} from "./components/SettingsLayout";
import { SettingsSaveBar } from "./components/SettingsSaveBar";
import {
  HistoryResetSection,
  LocalDataSection,
} from "./sections/DataManagementSection";
import { MemoryReviewSection } from "./sections/MemoryReviewSection";
import { NotificationsSection } from "./sections/NotificationsSection";
import { PracticePlanSection } from "./sections/PracticePlanSection";
import { QuestionFiltersSection } from "./sections/QuestionFiltersSection";
import { TimingGoalsSection } from "./sections/TimingGoalsSection";

import type { UserSettings } from "../../domain/model";

export interface SettingsViewStatus {
  message: string;
  isError: boolean;
}

export interface SettingsViewProps {
  /** Persisted snapshot the feature's draft starts from. `null` while
   *  the parent is still hydrating. */
  currentSettings: UserSettings | null;
  /** Bubble up status from save / reset intents so the parent surface
   *  can render its toast / banner. */
  onStatus: (status: SettingsViewStatus) => void;
  /** Optional: parent updates its payload state when the SW
   *  acknowledges a save. In real extension mode the bus tick also
   *  triggers a re-fetch; this callback is what carries the new
   *  snapshot in non-extension / test contexts where no tick fires. */
  onSettingsSaved?: (saved: UserSettings) => void;

  // Cross-feature concerns — still parent-owned until their features
  // migrate. Phase 7 backup feature absorbs the export/import props;
  // Phase 7 study feature absorbs onResetStudyHistory.
  importFile: File | null;
  onSetImportFile: (file: File | null) => void;
  onExportData: () => Promise<void>;
  onImportData: () => Promise<void>;
  onResetStudyHistory: () => void;
}

export function SettingsView(props: SettingsViewProps) {
  const screen = useSettingsScreen({ currentSettings: props.currentSettings });

  const handleSave = async (): Promise<void> => {
    const result = await screen.saveDraft();
    if (result.ok) {
      props.onSettingsSaved?.(result.settings);
      props.onStatus({ message: "Settings saved.", isError: false });
    } else {
      props.onStatus({ message: result.error, isError: true });
    }
  };

  const handleResetToDefaults = async (): Promise<void> => {
    const result = await screen.resetToDefaults();
    if (result.ok) {
      props.onSettingsSaved?.(result.settings);
      props.onStatus({ message: "Settings reset to defaults.", isError: false });
    } else {
      props.onStatus({ message: result.error, isError: true });
    }
  };

  // Loading guard: while the parent hasn't hydrated the snapshot yet,
  // the draft has nothing to clone from. Render the chrome but keep
  // the sections empty.
  if (!screen.draftSettings) {
    return (
      <SettingsCanvas>
        <SettingsGrid>
          <Box sx={{ gridColumn: "1 / -1", minWidth: 0 }} />
        </SettingsGrid>
      </SettingsCanvas>
    );
  }

  return (
    <SettingsCanvas>
      <SettingsGrid>
        <Box sx={{ gridColumn: "1 / -1", minWidth: 0 }}>
          <SettingsSaveBar
            canDiscardSettings={screen.hasChanges}
            canResetSettingsToDefaults={!screen.isDefaultDraft}
            canSaveSettings={screen.hasChanges}
            onDiscardSettings={screen.discardDraft}
            onResetSettingsToDefaults={() => {
              void handleResetToDefaults();
            }}
            onSaveSettings={() => {
              void handleSave();
            }}
          />
        </Box>

        <SettingsSection
          description="Set the size and mode of the daily practice queue."
          eyebrow="Practice"
          title="Practice Plan"
          width="wide"
        >
          <PracticePlanSection
            onUpdateSettings={screen.updateDraft}
            settingsDraft={screen.draftSettings}
          />
        </SettingsSection>

        <SettingsSection
          description="Send one local reminder at a predictable time."
          eyebrow="Alerts"
          title="Notifications"
          width="narrow"
        >
          <NotificationsSection
            onUpdateSettings={screen.updateDraft}
            settingsDraft={screen.draftSettings}
          />
        </SettingsSection>

        <SettingsSection
          description="Tune recall pressure and the order of review work."
          eyebrow="Memory"
          title="Memory & Review"
          width="wide"
        >
          <MemoryReviewSection
            onUpdateSettings={screen.updateDraft}
            settingsDraft={screen.draftSettings}
          />
        </SettingsSection>

        <SettingsSection
          description="Keep ignored and premium-only problems out of the queue."
          eyebrow="Filters"
          title="Question Filters"
          width="narrow"
        >
          <QuestionFiltersSection
            onUpdateSettings={screen.updateDraft}
            settingsDraft={screen.draftSettings}
          />
        </SettingsSection>

        <SettingsSection
          description="Control timer requirements and difficulty-specific solve goals."
          eyebrow="Timing"
          title="Timing Goals"
          width="full"
        >
          <TimingGoalsSection
            onUpdateSettings={screen.updateDraft}
            settingsDraft={screen.draftSettings}
          />
        </SettingsSection>

        <SettingsSection
          description="Export local state, restore from backup, or completely clear your review history."
          eyebrow="Data"
          title="Data Management"
          width="full"
        >
          <LocalDataSection
            importFile={props.importFile}
            onExportData={props.onExportData}
            onImportData={props.onImportData}
            onSetImportFile={props.onSetImportFile}
          />
          <SurfaceDivider sx={{ my: 1.5 }} />
          <HistoryResetSection
            onExportData={props.onExportData}
            onResetStudyHistory={props.onResetStudyHistory}
          />
        </SettingsSection>
      </SettingsGrid>
    </SettingsCanvas>
  );
}
