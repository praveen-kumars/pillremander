import { PickerField, SectionHeader } from "@/components/FormComponents";
import SettingsModal from "@/components/SettingsModal";
import React, { useState } from "react";
import { Alert } from "react-native";

interface AppPreferences {
  preferredLanguage: string;
  timeFormat: string;
  units: string;
  theme?: string;
  dateFormat?: string;
}

interface AppPreferencesModalProps {
  visible: boolean;
  onClose: () => void;
  initialData?: AppPreferences;
  onSave?: (data: AppPreferences) => void;
}

export default function AppPreferencesModal({
  visible,
  onClose,
  initialData,
  onSave,
}: AppPreferencesModalProps) {
  const [preferences, setPreferences] = useState<AppPreferences>({
    preferredLanguage: initialData?.preferredLanguage || "English",
    timeFormat: initialData?.timeFormat || "12",
    units: initialData?.units || "Imperial",
    theme: initialData?.theme || "System",
    dateFormat: initialData?.dateFormat || "MM/DD/YYYY",
  });

  const [isLoading, setIsLoading] = useState(false);

  const languageOptions = [
    "English",
    "Spanish",
    "French",
    "German",
    "Chinese",
    "Japanese",
  ];
  const timeFormatOptions = ["12", "24"];
  const unitOptions = ["Imperial", "Metric"];
  const themeOptions = ["Light", "Dark", "System"];
  const dateFormatOptions = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];

  const handleSave = async () => {
    try {
      setIsLoading(true);
      if (onSave) {
        await onSave(preferences);
      }
      Alert.alert("Success", "App preferences saved successfully!");
      onClose();
    } catch (error) {
      console.error("Error saving app preferences:", error);
      Alert.alert("Error", "Failed to save app preferences");
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof AppPreferences, value: string) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <SettingsModal
      visible={visible}
      onClose={onClose}
      title="App Preferences"
      subtitle="Customize your app experience"
      icon="settings"
      showSaveButton
      onSave={handleSave}
      isLoading={isLoading}
    >
      <SectionHeader
        title="Display & Language"
        subtitle="Customize how information is displayed in the app"
      />

      <PickerField
        label="Preferred Language"
        value={preferences.preferredLanguage}
        onValueChange={(value) => updateField("preferredLanguage", value)}
        options={languageOptions}
      />

      <PickerField
        label="Theme"
        value={preferences.theme || "System"}
        onValueChange={(value) => updateField("theme", value)}
        options={themeOptions}
      />

      <SectionHeader
        title="Format Settings"
        subtitle="Choose how dates, times, and measurements are displayed"
      />

      <PickerField
        label="Time Format"
        value={preferences.timeFormat}
        onValueChange={(value) => updateField("timeFormat", value)}
        options={timeFormatOptions}
      />

      <PickerField
        label="Date Format"
        value={preferences.dateFormat || "MM/DD/YYYY"}
        onValueChange={(value) => updateField("dateFormat", value)}
        options={dateFormatOptions}
      />

      <PickerField
        label="Units"
        value={preferences.units}
        onValueChange={(value) => updateField("units", value)}
        options={unitOptions}
      />
    </SettingsModal>
  );
}
