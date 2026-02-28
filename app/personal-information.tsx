import { ThemedText } from "@/components/ThemedText";
import { AppColors } from "@/constants/AppColors";
import { basicPersonalInfoService } from "@/services/basicPersonalInfoService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Card } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

interface PersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  weight: string;
  height: string;
  phoneNumber: string;
  email: string;
}

export default function PersonalInformationScreen() {
  // Sign out and clear session/user/onboarding from AsyncStorage

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    weight: "",
    height: "",
    phoneNumber: "",
    email: "",
  });

  const [originalInfo, setOriginalInfo] = useState<PersonalInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPersonalInfo();
  }, []);

  const loadPersonalInfo = async () => {
    try {
      setIsLoading(true);
      const data = await basicPersonalInfoService.getBasicPersonalInfo();
      if (data) {
        const info = {
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          dateOfBirth: data.dateOfBirth || "",
          gender: data.gender || "",
          weight: data.weight || "",
          height: data.height || "",
          phoneNumber: data.phoneNumber || "",
          email: data.email || "",
        };
        setPersonalInfo(info);
        setOriginalInfo(info);
      }
    } catch (error) {
      console.error("Error loading personal info:", error);
      Alert.alert("Error", "Failed to load personal information");
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof PersonalInfo, value: string) => {
    setPersonalInfo((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      // Validate the information
      const validation =
        await basicPersonalInfoService.validateBasicPersonalInfo(personalInfo);
      if (!validation.isValid) {
        Alert.alert("Validation Error", validation.errors.join("\n"));
        return;
      }

      setIsLoading(true);
      await basicPersonalInfoService.saveBasicPersonalInfo(personalInfo);
      setIsEditing(false);
      setHasChanges(false);
      setOriginalInfo(personalInfo);
      Alert.alert("Success", "Personal information saved successfully!");
    } catch (error) {
      console.error("Error saving personal info:", error);
      Alert.alert("Error", "Failed to save personal information");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to cancel?",
        [
          { text: "Continue Editing", style: "cancel" },
          {
            text: "Discard Changes",
            style: "destructive",
            onPress: () => {
              if (originalInfo) {
                setPersonalInfo(originalInfo);
              }
              setIsEditing(false);
              setHasChanges(false);
            },
          },
        ]
      );
    } else {
      setIsEditing(false);
    }
  };

  const genderOptions = ["Male", "Female", "Other", "Prefer not to say"];

  const renderInputField = (
    label: string,
    field: keyof PersonalInfo,
    placeholder: string,
    multiline = false,
    keyboardType:
      | "default"
      | "email-address"
      | "phone-pad"
      | "numeric" = "default"
  ) => (
    <View style={styles.inputGroup}>
      <ThemedText style={styles.inputLabel}>{label}</ThemedText>
      <TextInput
        style={[styles.textInput, multiline && styles.multilineInput]}
        value={personalInfo[field]}
        onChangeText={(value) => updateField(field, value)}
        placeholder={placeholder}
        placeholderTextColor={AppColors.textSecondary}
        editable={isEditing}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
      />
    </View>
  );

  const renderPickerField = (
    label: string,
    field: keyof PersonalInfo,
    options: string[]
  ) => (
    <View style={styles.inputGroup}>
      <ThemedText style={styles.inputLabel}>{label}</ThemedText>
      {isEditing ? (
        <View style={styles.pickerContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.pickerOption,
                personalInfo[field] === option && styles.selectedPickerOption,
              ]}
              onPress={() => updateField(field, option)}
            >
              <ThemedText
                style={[
                  styles.pickerOptionText,
                  personalInfo[field] === option &&
                    styles.selectedPickerOptionText,
                ]}
              >
                {option}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.readOnlyField}>
          <ThemedText style={styles.readOnlyText}>
            {personalInfo[field] || "Not specified"}
          </ThemedText>
        </View>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={[AppColors.primary, AppColors.primaryLight, AppColors.background]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={AppColors.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <ThemedText style={styles.headerTitle}>
              Personal Information
            </ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Manage your profile and medical details
            </ThemedText>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={AppColors.white} />
            ) : (
              <Ionicons
                name={isEditing ? "checkmark" : "create-outline"}
                size={24}
                color={AppColors.white}
              />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Basic Information */}
          <Card style={styles.sectionCard}>
            <Card.Content style={styles.sectionContent}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person" size={20} color={AppColors.primary} />
                <ThemedText style={styles.sectionTitle}>
                  Basic Information
                </ThemedText>
              </View>

              {renderInputField(
                "First Name",
                "firstName",
                "Enter your first name"
              )}
              {renderInputField(
                "Last Name",
                "lastName",
                "Enter your last name"
              )}
              {renderInputField("Date of Birth", "dateOfBirth", "MM/DD/YYYY")}
              {renderPickerField("Gender", "gender", genderOptions)}
              {renderInputField(
                "Weight",
                "weight",
                "lbs or kg",
                false,
                "numeric"
              )}
              {renderInputField("Height", "height", "ft'in or cm")}
            </Card.Content>
          </Card>

          {/* Contact Information */}
          <Card style={styles.sectionCard}>
            <Card.Content style={styles.sectionContent}>
              <View style={styles.sectionHeader}>
                <Ionicons name="call" size={20} color={AppColors.primary} />
                <ThemedText style={styles.sectionTitle}>
                  Contact Information
                </ThemedText>
              </View>

              {renderInputField(
                "Phone Number",
                "phoneNumber",
                "Enter your phone number",
                false,
                "phone-pad"
              )}
              {renderInputField(
                "Email Address",
                "email",
                "Enter your email address",
                false,
                "email-address"
              )}
            </Card.Content>
          </Card>

          {/* Medical Information */}
          {/* This section moved to Medical Information Modal in Settings */}

          {/* Emergency Contact */}
          {/* This section moved to Emergency Contact Modal in Settings */}

          {/* Primary Doctor */}
          {/* This section moved to Healthcare Provider Modal in Settings */}

          {/* App Preferences */}
          {/* This section moved to App Preferences Modal in Settings */}

          {isEditing && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <ThemedText style={styles.saveButtonText}>
                  Save Changes
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.white,
    marginBottom: 2,
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionCard: {
    borderRadius: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  sectionContent: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    marginLeft: 10,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: AppColors.textPrimary,
    backgroundColor: AppColors.white,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
  },
  readOnlyField: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: AppColors.gray100,
    borderRadius: 12,
  },
  readOnlyText: {
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: AppColors.gray100,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  selectedPickerOption: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  pickerOptionText: {
    fontSize: 14,
    color: AppColors.textPrimary,
    fontWeight: "500",
  },
  selectedPickerOptionText: {
    color: AppColors.white,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: AppColors.gray200,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.white,
  },
  bottomSpacer: {
    height: 40,
  },
});
