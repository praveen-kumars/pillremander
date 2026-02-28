import {
  FormField,
  PickerField,
  SectionHeader,
} from "@/components/FormComponents";
import SettingsModal from "@/components/SettingsModal";
import { MedicalProfile, userDataService } from "@/services/userDataService";
import React, { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

interface MedicalInformationModalProps {
  visible: boolean;
  onClose: () => void;
  initialData?: MedicalProfile;
  onSave?: (data: MedicalProfile) => void;
}

export default function MedicalInformationModal({
  visible,
  onClose,
  initialData,
  onSave,
}: MedicalInformationModalProps) {
  const [medicalInfo, setMedicalInfo] = useState<MedicalProfile>({
    bloodType: "",
    allergies: "",
    medicalConditions: "",
    medications: "",
    insuranceProvider: "",
    insurancePolicyNumber: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const bloodTypes = [
    "A+",
    "A-",
    "B+",
    "B-",
    "AB+",
    "AB-",
    "O+",
    "O-",
    "Unknown",
  ];

  const loadMedicalInfo = useCallback(async () => {
    try {
      const data = await userDataService.getMedicalProfile();
      if (data) {
        setMedicalInfo({
          bloodType: data.bloodType || "",
          allergies: data.allergies || "",
          medicalConditions: data.medicalConditions || "",
          medications: data.medications || "",
          insuranceProvider: data.insuranceProvider || "",
          insurancePolicyNumber: data.insurancePolicyNumber || "",
        });
      } else if (initialData) {
        setMedicalInfo(initialData);
      }
    } catch (error) {
      console.error("Error loading medical info:", error);
    }
  }, [initialData]);

  useEffect(() => {
    if (visible) {
      loadMedicalInfo();
    }
  }, [visible, loadMedicalInfo]);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await userDataService.saveMedicalProfile(medicalInfo);
      if (onSave) {
        await onSave(medicalInfo);
      }
      Alert.alert("Success", "Medical information saved successfully!");
      onClose();
    } catch (error) {
      console.error("Error saving medical information:", error);
      Alert.alert("Error", "Failed to save medical information");
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof MedicalProfile, value: string) => {
    setMedicalInfo((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <SettingsModal
      visible={visible}
      onClose={onClose}
      title="Medical Information"
      subtitle="Manage your medical profile and health details"
      icon="medical"
      showSaveButton
      onSave={handleSave}
      isLoading={isLoading}
    >
      <SectionHeader
        title="Medical Profile"
        subtitle="Your medical information helps provide better medication management"
      />

      <PickerField
        label="Blood Type"
        value={medicalInfo.bloodType}
        onValueChange={(value) => updateField("bloodType", value)}
        options={bloodTypes}
      />

      <FormField
        label="Allergies"
        value={medicalInfo.allergies}
        onChangeText={(value) => updateField("allergies", value)}
        placeholder="List any allergies (medications, food, environmental)"
        multiline
      />

      <FormField
        label="Medical Conditions"
        value={medicalInfo.medicalConditions}
        onChangeText={(value) => updateField("medicalConditions", value)}
        placeholder="List any chronic conditions or relevant medical history"
        multiline
      />

      <FormField
        label="Current Medications"
        value={medicalInfo.medications}
        onChangeText={(value) => updateField("medications", value)}
        placeholder="List all current medications and dosages"
        multiline
      />

      <SectionHeader
        title="Insurance Information"
        subtitle="Your insurance details for prescription coverage"
      />

      <FormField
        label="Insurance Provider"
        value={medicalInfo.insuranceProvider || ""}
        onChangeText={(value) => updateField("insuranceProvider", value)}
        placeholder="Enter your insurance company name"
      />

      <FormField
        label="Policy Number"
        value={medicalInfo.insurancePolicyNumber || ""}
        onChangeText={(value) => updateField("insurancePolicyNumber", value)}
        placeholder="Enter your insurance policy number"
      />
    </SettingsModal>
  );
}
