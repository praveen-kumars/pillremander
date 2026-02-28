import {
  FormField,
  PickerField,
  SectionHeader,
} from "@/components/FormComponents";
import SettingsModal from "@/components/SettingsModal";
import { useAuth } from "@/contexts/AuthContext";
import { personalInfoService } from "@/services/personalInfoService";
import { userDataService, UserProfile } from "@/services/userDataService";
import React, { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

interface PersonalInformationModalProps {
  visible: boolean;
  onClose: () => void;
  initialData?: UserProfile;
  onSave?: (data: UserProfile) => void;
}

export default function PersonalInformationModal({
  visible,
  onClose,
  initialData,
  onSave,
}: PersonalInformationModalProps) {
  const { user, profile } = useAuth();
  const [personalInfo, setPersonalInfo] = useState<UserProfile>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    weight: "",
    height: "",
    phoneNumber: "",
    email: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const genderOptions = ["Male", "Female", "Other", "Prefer not to say"];

  const loadPersonalInfo = useCallback(async () => {
    try {
      console.log("PersonalModal: Loading personal info...");

      // Try to load from the onboarding personalInfoService first
      const onboardingData = await personalInfoService.getPersonalInfo();
      console.log("PersonalModal: Onboarding data:", onboardingData);

      // Try to load from userDataService
      const userData = await userDataService.getUserProfile();
      console.log("PersonalModal: User data:", userData);

      // Merge data from multiple sources, prioritizing the most complete data
      const mergedData = {
        firstName:
          onboardingData?.firstName ||
          userData?.firstName ||
          profile?.full_name?.split(" ")[0] ||
          "",
        lastName:
          onboardingData?.lastName ||
          userData?.lastName ||
          profile?.full_name?.split(" ").slice(1).join(" ") ||
          "",
        dateOfBirth:
          onboardingData?.dateOfBirth ||
          userData?.dateOfBirth ||
          profile?.date_of_birth ||
          "",
        gender: onboardingData?.gender || userData?.gender || "",
        weight: onboardingData?.weight || userData?.weight || "",
        height: onboardingData?.height || userData?.height || "",
        phoneNumber:
          onboardingData?.phoneNumber ||
          userData?.phoneNumber ||
          profile?.phone_number ||
          "",
        email: onboardingData?.email || userData?.email || user?.email || "",
      };

      console.log("PersonalModal: Merged data:", mergedData);
      setPersonalInfo(mergedData);
    } catch (error) {
      console.error("PersonalModal: Error loading personal info:", error);

      // Fallback to profile data from auth context
      if (profile || user) {
        setPersonalInfo({
          firstName: profile?.full_name?.split(" ")[0] || "",
          lastName: profile?.full_name?.split(" ").slice(1).join(" ") || "",
          dateOfBirth: profile?.date_of_birth || "",
          gender: "",
          weight: "",
          height: "",
          phoneNumber: profile?.phone_number || "",
          email: user?.email || "",
        });
      }
    }
  }, [user, profile]);

  useEffect(() => {
    if (visible) {
      loadPersonalInfo();
    }
  }, [visible, loadPersonalInfo]);

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Validate required fields
      if (!personalInfo.firstName || !personalInfo.lastName) {
        Alert.alert(
          "Validation Error",
          "First name and last name are required"
        );
        return;
      }

      if (
        personalInfo.email &&
        !userDataService.validateEmail(personalInfo.email)
      ) {
        Alert.alert("Validation Error", "Please enter a valid email address");
        return;
      }

      if (
        personalInfo.phoneNumber &&
        !userDataService.validatePhoneNumber(personalInfo.phoneNumber)
      ) {
        Alert.alert("Validation Error", "Please enter a valid phone number");
        return;
      }

      await userDataService.saveUserProfile(personalInfo);

      // Also save basic fields to personalInfoService to keep onboarding data in sync
      console.log(
        "PersonalModal: Syncing basic data to personalInfoService..."
      );
      try {
        const existingInfo = await personalInfoService.getPersonalInfo();
        const updatedInfo = {
          ...existingInfo,
          firstName: personalInfo.firstName,
          lastName: personalInfo.lastName,
          phoneNumber: personalInfo.phoneNumber,
          dateOfBirth: personalInfo.dateOfBirth,
          gender: personalInfo.gender,
          weight: personalInfo.weight,
          height: personalInfo.height,
          email: personalInfo.email,
          // Keep existing values for fields not in this modal
          bloodType: existingInfo?.bloodType || "",
          allergies: existingInfo?.allergies || "",
          medicalConditions: existingInfo?.medicalConditions || "",
          emergencyContactName: existingInfo?.emergencyContactName || "",
          emergencyContactPhone: existingInfo?.emergencyContactPhone || "",
          primaryDoctorName: existingInfo?.primaryDoctorName || "",
          primaryDoctorPhone: existingInfo?.primaryDoctorPhone || "",
          primaryDoctorSpecialty: existingInfo?.primaryDoctorSpecialty || "",
          preferredLanguage: existingInfo?.preferredLanguage || "English",
          timeFormat: existingInfo?.timeFormat || "12-hour",
          units: existingInfo?.units || "Imperial",
        };

        await personalInfoService.savePersonalInfo(updatedInfo);
        console.log("PersonalModal: Data synced to personalInfoService");
      } catch (syncError) {
        console.warn(
          "PersonalModal: Failed to sync to personalInfoService:",
          syncError
        );
        // Don't fail the entire save if sync fails
      }

      // Also update Supabase profile if we have auth
      if (user) {
        try {
          const { profileService } = await import("@/lib/supabase");
          const fullName =
            `${personalInfo.firstName} ${personalInfo.lastName}`.trim();
          await profileService.updateProfile(user.id, {
            full_name: fullName,
            phone_number: personalInfo.phoneNumber,
            date_of_birth: personalInfo.dateOfBirth,
          });
          console.log("PersonalModal: Updated Supabase profile");
        } catch (supabaseError) {
          console.warn(
            "PersonalModal: Failed to update Supabase profile:",
            supabaseError
          );
          // Don't fail the entire save if Supabase update fails
        }
      }

      if (onSave) {
        await onSave(personalInfo);
      }
      Alert.alert("Success", "Personal information saved successfully!");
      onClose();
    } catch (error) {
      console.error("Error saving personal information:", error);
      Alert.alert("Error", "Failed to save personal information");
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof UserProfile, value: string) => {
    setPersonalInfo((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <SettingsModal
      visible={visible}
      onClose={onClose}
      title="Personal Information"
      subtitle="Update your basic profile details"
      icon="person"
      showSaveButton
      onSave={handleSave}
      isLoading={isLoading}
    >
      <SectionHeader
        title="Basic Information"
        subtitle="Your personal details for medication management"
      />

      <FormField
        label="First Name"
        value={personalInfo.firstName}
        onChangeText={(value) => updateField("firstName", value)}
        placeholder="Enter your first name"
      />

      <FormField
        label="Last Name"
        value={personalInfo.lastName}
        onChangeText={(value) => updateField("lastName", value)}
        placeholder="Enter your last name"
      />

      <FormField
        label="Date of Birth"
        value={personalInfo.dateOfBirth}
        onChangeText={(value) => updateField("dateOfBirth", value)}
        placeholder="MM/DD/YYYY"
      />

      <PickerField
        label="Gender"
        value={personalInfo.gender}
        onValueChange={(value) => updateField("gender", value)}
        options={genderOptions}
      />

      <FormField
        label="Weight"
        value={personalInfo.weight}
        onChangeText={(value) => updateField("weight", value)}
        placeholder="lbs or kg"
        keyboardType="numeric"
      />

      <FormField
        label="Height"
        value={personalInfo.height}
        onChangeText={(value) => updateField("height", value)}
        placeholder="ft'in or cm"
      />

      <SectionHeader
        title="Contact Information"
        subtitle="How we can reach you for important updates"
      />

      <FormField
        label="Phone Number"
        value={personalInfo.phoneNumber}
        onChangeText={(value) => updateField("phoneNumber", value)}
        placeholder="Enter your phone number"
        keyboardType="phone-pad"
      />

      <FormField
        label="Email Address"
        value={personalInfo.email}
        onChangeText={(value) => updateField("email", value)}
        placeholder="Enter your email address"
        keyboardType="email-address"
      />
    </SettingsModal>
  );
}
