import { ThemedText } from "@/components/ThemedText";
import { AppColors } from "@/constants/AppColors";
import { useAuth } from "@/contexts/AuthContext";
import {
  PersonalInfo,
  personalInfoService,
} from "@/services/personalInfoService";
import { setOnboardingComplete } from "@/services/supabase";
import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
interface OnboardingInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  phoneNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  medicalConditions: string;
  allergies: string;
}

const STEPS = [
  {
    id: "name",
    title: "What's your name?",
    subtitle: "We'll use this to personalize your experience",
  },
  {
    id: "phone",
    title: "Your phone number?",
    subtitle: "Optional - for medication scheduling (you can skip this)",
  },
  {
    id: "birthdate",
    title: "Your date of birth?",
    subtitle: "To calculate accurate dosing",
  },
  // Removed emergency contact and allergies from required onboarding
  // These can be added later in settings
];

export default function PersonalInfoOnboardingScreen() {
  const { user, updateProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));

  // Debug: Log user information
  useEffect(() => {
    console.log("PersonalInfoOnboarding - User object:", user);
    console.log("PersonalInfoOnboarding - User ID:", user?.id);
    console.log("PersonalInfoOnboarding - User Email:", user?.email);
  }, [user]);

  const [personalInfo, setPersonalInfo] = useState<OnboardingInfo>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    dateOfBirth: null,
    emergencyContactName: "",
    emergencyContactPhone: "",
    medicalConditions: "",
    allergies: "",
  });

  const currentStepData = STEPS[currentStep];

  useEffect(() => {
    // Pre-populate with existing data if available
    if (user?.email) {
      const emailName = user.email.split("@")[0] || "";
      setPersonalInfo((prev) => ({
        ...prev,
        firstName: prev.firstName || emailName,
      }));
    }
  }, [user]);

  const getCurrentStepValue = () => {
    switch (currentStepData.id) {
      case "name":
        return `${personalInfo.firstName} ${personalInfo.lastName}`.trim();
      case "phone":
        return personalInfo.phoneNumber;
      case "birthdate":
        return personalInfo.dateOfBirth?.toLocaleDateString() || "";
      default:
        return "";
    }
  };

  const isStepComplete = () => {
    switch (currentStepData.id) {
      case "name":
        // Check if we have at least a first name (allow single names)
        const fullName =
          `${personalInfo.firstName} ${personalInfo.lastName}`.trim();
        return fullName.length > 0 && personalInfo.firstName.trim().length > 0;
      case "phone":
        // Phone is optional - always allow to proceed
        return true;
      case "birthdate":
        return personalInfo.dateOfBirth !== null;
      default:
        return false;
    }
  };

  const updateCurrentStep = (value: string) => {
    switch (currentStepData.id) {
      case "name":
        // Split name properly - first word is firstName, rest is lastName
        const nameParts = value.trim().split(/\s+/);
        setPersonalInfo((prev) => ({
          ...prev,
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
        }));
        break;
      case "phone":
        setPersonalInfo((prev) => ({ ...prev, phoneNumber: value }));
        break;
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setPersonalInfo((prev) => ({ ...prev, dateOfBirth: selectedDate }));
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      // Animate step transition
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user?.id) {
      Alert.alert("Error", "User not found. Please sign in again.");
      return;
    }

    setLoading(true);
    try {
      console.log("Completing onboarding for user:", user.id, user.email);

      // Calculate age from birth date
      const age = personalInfo.dateOfBirth
        ? new Date().getFullYear() - personalInfo.dateOfBirth.getFullYear()
        : undefined;

      // Prepare data for local storage (matching PersonalInfo interface)
      const profileData: Omit<PersonalInfo, "id" | "createdAt" | "updatedAt"> =
        {
          firstName: personalInfo.firstName,
          lastName: personalInfo.lastName,
          email: user.email || "",
          phoneNumber: personalInfo.phoneNumber,
          dateOfBirth:
            personalInfo.dateOfBirth?.toISOString().split("T")[0] || "",
          // Set empty strings for optional fields not collected in onboarding
          emergencyContactName: "",
          emergencyContactPhone: "",
          medicalConditions: "",
          allergies: "",
          // Set default values for required fields not collected in onboarding
          gender: "",
          weight: "",
          height: "",
          bloodType: "",
          primaryDoctorName: "",
          primaryDoctorPhone: "",
          primaryDoctorSpecialty: "",
          preferredLanguage: "en",
          timeFormat: "12h",
          units: "metric",
        };

      // Save to local SQLite
      console.log("Saving personal info to local SQLite:", profileData);

      // Initialize database first to ensure it exists
      await personalInfoService.initializeDatabase();
      console.log("Database initialized successfully");

      await personalInfoService.savePersonalInfo(profileData);
      console.log("Local save successful - checking data was saved...");

      // Verify the data was saved
      const savedData = await personalInfoService.getPersonalInfo();
      console.log("Verification - saved data:", savedData);

      // Mark onboarding as completed using Supabase
      console.log("Marking onboarding as completed");
      // Prepare onboarding data for Supabase
      const onboardingData = {
        full_name: `${personalInfo.firstName} ${personalInfo.lastName}`.trim(),
        phone_number: personalInfo.phoneNumber,
        email: user.email || "",
        date_of_birth:
          personalInfo.dateOfBirth?.toISOString().split("T")[0] || "",
      };
      await setOnboardingComplete(user.id, onboardingData);
      console.log("Onboarding marked as complete");

      // Save onboarding status to AsyncStorage
      await AsyncStorage.setItem("onboarding_status_" + user.id, "true");

      // Verify onboarding flag
      const onboardingStatus = await AsyncStorage.getItem(
        "onboarding_status_" + user.id
      );
      console.log(
        "Verification - onboarding complete status:",
        onboardingStatus
      );

      // Also update Supabase profile if not in dev mode
      if (process.env.EXPO_PUBLIC_DEV_MODE !== "true") {
        console.log("Updating Supabase profile for user:", user.id);
        const supabaseData: any = {
          full_name:
            `${personalInfo.firstName} ${personalInfo.lastName}`.trim(),
          age,
          phone_number: personalInfo.phoneNumber,
          email: user.email || "",
          date_of_birth:
            personalInfo.dateOfBirth?.toISOString().split("T")[0] || "",
        };

        console.log("Supabase update data:", supabaseData);
        const result = await setOnboardingComplete(user.id, supabaseData);
        if (result.error) {
          console.error("Supabase profile update error:", result.error);
        } else {
          console.log("Supabase profile updated successfully");
        }
      }

      Alert.alert(
        "Welcome!",
        "Your profile has been created successfully. You can now start managing your medications.",
        [{ text: "Continue", onPress: () => router.replace("/(tabs)") }]
      );
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert(
        "Error",
        "Failed to save your information. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStepData.id) {
      case "name":
        return (
          <TextInput
            style={styles.input}
            value={getCurrentStepValue()}
            onChangeText={updateCurrentStep}
            placeholder="Enter your full name"
            placeholderTextColor="#999"
            autoCapitalize="words"
            autoFocus
          />
        );

      case "phone":
        return (
          <TextInput
            style={styles.input}
            value={getCurrentStepValue()}
            onChangeText={updateCurrentStep}
            placeholder="(555) 123-4567"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            autoFocus
          />
        );

      case "birthdate":
        return (
          <View>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <ThemedText style={styles.dateButtonText}>
                {personalInfo.dateOfBirth
                  ? personalInfo.dateOfBirth.toLocaleDateString()
                  : "Select your date of birth"}
              </ThemedText>
              <FontAwesome
                name="calendar"
                size={20}
                color={AppColors.primary}
              />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={personalInfo.dateOfBirth || new Date()}
                mode="date"
                display="default"
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <LinearGradient
      colors={[AppColors.background, AppColors.secondary + "20"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((currentStep + 1) / STEPS.length) * 100}%` },
                ]}
              />
            </View>
            <ThemedText style={styles.progressText}>
              {currentStep + 1} of {STEPS.length}
            </ThemedText>
          </View>

          {/* Content */}
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <ThemedText style={styles.title}>
              {currentStepData.title}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {currentStepData.subtitle}
            </ThemedText>

            <View style={styles.inputContainer}>{renderStepContent()}</View>
          </Animated.View>

          {/* Navigation */}
          <View style={styles.navigation}>
            <View style={styles.navigationRow}>
              {currentStep > 0 && (
                <TouchableOpacity
                  style={[styles.button, styles.backButton]}
                  onPress={handleBack}
                >
                  <ThemedText style={styles.backButtonText}>Back</ThemedText>
                </TouchableOpacity>
              )}

              {/* Show skip button for phone step */}
              {currentStepData.id === "phone" && (
                <TouchableOpacity
                  style={[styles.button, styles.skipButton]}
                  onPress={handleNext}
                >
                  <ThemedText style={styles.skipButtonText}>Skip</ThemedText>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.nextButton,
                  !isStepComplete() && styles.disabledButton,
                ]}
                onPress={handleNext}
                disabled={!isStepComplete() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText style={styles.nextButtonText}>
                    {currentStep === STEPS.length - 1
                      ? "Complete"
                      : currentStepData.id === "phone"
                      ? "Continue"
                      : "Next"}
                  </ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  progressContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E5E5",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: AppColors.primary,
    borderRadius: 2,
  },
  progressText: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    color: AppColors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
    color: "#666",
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 40,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    color: AppColors.textPrimary,
  },
  multilineInput: {
    height: 120,
    paddingTop: 16,
  },
  dateButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateButtonText: {
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  navigation: {
    paddingBottom: 20,
  },
  navigationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  backButton: {
    backgroundColor: "#F5F5F5",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  skipButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.primary,
  },
  nextButton: {
    backgroundColor: AppColors.primary,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  disabledButton: {
    backgroundColor: "#CCC",
  },
});
