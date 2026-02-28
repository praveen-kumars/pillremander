import { FormField, SectionHeader } from "@/components/FormComponents";
import SettingsModal from "@/components/SettingsModal";
import React, { useState } from "react";
import { Alert } from "react-native";

interface HealthcareProvider {
  primaryDoctorName: string;
  primaryDoctorPhone: string;
  primaryDoctorSpecialty: string;
  primaryDoctorEmail?: string;
  clinicName?: string;
  clinicAddress?: string;
}

interface HealthcareProviderModalProps {
  visible: boolean;
  onClose: () => void;
  initialData?: HealthcareProvider;
  onSave?: (data: HealthcareProvider) => void;
}

export default function HealthcareProviderModal({
  visible,
  onClose,
  initialData,
  onSave,
}: HealthcareProviderModalProps) {
  const [providerInfo, setProviderInfo] = useState<HealthcareProvider>({
    primaryDoctorName: initialData?.primaryDoctorName || "",
    primaryDoctorPhone: initialData?.primaryDoctorPhone || "",
    primaryDoctorSpecialty: initialData?.primaryDoctorSpecialty || "",
    primaryDoctorEmail: initialData?.primaryDoctorEmail || "",
    clinicName: initialData?.clinicName || "",
    clinicAddress: initialData?.clinicAddress || "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Validate required fields
      if (!providerInfo.primaryDoctorName.trim()) {
        Alert.alert("Validation Error", "Doctor name is required");
        return;
      }

      if (onSave) {
        await onSave(providerInfo);
      }
      Alert.alert(
        "Success",
        "Healthcare provider information saved successfully!"
      );
      onClose();
    } catch (error) {
      console.error("Error saving healthcare provider:", error);
      Alert.alert("Error", "Failed to save healthcare provider information");
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof HealthcareProvider, value: string) => {
    setProviderInfo((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <SettingsModal
      visible={visible}
      onClose={onClose}
      title="Healthcare Provider"
      subtitle="Manage your primary healthcare provider information"
      icon="medical-outline"
      showSaveButton
      onSave={handleSave}
      isLoading={isLoading}
    >
      <SectionHeader
        title="Primary Healthcare Provider"
        subtitle="Your main doctor or healthcare professional"
      />

      <FormField
        label="Doctor Name *"
        value={providerInfo.primaryDoctorName}
        onChangeText={(value) => updateField("primaryDoctorName", value)}
        placeholder="Primary doctor full name"
      />

      <FormField
        label="Phone Number"
        value={providerInfo.primaryDoctorPhone}
        onChangeText={(value) => updateField("primaryDoctorPhone", value)}
        placeholder="Doctor's office phone number"
        keyboardType="phone-pad"
      />

      <FormField
        label="Specialty"
        value={providerInfo.primaryDoctorSpecialty}
        onChangeText={(value) => updateField("primaryDoctorSpecialty", value)}
        placeholder="e.g., Family Medicine, Cardiology, Internal Medicine"
      />

      <FormField
        label="Email Address"
        value={providerInfo.primaryDoctorEmail || ""}
        onChangeText={(value) => updateField("primaryDoctorEmail", value)}
        placeholder="Doctor's email address"
        keyboardType="email-address"
      />

      <FormField
        label="Clinic/Hospital Name"
        value={providerInfo.clinicName || ""}
        onChangeText={(value) => updateField("clinicName", value)}
        placeholder="Name of clinic or hospital"
      />

      <FormField
        label="Clinic Address"
        value={providerInfo.clinicAddress || ""}
        onChangeText={(value) => updateField("clinicAddress", value)}
        placeholder="Full address of clinic or hospital"
        multiline
      />
    </SettingsModal>
  );
}
