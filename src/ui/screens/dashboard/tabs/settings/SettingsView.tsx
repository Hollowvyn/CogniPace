/** Dashboard settings screen for local review configuration and backup workflows. */
import { SurfaceDivider } from "@design-system/atoms";
import Box from "@mui/material/Box";

import { UserSettings } from "../../../../../domain/settings";

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

export interface SettingsViewProps {
  canDiscardSettings: boolean;
  canResetSettingsToDefaults: boolean;
  canSaveSettings: boolean;
  importFile: File | null;
  onDiscardSettings: () => void;
  onExportData: () => Promise<void>;
  onImportData: () => Promise<void>;
  onResetSettingsToDefaults: () => void;
  onResetStudyHistory: () => void;
  onSaveSettings: () => void;
  onSetImportFile: (file: File | null) => void;
  onUpdateSettings: (updater: (current: UserSettings) => UserSettings) => void;
  settingsDraft: UserSettings;
}

export function SettingsView(props: SettingsViewProps) {
  return (
    <SettingsCanvas>
      <SettingsGrid>
        <Box sx={{ gridColumn: "1 / -1", minWidth: 0 }}>
          <SettingsSaveBar
            canDiscardSettings={props.canDiscardSettings}
            canResetSettingsToDefaults={props.canResetSettingsToDefaults}
            canSaveSettings={props.canSaveSettings}
            onDiscardSettings={props.onDiscardSettings}
            onResetSettingsToDefaults={props.onResetSettingsToDefaults}
            onSaveSettings={props.onSaveSettings}
          />
        </Box>

        <SettingsSection
          description="Set the size and mode of the daily practice queue."
          eyebrow="Practice"
          title="Practice Plan"
          width="wide"
        >
          <PracticePlanSection
            onUpdateSettings={props.onUpdateSettings}
            settingsDraft={props.settingsDraft}
          />
        </SettingsSection>

        <SettingsSection
          description="Send one local reminder at a predictable time."
          eyebrow="Alerts"
          title="Notifications"
          width="narrow"
        >
          <NotificationsSection
            onUpdateSettings={props.onUpdateSettings}
            settingsDraft={props.settingsDraft}
          />
        </SettingsSection>

        <SettingsSection
          description="Tune recall pressure and the order of review work."
          eyebrow="Memory"
          title="Memory & Review"
          width="wide"
        >
          <MemoryReviewSection
            onUpdateSettings={props.onUpdateSettings}
            settingsDraft={props.settingsDraft}
          />
        </SettingsSection>

        <SettingsSection
          description="Keep ignored and premium-only problems out of the queue."
          eyebrow="Filters"
          title="Question Filters"
          width="narrow"
        >
          <QuestionFiltersSection
            onUpdateSettings={props.onUpdateSettings}
            settingsDraft={props.settingsDraft}
          />
        </SettingsSection>

        <SettingsSection
          description="Control timer requirements and difficulty-specific solve goals."
          eyebrow="Timing"
          title="Timing Goals"
          width="full"
        >
          <TimingGoalsSection
            onUpdateSettings={props.onUpdateSettings}
            settingsDraft={props.settingsDraft}
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
