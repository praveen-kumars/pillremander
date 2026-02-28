import { ThemedText } from "@/components/ThemedText";
import { AppColors } from "@/constants/AppColors";
import { useAuth } from "@/contexts/AuthContext";
import { FontAwesome } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
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
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileSetupScreen() {
  const { user, profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 2;

  // Form fields - pre-populate with existing data
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [age, setAge] = useState(profile?.age?.toString() || "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || "");
  const [dateOfBirth, setDateOfBirth] = useState(
    profile?.date_of_birth ? new Date(profile.date_of_birth) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Redirect if user already has a complete profile
  useEffect(() => {
    if (profile?.full_name && profile?.age) {
      router.replace("/(tabs)");
    }
  }, [profile]);

  const validateStep1 = () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return false;
    }
    return true;
  };

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    router.replace("/(tabs)");
  };

  const handleComplete = async () => {
    if (!user) {
      Alert.alert("Error", "No user session found");
      return;
    }

    setLoading(true);
    try {
      const calculatedAge = age ? parseInt(age) : calculateAge(dateOfBirth);

      const profileData = {
        id: user.id,
        full_name: fullName.trim(),
        age: calculatedAge,
        phone_number: phoneNumber.trim() || undefined,
        date_of_birth: dateOfBirth.toISOString().split("T")[0],
      };

      const result = await updateProfile(profileData);

      if (result.error) {
        Alert.alert("Error", result.error);
      } else {
        Alert.alert("Success!", "Your profile has been set up successfully!", [
          { text: "Continue", onPress: () => router.replace("/(tabs)") },
        ]);
      }
    } catch (error) {
      console.error("Profile setup error:", error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateOfBirth(selectedDate);
      setAge(calculateAge(selectedDate).toString());
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <ThemedText style={styles.stepTitle}>Personal Information</ThemedText>
        <ThemedText style={styles.stepSubtitle}>
          Let&apos;s get to know you better
        </ThemedText>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Full Name *</ThemedText>
        <View style={styles.inputContainer}>
          <FontAwesome name="user" size={16} color={AppColors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor={AppColors.textSecondary}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Email</ThemedText>
        <View style={[styles.inputContainer, styles.inputDisabled]}>
          <FontAwesome
            name="envelope"
            size={16}
            color={AppColors.textSecondary}
          />
          <TextInput
            style={[styles.input, styles.inputTextDisabled]}
            value={user?.email || ""}
            editable={false}
          />
        </View>
        <ThemedText style={styles.inputHelp}>
          Email cannot be changed
        </ThemedText>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <ThemedText style={styles.stepTitle}>Additional Details</ThemedText>
        <ThemedText style={styles.stepSubtitle}>
          Help us personalize your experience (optional)
        </ThemedText>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Date of Birth</ThemedText>
        <TouchableOpacity
          style={styles.inputContainer}
          onPress={() => setShowDatePicker(true)}
        >
          <FontAwesome
            name="calendar"
            size={16}
            color={AppColors.textSecondary}
          />
          <TextInput
            style={styles.input}
            placeholder="Select your date of birth"
            placeholderTextColor={AppColors.textSecondary}
            value={dateOfBirth.toLocaleDateString()}
            editable={false}
          />
          <FontAwesome
            name="chevron-down"
            size={12}
            color={AppColors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Age</ThemedText>
        <View style={styles.inputContainer}>
          <FontAwesome
            name="hashtag"
            size={16}
            color={AppColors.textSecondary}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter your age"
            placeholderTextColor={AppColors.textSecondary}
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Phone Number</ThemedText>
        <View style={styles.inputContainer}>
          <FontAwesome name="phone" size={16} color={AppColors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Enter your phone number"
            placeholderTextColor={AppColors.textSecondary}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={dateOfBirth}
          mode="date"
          display="default"
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[
          AppColors.primary,
          AppColors.primaryLight,
          AppColors.background,
        ]}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <FontAwesome
                  name="user-plus"
                  size={30}
                  color={AppColors.white}
                />
              </View>
              <ThemedText style={styles.title}>
                Complete Your Profile
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                Step {step} of {totalSteps}
              </ThemedText>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(step / totalSteps) * 100}%` },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {step === 1 ? renderStep1() : renderStep2()}

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                {step > 1 && (
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBack}
                  >
                    <ThemedText style={styles.backButtonText}>Back</ThemedText>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkip}
                >
                  <ThemedText style={styles.skipButtonText}>
                    Skip for now
                  </ThemedText>
                </TouchableOpacity>

                {step < totalSteps ? (
                  <TouchableOpacity
                    style={styles.nextButton}
                    onPress={handleNext}
                  >
                    <ThemedText style={styles.nextButtonText}>Next</ThemedText>
                    <FontAwesome
                      name="arrow-right"
                      size={14}
                      color={AppColors.white}
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.nextButton,
                      loading && styles.buttonDisabled,
                    ]}
                    onPress={handleComplete}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={AppColors.white} size="small" />
                    ) : (
                      <>
                        <ThemedText style={styles.nextButtonText}>
                          Complete
                        </ThemedText>
                        <FontAwesome
                          name="check"
                          size={14}
                          color={AppColors.white}
                        />
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.white,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: AppColors.white,
    textAlign: "center",
    opacity: 0.9,
    marginBottom: 20,
  },
  progressContainer: {
    width: "100%",
    marginTop: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: AppColors.white,
    borderRadius: 2,
  },
  form: {
    backgroundColor: AppColors.white,
    borderRadius: 20,
    padding: 30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  stepContainer: {
    marginBottom: 30,
  },
  stepHeader: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.gray50,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputDisabled: {
    backgroundColor: AppColors.gray100,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: AppColors.textPrimary,
    marginLeft: 12,
  },
  inputTextDisabled: {
    color: AppColors.textSecondary,
  },
  inputHelp: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 4,
    fontStyle: "italic",
  },
  buttonContainer: {
    gap: 12,
  },
  backButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    color: AppColors.textSecondary,
    fontWeight: "600",
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  skipButtonText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  nextButton: {
    flexDirection: "row",
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.white,
  },
});
