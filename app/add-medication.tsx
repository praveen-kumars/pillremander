import { ThemedText } from "@/components/ThemedText";
import { AppColors } from "@/constants/AppColors";
import { medicationIntegrationService } from "@/services/medicationIntegrationService";
import { formatDateToLocal, getTodayDateString } from "@/utils/dateUtils";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Card, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AddMedicationScreen() {
  const [medicationName, setMedicationName] = useState("");
  const [dosage, setDosage] = useState("");
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Frequency and scheduling fields
  const [frequency, setFrequency] = useState("daily"); // daily, date_range, as_needed
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]); // For date_range medications

  // Initialize start date to today in local timezone to avoid date format issues
  const [startDate, setStartDate] = useState(() => {
    const todayStr = getTodayDateString();
    const [year, month, day] = todayStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  });
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const onTimeChange = (event: any, selectedTime?: Date) => {
    const currentTime = selectedTime || time;
    setTime(currentTime);

    // Hide picker after selection on both platforms
    if (event.type === "set" || Platform.OS === "android") {
      setShowTimePicker(false);
    }
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || startDate;
    setStartDate(currentDate);
    setShowStartDatePicker(false);
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || endDate;
    setEndDate(currentDate);
    setShowEndDatePicker(false);
  };

  const showTimepicker = () => {
    setShowTimePicker(true);
  };

  const showStartDatepicker = () => {
    setShowStartDatePicker(true);
  };

  const showEndDatepicker = () => {
    setShowEndDatePicker(true);
  };

  const handleSave = async () => {
    if (!medicationName.trim() || !dosage.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (frequency === "date_range" && daysOfWeek.length === 0) {
      Alert.alert(
        "Error",
        "Please select at least one day for date range medications"
      );
      return;
    }

    setSaving(true);

    try {
      // Convert days of week strings to numbers (0=Sunday, 1=Monday, etc.)
      const dayNumbers =
        frequency === "date_range"
          ? daysOfWeek.map((day) => {
              const dayMap: { [key: string]: number } = {
                sunday: 0,
                monday: 1,
                tuesday: 2,
                wednesday: 3,
                thursday: 4,
                friday: 5,
                saturday: 6,
              };
              return dayMap[day];
            })
          : [];

      // Prepare medication data with the required structure for integration service
      const medicationData = {
        name: medicationName.trim(),
        dosage: dosage.trim(),
        times: [time.toTimeString().slice(0, 5)], // ["HH:MM"] format
        days: dayNumbers, // Number array for day indices
        frequency: frequency as "daily" | "date_range" | "as_needed",
        startDate: formatDateToLocal(startDate), // Use local date formatting
        endDate: endDate ? formatDateToLocal(endDate) : undefined,
        timeSlot: time.toTimeString().slice(0, 5), // HH:MM format for notification scheduling
      };

      console.log("🔄 Adding medication with data:", medicationData);

      // Use the integration service to add medication
      const medicationId = await medicationIntegrationService.addMedication(
        medicationData
      );

      if (medicationId) {
        Alert.alert("Success", "Medication added successfully!", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        throw new Error("Failed to add medication through integration service");
      }
    } catch (error) {
      console.error("❌ Error adding medication:", error);

      let errorMessage = "Failed to save medication. Please try again.";

      if (error instanceof Error) {
        if (error.message.includes("no such column")) {
          errorMessage =
            "Database schema error. Please restart the app and try again.";
        } else if (
          error.message.includes("prepareAsync") ||
          error.message.includes("execAsync")
        ) {
          errorMessage =
            "Database connection error. Please restart the app and try again.";
        } else if (error.message.includes("NullPointerException")) {
          errorMessage =
            "Android database error. Please restart the app and try again.";
        } else if (error.message.includes("transaction")) {
          errorMessage =
            "Database is busy. Please wait a moment and try again.";
        } else if (error.message.includes("not initialized")) {
          errorMessage =
            "Database not ready. Please wait for app to fully load and try again.";
        } else {
          // Include the actual error message for debugging
          errorMessage = `Save failed: ${error.message}`;
        }
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient
      colors={[AppColors.primary, AppColors.primaryLight, AppColors.background]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={AppColors.white} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Add Medication</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        {/* Main Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.mainCard}>
            <Card.Content style={styles.cardContent}>
              {/* Medication Icon */}
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[AppColors.primary, AppColors.primaryDark]}
                  style={styles.iconGradient}
                >
                  <Ionicons name="medical" size={32} color={AppColors.white} />
                </LinearGradient>
              </View>

              {/* Form Fields */}
              <View style={styles.formContainer}>
                {/* Medication Name */}
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="medical-outline"
                    size={20}
                    color={AppColors.primary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    label="Medication Name"
                    value={medicationName}
                    onChangeText={setMedicationName}
                    mode="outlined"
                    style={styles.input}
                    disabled={saving}
                    outlineColor={AppColors.gray300}
                    activeOutlineColor={AppColors.primary}
                    theme={{
                      colors: {
                        background: AppColors.white,
                        surface: AppColors.white,
                      },
                    }}
                  />
                </View>

                {/* Dosage */}
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="flask-outline"
                    size={20}
                    color={AppColors.primary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    label="Dosage (e.g., 1 tablet, 2 capsules)"
                    value={dosage}
                    onChangeText={setDosage}
                    mode="outlined"
                    style={styles.input}
                    disabled={saving}
                    outlineColor={AppColors.gray300}
                    activeOutlineColor={AppColors.primary}
                    theme={{
                      colors: {
                        background: AppColors.white,
                        surface: AppColors.white,
                      },
                    }}
                  />
                </View>

                {/* Time Picker */}
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={AppColors.primary}
                    style={styles.inputIcon}
                  />
                  <TouchableOpacity
                    onPress={showTimepicker}
                    style={styles.timePickerButton}
                    disabled={saving}
                  >
                    <View style={styles.timePickerContent}>
                      <ThemedText style={styles.timePickerLabel}>
                        Reminder Time
                      </ThemedText>
                      <View style={styles.timeDisplayContainer}>
                        <ThemedText style={styles.timeText}>
                          {time.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </ThemedText>
                        <Ionicons
                          name="chevron-down"
                          size={16}
                          color={AppColors.textSecondary}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>

                {showTimePicker && (
                  <View style={styles.timePickerContainer}>
                    <DateTimePicker
                      testID="dateTimePicker"
                      value={time}
                      mode="time"
                      is24Hour={false}
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={onTimeChange}
                    />
                  </View>
                )}

                {/* Frequency Selector */}
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="repeat"
                    size={20}
                    color={AppColors.primary}
                    style={styles.inputIcon}
                  />
                  <View style={styles.selectorContainer}>
                    <ThemedText style={styles.selectorLabel}>
                      Frequency
                    </ThemedText>
                    <View style={styles.frequencySelector}>
                      {[
                        { label: "Daily", value: "daily" },
                        { label: "Date Range", value: "date_range" },
                        { label: "As Needed", value: "as_needed" },
                      ].map((freq) => (
                        <TouchableOpacity
                          key={freq.value}
                          style={[
                            styles.frequencyOption,
                            frequency === freq.value &&
                              styles.frequencyOptionSelected,
                          ]}
                          onPress={() => setFrequency(freq.value)}
                          disabled={saving}
                        >
                          <ThemedText
                            style={[
                              styles.frequencyOptionText,
                              frequency === freq.value &&
                                styles.frequencyOptionTextSelected,
                            ]}
                          >
                            {freq.label}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Days of Week (for Date Range frequency) */}
                {frequency === "date_range" && (
                  <>
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color={AppColors.primary}
                        style={styles.inputIcon}
                      />
                      <View style={styles.selectorContainer}>
                        <ThemedText style={styles.selectorLabel}>
                          Days of the Week
                        </ThemedText>
                        <View style={styles.daysSelector}>
                          {[
                            "sunday",
                            "monday",
                            "tuesday",
                            "wednesday",
                            "thursday",
                            "friday",
                            "saturday",
                          ].map((day) => (
                            <TouchableOpacity
                              key={day}
                              style={[
                                styles.dayOption,
                                daysOfWeek.includes(day) &&
                                  styles.dayOptionSelected,
                              ]}
                              onPress={() => {
                                if (daysOfWeek.includes(day)) {
                                  setDaysOfWeek(
                                    daysOfWeek.filter((d) => d !== day)
                                  );
                                } else {
                                  setDaysOfWeek([...daysOfWeek, day]);
                                }
                              }}
                              disabled={saving}
                            >
                              <ThemedText
                                style={[
                                  styles.dayOptionText,
                                  daysOfWeek.includes(day) &&
                                    styles.dayOptionTextSelected,
                                ]}
                              >
                                {day.slice(0, 3).toUpperCase()}
                              </ThemedText>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>

                    {/* Date Range */}
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="calendar"
                        size={20}
                        color={AppColors.primary}
                        style={styles.inputIcon}
                      />
                      <TouchableOpacity
                        onPress={showStartDatepicker}
                        style={styles.timePickerButton}
                        disabled={saving}
                      >
                        <View style={styles.timePickerContent}>
                          <ThemedText style={styles.timePickerLabel}>
                            Start Date
                          </ThemedText>
                          <View style={styles.timeDisplayContainer}>
                            <ThemedText style={styles.timeText}>
                              {startDate.toLocaleDateString()}
                            </ThemedText>
                            <Ionicons
                              name="chevron-down"
                              size={16}
                              color={AppColors.textSecondary}
                            />
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color={AppColors.primary}
                        style={styles.inputIcon}
                      />
                      <TouchableOpacity
                        onPress={showEndDatepicker}
                        style={styles.timePickerButton}
                        disabled={saving}
                      >
                        <View style={styles.timePickerContent}>
                          <ThemedText style={styles.timePickerLabel}>
                            End Date (Optional)
                          </ThemedText>
                          <View style={styles.timeDisplayContainer}>
                            <ThemedText style={styles.timeText}>
                              {endDate
                                ? endDate.toLocaleDateString()
                                : "Select end date"}
                            </ThemedText>
                            <Ionicons
                              name="chevron-down"
                              size={16}
                              color={AppColors.textSecondary}
                            />
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* Date Pickers */}
                    {showStartDatePicker && (
                      <View style={styles.timePickerContainer}>
                        <DateTimePicker
                          value={startDate}
                          mode="date"
                          display={
                            Platform.OS === "ios" ? "spinner" : "default"
                          }
                          onChange={onStartDateChange}
                          minimumDate={new Date()}
                        />
                      </View>
                    )}

                    {showEndDatePicker && (
                      <View style={styles.timePickerContainer}>
                        <DateTimePicker
                          value={endDate || new Date()}
                          mode="date"
                          display={
                            Platform.OS === "ios" ? "spinner" : "default"
                          }
                          onChange={onEndDateChange}
                          minimumDate={startDate}
                        />
                      </View>
                    )}
                  </>
                )}

                {/* Save Button */}
                <TouchableOpacity
                  onPress={handleSave}
                  style={[
                    styles.saveButtonContainer,
                    saving && styles.saveButtonDisabled,
                  ]}
                  disabled={saving}
                >
                  <LinearGradient
                    colors={
                      saving
                        ? [AppColors.gray400, AppColors.gray500]
                        : [AppColors.success, AppColors.successDark]
                    }
                    style={styles.saveButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {saving ? (
                      <View style={styles.savingContainer}>
                        <ThemedText style={styles.saveButtonText}>
                          Saving...
                        </ThemedText>
                      </View>
                    ) : (
                      <View style={styles.saveButtonContent}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={AppColors.white}
                        />
                        <ThemedText style={styles.saveButtonText}>
                          Save Medication
                        </ThemedText>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.primaryDark,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppColors.white,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mainCard: {
    backgroundColor: AppColors.white,
    borderRadius: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: AppColors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  cardContent: {
    padding: 24,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  formContainer: {
    gap: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inputIcon: {
    marginTop: 8,
  },
  input: {
    flex: 1,
    backgroundColor: AppColors.white,
  },
  timePickerButton: {
    flex: 1,
    backgroundColor: AppColors.white,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: AppColors.gray300,
    padding: 16,
    minHeight: 56,
    justifyContent: "center",
  },
  timePickerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timePickerLabel: {
    fontSize: 16,
    color: AppColors.textSecondary,
  },
  timeDisplayContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  timePickerContainer: {
    marginTop: 8,
  },
  selectorContainer: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textPrimary,
    marginBottom: 12,
  },
  frequencySelector: {
    flexDirection: "row",
    gap: 8,
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.gray300,
    backgroundColor: AppColors.white,
    alignItems: "center",
  },
  frequencyOptionSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  frequencyOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: AppColors.textPrimary,
  },
  frequencyOptionTextSelected: {
    color: AppColors.white,
  },
  daysSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayOption: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: AppColors.gray300,
    backgroundColor: AppColors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  dayOptionSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  dayOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  dayOptionTextSelected: {
    color: AppColors.white,
  },
  saveButtonContainer: {
    marginTop: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  saveButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  savingContainer: {
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: AppColors.white,
  },
});
