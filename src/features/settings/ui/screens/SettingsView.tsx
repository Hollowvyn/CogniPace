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
  currentSettings: UserSettings | null;
  onStatus: (status: SettingsViewStatus) => void;
  /** Test-context fallback: in extension mode the bus tick triggers
   *  a re-fetch; in non-extension tests this callback carries the
   *  fresh snapshot instead. */
  onSettingsSaved?: (saved: UserSettings) => void;
  // Cross-feature concerns — owned by the parent until backup/study
  // features migrate in Phase 7.
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

  // Render chrome only while the parent hydrates the snapshot — the
  // draft has nothing to clone from yet, but the layout shift hurts.
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
