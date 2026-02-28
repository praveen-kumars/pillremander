import { FormField, SectionHeader } from "@/components/FormComponents";
import SettingsModal from "@/components/SettingsModal";
import React, { useState } from "react";
import { Alert } from "react-native";

interface EmergencyContact {
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation?: string;
  emergencyContactEmail?: string;
}

interface EmergencyContactModalProps {
  visible: boolean;
  onClose: () => void;
  initialData?: EmergencyContact;
  onSave?: (data: EmergencyContact) => void;
}

export default function EmergencyContactModal({
  visible,
  onClose,
  initialData,
  onSave,
}: EmergencyContactModalProps) {
  const [contactInfo, setContactInfo] = useState<EmergencyContact>({
    emergencyContactName: initialData?.emergencyContactName || "",
    emergencyContactPhone: initialData?.emergencyContactPhone || "",
    emergencyContactRelation: initialData?.emergencyContactRelation || "",
    emergencyContactEmail: initialData?.emergencyContactEmail || "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Validate required fields
      if (!contactInfo.emergencyContactName.trim()) {
        Alert.alert("Validation Error", "Emergency contact name is required");
        return;
      }

      if (!contactInfo.emergencyContactPhone.trim()) {
        Alert.alert("Validation Error", "Emergency contact phone is required");
        return;
      }

      if (onSave) {
        await onSave(contactInfo);
      }
      Alert.alert("Success", "Emergency contact saved successfully!");
      onClose();
    } catch (error) {
      console.error("Error saving emergency contact:", error);
      Alert.alert("Error", "Failed to save emergency contact information");
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof EmergencyContact, value: string) => {
    setContactInfo((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <SettingsModal
      visible={visible}
      onClose={onClose}
      title="Emergency Contact"
      subtitle="Set up emergency contact information for urgent situations"
      icon="warning"
      showSaveButton
      onSave={handleSave}
      isLoading={isLoading}
    >
      <SectionHeader
        title="Emergency Contact Details"
        subtitle="This person will be contacted in case of medical emergencies"
      />

      <FormField
        label="Contact Name *"
        value={contactInfo.emergencyContactName}
        onChangeText={(value) => updateField("emergencyContactName", value)}
        placeholder="Emergency contact full name"
      />

      <FormField
        label="Phone Number *"
        value={contactInfo.emergencyContactPhone}
        onChangeText={(value) => updateField("emergencyContactPhone", value)}
        placeholder="Emergency contact phone number"
        keyboardType="phone-pad"
      />

      <FormField
        label="Relationship"
        value={contactInfo.emergencyContactRelation || ""}
        onChangeText={(value) => updateField("emergencyContactRelation", value)}
        placeholder="e.g., Spouse, Parent, Sibling, Friend"
      />

      <FormField
        label="Email Address"
        value={contactInfo.emergencyContactEmail || ""}
        onChangeText={(value) => updateField("emergencyContactEmail", value)}
        placeholder="Emergency contact email address"
        keyboardType="email-address"
      />
    </SettingsModal>
  );
}
