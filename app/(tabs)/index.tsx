import { ThemedText } from "@/components/ThemedText";
import { AppColors } from "@/constants/AppColors";
import { globalDatabaseManager } from "@/services/globalDatabaseManager";
import { medicationIntegrationService } from "@/services/medicationIntegrationService";
import { formatDateToLocal, getTodayDateString } from "@/utils/dateUtils";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { Card } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

// Helper function to get status color
const getStatusColor = (status: string) => {
  switch (status) {
    case "taken":
      return AppColors.taken;
    case "skipped":
      return AppColors.skipped;
    case "missed":
      return AppColors.missed;
    case "overdue":
      return AppColors.overdue;
    default:
      return AppColors.pending;
  }
};

// A reusable component for the medication card
const MedicationCard = ({
  medicationId,
  name,
  dosage,
  timeSlot,
  status,
  canInteract,
  onTake,
  onSkip,
  onEdit,
  isDeleted = false,
}: {
  medicationId: number;
  name: string;
  dosage: string;
  timeSlot: string;
  status: string;
  canInteract: boolean;
  onTake: (id: number) => void;
  onSkip: (id: number) => void;
  onEdit?: (id: number, newStatus: "taken" | "skipped") => void;
  isDeleted?: boolean;
}) => (
  <View
    style={[
      styles.medicationCard,
      status === "taken" && styles.medicationCardTaken,
      status === "missed" && styles.medicationCardMissed,
    ]}
  >
    <View style={styles.medicationCardContent}>
      <View style={styles.medicationInfo}>
        <View
          style={[
            styles.medicationStatus,
            { backgroundColor: getStatusColor(status) },
          ]}
        >
          <FontAwesome
            name={
              status === "taken"
                ? "check"
                : status === "skipped"
                ? "times"
                : status === "missed"
                ? "exclamation"
                : "clock-o"
            }
            size={12}
            color={AppColors.white}
          />
        </View>
        <View style={styles.medicationDetails}>
          <ThemedText style={styles.medicationName}>{name}</ThemedText>
          <ThemedText style={styles.medicationDosage}>{dosage}</ThemedText>
          <ThemedText style={styles.medicationTime}>{timeSlot}</ThemedText>
        </View>
      </View>

      {status === "pending" && canInteract && (
        <View style={styles.medicationActions}>
          <TouchableOpacity
            style={styles.takeButton}
            onPress={() => onTake(medicationId)}
          >
            <FontAwesome name="check" size={14} color={AppColors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => onSkip(medicationId)}
          >
            <FontAwesome name="times" size={14} color={AppColors.white} />
          </TouchableOpacity>
        </View>
      )}

      {(status === "taken" || status === "skipped") &&
        canInteract &&
        onEdit && (
          <View style={styles.medicationEditActions}>
            <TouchableOpacity
              style={[
                styles.editButton,
                status === "taken" && styles.editButtonActive,
              ]}
              onPress={() => onEdit(medicationId, "taken")}
              disabled={status === "taken"}
            >
              <FontAwesome
                name="check"
                size={12}
                color={status === "taken" ? AppColors.white : AppColors.taken}
              />
              <ThemedText
                style={[
                  styles.editButtonText,
                  status === "taken" && styles.editButtonTextActive,
                ]}
              >
                Taken
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.editButton,
                status === "skipped" && styles.editButtonActive,
              ]}
              onPress={() => onEdit(medicationId, "skipped")}
              disabled={status === "skipped"}
            >
              <FontAwesome
                name="times"
                size={12}
                color={
                  status === "skipped" ? AppColors.white : AppColors.skipped
                }
              />
              <ThemedText
                style={[
                  styles.editButtonText,
                  status === "skipped" && styles.editButtonTextActive,
                ]}
              >
                Skipped
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

      {status === "taken" && (!canInteract || !onEdit) && (
        <View style={styles.completedBadge}>
          <FontAwesome name="check-circle" size={16} color={AppColors.taken} />
        </View>
      )}

      {status === "skipped" && (!canInteract || !onEdit) && (
        <View style={styles.completedBadge}>
          <FontAwesome
            name="times-circle"
            size={16}
            color={AppColors.skipped}
          />
        </View>
      )}
    </View>
  </View>
);

export default function HomeScreen() {
  // Removed auth dependencies since we're bypassing auth
  // const { user, loading: authLoading } = useAuth();

  // Bypass auth check - removed redirect to welcome
  // useEffect(() => {
  //   if (!authLoading && !user) {
  //     router.replace("/welcome");
  //   }
  // }, [authLoading, user]);

  const [homeData, setHomeData] = useState<{
    medications: any[];
    summary: {
      total: number;
      taken: number;
      skipped: number;
      pending: number;
      missed: number;
    };
    canInteractWithDate: boolean;
    isToday: boolean;
    isPast: boolean;
    isFuture: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Calendar state
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [showCalendar, setShowCalendar] = useState(false);

  // Side Effect Modal State
  const [sideEffectModalVisible, setSideEffectModalVisible] = useState(false);
  const [availableMedications, setAvailableMedications] = useState<
    { id: string; name: string }[]
  >([]);
  const [showMedicationPicker, setShowMedicationPicker] = useState(false);
  const [sideEffectForm, setSideEffectForm] = useState({
    medicationId: "",
    medicationName: "",
    sideEffectType: "",
    severity: "mild",
    description: "",
    dateTime: new Date().toISOString(),
  });

  // Initialize medication system (database only, no notification rescheduling)
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        // Only initialize database and notification permissions, don't reschedule existing notifications
        await medicationIntegrationService.initializeSystemWithoutRescheduling();
        console.log("✅ Medication system initialized without rescheduling");
      } catch (error) {
        console.error("❌ Failed to initialize medication system:", error);
      }
    };

    // Initialize immediately without waiting for user authentication
    initializeSystem();
  }, []); // Remove auth dependencies

  const selectedDateObj = new Date(selectedDate);
  const dateString = selectedDateObj.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Helper function to check if selected date is today
  const isToday = selectedDate === getTodayDateString();

  // Helper function to get formatted date for display
  const getDateForDisplay = () => {
    if (isToday) {
      return dateString;
    }
    return selectedDateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Generate marked dates for calendar
  const getMarkedDates = () => {
    const marked: any = {};
    marked[selectedDate] = {
      selected: true,
      selectedColor: AppColors.primary,
      selectedTextColor: AppColors.white,
    };

    // Mark today if it's different from selected
    const todayString = getTodayDateString();
    if (todayString !== selectedDate) {
      marked[todayString] = {
        marked: true,
        dotColor: AppColors.success,
      };
    }

    return marked;
  };

  // Generate 7-day horizontal calendar data
  const getWeekDays = () => {
    const today = new Date();
    const days = [];

    // Start from 3 days before today and go 3 days after
    for (let i = -3; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dateString = formatDateToLocal(date);
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      const dayNumber = date.getDate();
      const isToday = dateString === getTodayDateString();
      const isSelected = dateString === selectedDate;

      days.push({
        date: dateString,
        dayName,
        dayNumber,
        isToday,
        isSelected,
        fullDate: date,
      });
    }

    return days;
  };

  const loadHomeData = useCallback(async () => {
    try {
      console.log(`🏠 [HomeScreen] Loading data for ${selectedDate}...`);

      // Get medications for the selected date from database
      const medications =
        await medicationIntegrationService.getMedicationsForDate(selectedDate);

      // Calculate date properties
      const today = getTodayDateString();
      const isToday = selectedDate === today;
      const selectedDateObj = new Date(selectedDate);
      const todayObj = new Date(today);
      const isPast = selectedDateObj < todayObj;
      const isFuture = selectedDateObj > todayObj;
      const canInteractWithDate = isToday || isPast; // Can interact with today and past dates

      // Calculate summary stats
      const totalMedications = medications.length;
      const takenMedications = medications.filter(
        (m) => m.status === "taken"
      ).length;
      const skippedMedications = medications.filter(
        (m) => m.status === "skipped"
      ).length;
      const missedMedications = medications.filter(
        (m) => m.status === "missed"
      ).length;
      const pendingMedications = medications.filter(
        (m) => m.status === "pending"
      ).length;


      const data = {
        medications,
        summary: {
          total: totalMedications,
          taken: takenMedications,
          skipped: skippedMedications,
          pending: pendingMedications,
          missed: missedMedications,
        },
        canInteractWithDate,
        isToday,
        isPast,
        isFuture,
      };

      console.log(
        `🏠 [HomeScreen] Loaded ${medications.length} medications for ${selectedDate}`
      );
      console.log(`📊 [HomeScreen] Summary:`, data.summary);
      setHomeData(data);
    } catch (error) {
      console.error("❌ Failed to load home data:", error);
    }
  }, [selectedDate]);

  const loadMedications = useCallback(async () => {
    try {
      const medications =
        await medicationIntegrationService.getAllMedications();
      const medicationOptions = medications.map((med: any) => ({
        id: med.id.toString(),
        name: med.name,
      }));
      setAvailableMedications(medicationOptions);
    } catch (error) {
      console.error("❌ Failed to load medications:", error);
      setAvailableMedications([]);
    }
  }, []);

  // Initialize database and load data
  useEffect(() => {
    const initialize = async () => {
      try {
        // SimpleMedicationService uses global database manager, no manual initialization needed
        await loadHomeData();
      } catch (error) {
        console.error("Failed to initialize database:", error);
        Alert.alert("Error", "Failed to load medication data");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [loadHomeData]); // Reload when loadHomeData changes

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        try {
          // Ensure databases are ready when switching to this tab (Android-specific)
          await globalDatabaseManager.initialize();
          await loadHomeData();
        } catch (error) {
          console.error("Failed to refresh data:", error);
          // Show user-friendly error for database issues
          if (
            error instanceof Error &&
            error.message.includes("Database initialization failed")
          ) {
            Alert.alert(
              "Database Error",
              "Unable to load medication data. Please restart the app if this persists.",
              [{ text: "OK" }]
            );
          }
        }
      };
      refreshData();
    }, [loadHomeData])
  );

  const handleTake = async (id: number) => {
    try {
      await medicationIntegrationService.updateMedicationStatus(
        id,
        selectedDate,
        "taken"
      );
      await loadHomeData();
    } catch (error) {
      console.error("Failed to log medication:", error);
      Alert.alert("Error", "Failed to update medication status");
    }
  };

  const handleSkip = async (id: number) => {
    try {
      await medicationIntegrationService.updateMedicationStatus(
        id,
        selectedDate,
        "skipped"
      );
      await loadHomeData();
    } catch (error) {
      console.error("Failed to log medication:", error);
      Alert.alert("Error", "Failed to update medication status");
    }
  };

  const handleEdit = async (id: number, newStatus: "taken" | "skipped") => {
    try {
      console.log(`🔄 Changing medication ${id} status to ${newStatus}`);
      await medicationIntegrationService.updateMedicationStatus(
        id,
        selectedDate,
        newStatus
      );
      await loadHomeData();

      const statusText = newStatus === "taken" ? "taken" : "skipped";
      Alert.alert("Success", `Medication status updated to ${statusText}`);
    } catch (error) {
      console.error("Failed to update medication status:", error);
      Alert.alert("Error", "Failed to update medication status");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const handleDeleteAllLogs = async () => {
    Alert.alert(
      "Delete All Logs",
      "Are you sure you want to delete all medication logs? This action cannot be undone and will remove all your medication history.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              const { simpleMedicationService } = await import(
                "@/services/simpleMedicationService"
              );
              await simpleMedicationService.deleteAllMedicationLogs();
              await loadHomeData();
              Alert.alert("Success", "All medication logs have been deleted.");
            } catch (error) {
              console.error("Failed to delete all logs:", error);
              Alert.alert(
                "Error",
                "Failed to delete all logs. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  // Optimize expensive calculations with useMemo to prevent unnecessary re-renders
  const nextMed = useMemo(() => {
    // Only show next medication for today's date
    if (!homeData?.medications || !homeData.isToday) return null;

    const pending = homeData.medications.filter(
      (med) => med.status === "pending"
    );
    return pending[0] || null;
  }, [homeData?.medications, homeData?.isToday]);

  const adherenceScore = useMemo(() => {
    if (!homeData?.summary) return 0;
    return homeData.summary.total > 0
      ? Math.round((homeData.summary.taken / homeData.summary.total) * 100)
      : 0;
  }, [homeData?.summary]);

  const medications = useMemo(() => {
    if (!homeData?.medications) {
      return { morning: [], afternoon: [], evening: [] };
    }

    const morning = homeData.medications.filter((med) => {
      if (!med.timeSlot || typeof med.timeSlot !== "string") return false;
      const hour = parseInt(med.timeSlot.split(":")[0]);
      return hour >= 5 && hour < 12;
    });

    const afternoon = homeData.medications.filter((med) => {
      if (!med.timeSlot || typeof med.timeSlot !== "string") return false;
      const hour = parseInt(med.timeSlot.split(":")[0]);
      return hour >= 12 && hour < 17;
    });

    const evening = homeData.medications.filter((med) => {
      if (!med.timeSlot || typeof med.timeSlot !== "string") return false;
      const hour = parseInt(med.timeSlot.split(":")[0]);
      return hour >= 17 || hour < 5;
    });

    return { morning, afternoon, evening };
  }, [homeData?.medications]);

  const streakDays = useMemo(() => {
    // This would be calculated from historical data
    return 7;
  }, []);

  if (loading || !homeData) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[
            AppColors.primary,
            AppColors.primaryLight,
            AppColors.background,
          ]}
          style={styles.loadingContainer}
        >
          <View style={styles.loadingContent}>
            <FontAwesome name="heartbeat" size={48} color={AppColors.white} />
            <ThemedText style={styles.loadingText}>
              Loading your medications...
            </ThemedText>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <LinearGradient
          colors={[AppColors.primary, AppColors.primaryLight]}
          style={styles.headerGradient}
        >
          <View>
            <View style={styles.headerContent}>
              {/* Calendar Icon and Title */}
              <View style={styles.calendarHeaderRow}>
                <TouchableOpacity
                  style={styles.calendarIconButton}
                  onPress={() => setShowCalendar(!showCalendar)}
                >
                  <FontAwesome
                    name="calendar"
                    size={20}
                    color={AppColors.white}
                  />
                </TouchableOpacity>
                <ThemedText style={styles.calendarTitle}>
                  {isToday ? "Today" : getDateForDisplay().split(",")[0]}
                </ThemedText>
              </View>

              {/* Horizontal 7-Day Calendar */}
              <View style={styles.horizontalCalendar}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalCalendarContent}
                >
                  {getWeekDays().map((day) => (
                    <TouchableOpacity
                      key={day.date}
                      style={[
                        styles.dayCard,
                        day.isSelected && styles.dayCardSelected,
                        day.isToday && !day.isSelected && styles.dayCardToday,
                      ]}
                      onPress={() => setSelectedDate(day.date)}
                    >
                      <ThemedText
                        style={[
                          styles.dayName,
                          day.isSelected && styles.dayNameSelected,
                          day.isToday && !day.isSelected && styles.dayNameToday,
                        ]}
                      >
                        {day.dayName}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.dayNumber,
                          day.isSelected && styles.dayNumberSelected,
                          day.isToday &&
                            !day.isSelected &&
                            styles.dayNumberToday,
                        ]}
                      >
                        {day.dayNumber}
                      </ThemedText>
                      {day.isToday && (
                        <View
                          style={[
                            styles.todayDot,
                            day.isSelected && styles.todayDotSelected,
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Collapsible Full Calendar */}
              {showCalendar && (
                <View style={styles.calendarContainer}>
                  <Calendar
                    current={selectedDate}
                    onDayPress={(day: any) => {
                      setSelectedDate(day.dateString);
                      setShowCalendar(false);
                    }}
                    markedDates={getMarkedDates()}
                    theme={{
                      backgroundColor: "transparent",
                      calendarBackground: "rgba(255, 255, 255, 0.95)",
                      textSectionTitleColor: AppColors.textPrimary,
                      selectedDayBackgroundColor: AppColors.primary,
                      selectedDayTextColor: AppColors.white,
                      todayTextColor: AppColors.primary,
                      dayTextColor: AppColors.textPrimary,
                      textDisabledColor: AppColors.textSecondary,
                      dotColor: AppColors.success,
                      selectedDotColor: AppColors.white,
                      arrowColor: AppColors.primary,
                      monthTextColor: AppColors.textPrimary,
                      indicatorColor: AppColors.primary,
                      textDayFontFamily: "System",
                      textMonthFontFamily: "System",
                      textDayHeaderFontFamily: "System",
                      textDayFontWeight: "400",
                      textMonthFontWeight: "600",
                      textDayHeaderFontWeight: "600",
                      textDayFontSize: 14,
                      textMonthFontSize: 16,
                      textDayHeaderFontSize: 12,
                    }}
                    style={styles.calendar}
                  />
                  <TouchableOpacity
                    style={styles.todayButton}
                    onPress={() => {
                      setSelectedDate(getTodayDateString());
                      setShowCalendar(false);
                    }}
                  >
                    <FontAwesome
                      name="home"
                      size={14}
                      color={AppColors.primary}
                    />
                    <ThemedText style={styles.todayButtonText}>
                      Back to Today
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {/* Achievement Badge */}
              <View style={styles.achievementBadge}>
                <FontAwesome
                  name="trophy"
                  size={16}
                  color={AppColors.warning}
                />
                <ThemedText style={styles.achievementText}>
                  {streakDays}-day streak • {adherenceScore}% adherence
                </ThemedText>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.mainContent}>
          {/* Next Medication Alert */}
          {nextMed && (
            <Card style={styles.nextMedCard}>
              <View style={styles.nextMedHeader}>
                <FontAwesome
                  name="clock-o"
                  size={20}
                  color={AppColors.warning}
                />
                <ThemedText style={styles.nextMedTitle}>
                  Next Medication
                </ThemedText>
              </View>
              <View style={styles.nextMedContent}>
                <View style={styles.nextMedInfo}>
                  <ThemedText style={styles.nextMedName}>
                    {nextMed.medicationName}
                  </ThemedText>
                  <ThemedText style={styles.nextMedDetails}>
                    {nextMed.dosage} • {nextMed.timeSlot}
                  </ThemedText>
                </View>
                <View style={styles.nextMedActions}>
                  <TouchableOpacity
                    style={styles.takeNowButton}
                    onPress={() => handleTake(nextMed.medicationId)}
                  >
                    <FontAwesome
                      name="check"
                      size={16}
                      color={AppColors.white}
                    />
                    <ThemedText style={styles.takeNowText}>Take Now</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          )}

          {/* Today's Progress */}
          <Card style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <ThemedText style={styles.progressTitle}>
                {isToday ? "Today's Progress" : "Daily Progress"}
              </ThemedText>
              <ThemedText style={styles.progressSubtitle}>
                {homeData.summary.taken} of {homeData.summary.total} medications
                taken
                {!isToday && ` on ${selectedDateObj.toLocaleDateString()}`}
              </ThemedText>
            </View>

            <View style={styles.progressStats}>
              <View style={styles.progressStat}>
                <View
                  style={[
                    styles.statCircle,
                    { backgroundColor: AppColors.taken },
                  ]}
                >
                  <FontAwesome name="check" size={16} color={AppColors.white} />
                </View>
                <ThemedText style={styles.statNumber}>
                  {homeData.summary.taken}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Taken</ThemedText>
              </View>

              <View style={styles.progressStat}>
                <View
                  style={[
                    styles.statCircle,
                    { backgroundColor: AppColors.pending },
                  ]}
                >
                  <FontAwesome
                    name="clock-o"
                    size={16}
                    color={AppColors.white}
                  />
                </View>
                <ThemedText style={styles.statNumber}>
                  {homeData.summary.pending}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Pending</ThemedText>
              </View>

              <View style={styles.progressStat}>
                <View
                  style={[
                    styles.statCircle,
                    { backgroundColor: AppColors.skipped },
                  ]}
                >
                  <FontAwesome name="times" size={16} color={AppColors.white} />
                </View>
                <ThemedText style={styles.statNumber}>
                  {homeData.summary.skipped}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Skipped</ThemedText>
              </View>
            </View>
          </Card>

          {/* Medication Timeline */}
          <Card style={styles.timelineCard}>
            <ThemedText style={styles.timelineTitle}>
              {isToday
                ? "Today's Medications"
                : "Medications for " + selectedDateObj.toLocaleDateString()}
            </ThemedText>

            {/* Morning */}
            <View style={styles.timelineSection}>
              <View style={styles.timelineHeader}>
                <FontAwesome name="sun-o" size={20} color={AppColors.warning} />
                <ThemedText style={styles.timelineSectionTitle}>
                  Morning
                </ThemedText>
                <ThemedText style={styles.timelineSectionCount}>
                  {
                    medications.morning.filter((m) => m.status === "taken")
                      .length
                  }
                  /{medications.morning.length}
                </ThemedText>
              </View>
              {medications.morning.map((med) => (
                <MedicationCard
                  key={med.id || `${med.medicationId}-morning`}
                  medicationId={med.medicationId}
                  name={med.medicationName}
                  dosage={med.dosage}
                  timeSlot={med.timeSlot}
                  status={med.status}
                  canInteract={med.canInteract} // Use backend-provided canInteract
                  onTake={handleTake}
                  onSkip={handleSkip}
                  onEdit={handleEdit}
                  isDeleted={med.isDeleted}
                />
              ))}
            </View>

            {/* Afternoon */}
            <View style={styles.timelineSection}>
              <View style={styles.timelineHeader}>
                <FontAwesome name="sun-o" size={20} color={AppColors.primary} />
                <ThemedText style={styles.timelineSectionTitle}>
                  Afternoon
                </ThemedText>
                <ThemedText style={styles.timelineSectionCount}>
                  {
                    medications.afternoon.filter((m) => m.status === "taken")
                      .length
                  }
                  /{medications.afternoon.length}
                </ThemedText>
              </View>
              {medications.afternoon.map((med) => (
                <MedicationCard
                  key={med.id || `${med.medicationId}-afternoon`}
                  medicationId={med.medicationId}
                  name={med.medicationName}
                  dosage={med.dosage}
                  timeSlot={med.timeSlot}
                  status={med.status}
                  canInteract={med.canInteract} // Use backend-provided canInteract
                  onTake={handleTake}
                  onSkip={handleSkip}
                  onEdit={handleEdit}
                  isDeleted={med.isDeleted}
                />
              ))}
            </View>

            {/* Evening */}
            <View style={styles.timelineSection}>
              <View style={styles.timelineHeader}>
                <FontAwesome
                  name="moon-o"
                  size={20}
                  color={AppColors.secondary}
                />
                <ThemedText style={styles.timelineSectionTitle}>
                  Evening
                </ThemedText>
                <ThemedText style={styles.timelineSectionCount}>
                  {
                    medications.evening.filter((m) => m.status === "taken")
                      .length
                  }
                  /{medications.evening.length}
                </ThemedText>
              </View>
              {medications.evening.map((med) => (
                <MedicationCard
                  key={med.id || `${med.medicationId}-evening`}
                  medicationId={med.medicationId}
                  name={med.medicationName}
                  dosage={med.dosage}
                  timeSlot={med.timeSlot}
                  status={med.status}
                  canInteract={med.canInteract} // Use backend-provided canInteract
                  onTake={handleTake}
                  onSkip={handleSkip}
                  onEdit={handleEdit}
                  isDeleted={med.isDeleted}
                />
              ))}
            </View>
          </Card>

          {/* Quick Links Section */}
          <Card style={styles.quickLinksCard}>
            <View style={styles.quickLinksHeader}>
              <FontAwesome name="bolt" size={20} color={AppColors.primary} />
              <ThemedText style={styles.quickLinksTitle}>
                Quick Actions
              </ThemedText>
            </View>
            <View style={styles.quickLinksGrid}>
              <TouchableOpacity
                style={styles.quickLinkItem}
                onPress={() => router.push("/add-medication")}
              >
                <View
                  style={[
                    styles.quickLinkIcon,
                    { backgroundColor: AppColors.primary },
                  ]}
                >
                  <FontAwesome name="plus" size={18} color={AppColors.white} />
                </View>
                <ThemedText style={styles.quickLinkText}>
                  Add Medication
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickLinkItem}
                onPress={() => {
                  setSideEffectModalVisible(true);
                  loadMedications();
                }}
              >
                <View
                  style={[
                    styles.quickLinkIcon,
                    { backgroundColor: AppColors.warning },
                  ]}
                >
                  <FontAwesome
                    name="exclamation-triangle"
                    size={18}
                    color={AppColors.white}
                  />
                </View>
                <ThemedText style={styles.quickLinkText}>
                  Log Side Effect
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickLinkItem}
                onPress={() => router.push("/(tabs)/analytics")}
              >
                <View
                  style={[
                    styles.quickLinkIcon,
                    { backgroundColor: AppColors.accent },
                  ]}
                >
                  <FontAwesome
                    name="bar-chart"
                    size={18}
                    color={AppColors.white}
                  />
                </View>
                <ThemedText style={styles.quickLinkText}>
                  View Analytics
                </ThemedText>
              </TouchableOpacity>

              {/* Notifications quick action removed as requested */}

              <TouchableOpacity
                style={styles.quickLinkItem}
                onPress={handleDeleteAllLogs}
              >
                <View
                  style={[
                    styles.quickLinkIcon,
                    { backgroundColor: AppColors.error },
                  ]}
                >
                  <FontAwesome name="trash" size={18} color={AppColors.white} />
                </View>
                <ThemedText style={styles.quickLinkText}>
                  Delete All Logs
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickLinkItem}
                onPress={() => router.push("/(tabs)/ai-assistant")}
              >
                <View
                  style={[
                    styles.quickLinkIcon,
                    { backgroundColor: AppColors.chatBot },
                  ]}
                >
                  <FontAwesome
                    name="comments"
                    size={18}
                    color={AppColors.white}
                  />
                </View>
                <ThemedText style={styles.quickLinkText}>AI Chat</ThemedText>
              </TouchableOpacity>
            </View>
          </Card>

          <View style={styles.bottomPadding} />
        </View>
      </ScrollView>

      {/* Side Effect Modal */}
      <Modal
        visible={sideEffectModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSideEffectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sideEffectModalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Log Side Effect</ThemedText>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSideEffectModalVisible(false)}
              >
                <FontAwesome
                  name="times"
                  size={20}
                  color={AppColors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalForm}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* Medication Selection */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>
                  Medication (Optional)
                </ThemedText>
                <View style={styles.medicationSelector}>
                  <TouchableOpacity
                    style={styles.medicationSelectorButton}
                    onPress={() =>
                      setShowMedicationPicker(!showMedicationPicker)
                    }
                  >
                    <FontAwesome
                      name="medkit"
                      size={16}
                      color={AppColors.primary}
                    />
                    <ThemedText style={styles.medicationSelectorText}>
                      {sideEffectForm.medicationName ||
                        "None selected (optional)"}
                    </ThemedText>
                    <FontAwesome
                      name={
                        showMedicationPicker ? "chevron-up" : "chevron-down"
                      }
                      size={12}
                      color={AppColors.textSecondary}
                    />
                  </TouchableOpacity>

                  {showMedicationPicker && (
                    <View style={styles.medicationPicker}>
                      <TouchableOpacity
                        style={[
                          styles.medicationOption,
                          !sideEffectForm.medicationName &&
                            styles.medicationOptionSelected,
                        ]}
                        onPress={() => {
                          setSideEffectForm({
                            ...sideEffectForm,
                            medicationId: "",
                            medicationName: "",
                          });
                          setShowMedicationPicker(false);
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.medicationOptionText,
                            !sideEffectForm.medicationName &&
                              styles.medicationOptionTextSelected,
                          ]}
                        >
                          No medication (general side effect)
                        </ThemedText>
                      </TouchableOpacity>

                      {availableMedications.map((medication) => (
                        <TouchableOpacity
                          key={medication.id}
                          style={[
                            styles.medicationOption,
                            sideEffectForm.medicationId === medication.id &&
                              styles.medicationOptionSelected,
                          ]}
                          onPress={() => {
                            setSideEffectForm({
                              ...sideEffectForm,
                              medicationId: medication.id,
                              medicationName: medication.name,
                            });
                            setShowMedicationPicker(false);
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.medicationOptionText,
                              sideEffectForm.medicationId === medication.id &&
                                styles.medicationOptionTextSelected,
                            ]}
                          >
                            {medication.name}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Side Effect Type */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>
                  Side Effect Type
                </ThemedText>
                <View style={styles.sideEffectTypes}>
                  {[
                    "Nausea",
                    "Dizziness",
                    "Headache",
                    "Fatigue",
                    "Dry mouth",
                    "Other",
                  ].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.sideEffectTypeButton,
                        sideEffectForm.sideEffectType === type &&
                          styles.sideEffectTypeButtonActive,
                      ]}
                      onPress={() =>
                        setSideEffectForm({
                          ...sideEffectForm,
                          sideEffectType: type,
                        })
                      }
                    >
                      <ThemedText
                        style={[
                          styles.sideEffectTypeText,
                          sideEffectForm.sideEffectType === type &&
                            styles.sideEffectTypeTextActive,
                        ]}
                      >
                        {type}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Severity */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>
                  Severity Level
                </ThemedText>
                <View style={styles.severityContainer}>
                  {["mild", "moderate", "severe"].map((severity) => (
                    <TouchableOpacity
                      key={severity}
                      style={[
                        styles.severityButton,
                        sideEffectForm.severity === severity &&
                          styles.severityButtonActive,
                        {
                          backgroundColor:
                            severity === "mild"
                              ? AppColors.success + "20"
                              : severity === "moderate"
                              ? AppColors.warning + "20"
                              : AppColors.error + "20",
                        },
                      ]}
                      onPress={() =>
                        setSideEffectForm({ ...sideEffectForm, severity })
                      }
                    >
                      <ThemedText
                        style={[
                          styles.severityText,
                          sideEffectForm.severity === severity &&
                            styles.severityTextActive,
                          {
                            color:
                              severity === "mild"
                                ? AppColors.success
                                : severity === "moderate"
                                ? AppColors.warning
                                : AppColors.error,
                          },
                        ]}
                      >
                        {severity.charAt(0).toUpperCase() + severity.slice(1)}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>
                  Additional Notes (Optional)
                </ThemedText>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Describe how you're feeling or any additional details..."
                  value={sideEffectForm.description}
                  onChangeText={(text) =>
                    setSideEffectForm({ ...sideEffectForm, description: text })
                  }
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor={AppColors.textSecondary}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setSideEffectModalVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={async () => {
                  try {
                    // Validate required fields
                    if (!sideEffectForm.sideEffectType) {
                      Alert.alert("Error", "Please select a side effect type");
                      return;
                    }

                    console.log("🔄 Starting side effect logging...");
                    console.log("📋 Form data:", sideEffectForm);

                    // Import health logs service
                    const { healthLogsService } = await import(
                      "@/services/healthLogsService"
                    );

                    // Initialize database first
                    await healthLogsService.initializeDatabase();
                    console.log("✅ Health logs database initialized");

                    // Prepare side effect data
                    const sideEffectData = {
                      medicationId: sideEffectForm.medicationId
                        ? parseInt(sideEffectForm.medicationId)
                        : undefined,
                      medicationName:
                        sideEffectForm.medicationName || undefined,
                      symptom: sideEffectForm.sideEffectType,
                      severity: sideEffectForm.severity as
                        | "mild"
                        | "moderate"
                        | "severe",
                      description: sideEffectForm.description || "",
                      startTime: new Date().toISOString(),
                      reportedTime: new Date().toISOString(),
                      contactedDoctor: false,
                    };

                    console.log("� Saving side effect data:", sideEffectData);

                    // Save to database
                    await healthLogsService.logSideEffect(sideEffectData);
                    console.log("✅ Side effect saved successfully!");

                    Alert.alert("Success", "Side effect logged successfully!");
                    setSideEffectModalVisible(false);
                    setShowMedicationPicker(false);

                    // Reset form
                    setSideEffectForm({
                      medicationId: "",
                      medicationName: "",
                      sideEffectType: "",
                      severity: "mild",
                      description: "",
                      dateTime: new Date().toISOString(),
                    });
                  } catch (error) {
                    console.error("❌ Error logging side effect:", error);
                    const errorMessage =
                      error instanceof Error ? error.message : String(error);
                    Alert.alert(
                      "Error",
                      `Failed to log side effect: ${errorMessage}`
                    );
                  }
                }}
              >
                <ThemedText style={styles.saveButtonText}>
                  Log Side Effect
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
    gap: 20,
  },
  loadingText: {
    fontSize: 18,
    color: AppColors.white,
    fontWeight: "600",
  },
  headerGradient: {
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 0,
  },
  headerContent: {
    gap: 8,
    marginTop: 10,
  },

  achievementBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 10,
    gap: 8,
  },
  achievementText: {
    color: AppColors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -10,
  },
  nextMedCard: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: AppColors.white,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  nextMedHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 10,
  },
  nextMedTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.textPrimary,
  },
  nextMedContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  nextMedInfo: {
    flex: 1,
  },
  nextMedName: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  nextMedDetails: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  nextMedActions: {
    marginLeft: 16,
  },
  takeNowButton: {
    flexDirection: "row",
    backgroundColor: AppColors.success,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  takeNowText: {
    color: AppColors.white,
    fontWeight: "600",
    fontSize: 14,
  },
  progressCard: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: AppColors.white,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    padding: 16,
  },
  progressHeader: {
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  progressStat: {
    alignItems: "center",
    gap: 6,
  },
  statCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: AppColors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: AppColors.textSecondary,
  },
  quickActionsCard: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: AppColors.white,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    padding: 20,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  quickAction: {
    alignItems: "center",
    width: "23%",
    gap: 8,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionText: {
    fontSize: 12,
    textAlign: "center",
    color: AppColors.textSecondary,
    fontWeight: "500",
  },
  timelineCard: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: AppColors.white,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    padding: 20,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    marginBottom: 20,
  },
  timelineSection: {
    marginBottom: 20,
  },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  timelineSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textPrimary,
    flex: 1,
  },
  timelineSectionCount: {
    fontSize: 14,
    color: AppColors.textSecondary,
    backgroundColor: AppColors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  medicationCard: {
    backgroundColor: AppColors.gray50,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.pending,
  },
  medicationCardTaken: {
    borderLeftColor: AppColors.taken,
    opacity: 0.7,
  },
  medicationCardMissed: {
    borderLeftColor: AppColors.missed,
    opacity: 0.8,
  },
  medicationCardDeleted: {
    backgroundColor: AppColors.textLight + "20",
    borderColor: AppColors.textLight,
    borderWidth: 1,
    borderStyle: "dashed",
    opacity: 0.7,
  },
  medicationCardContent: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  medicationInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  medicationStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  medicationDetails: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  medicationNameDeleted: {
    color: AppColors.textLight,
    fontStyle: "italic",
  },
  medicationDosage: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 2,
  },
  medicationTime: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  medicationActions: {
    flexDirection: "row",
    gap: 8,
  },
  takeButton: {
    backgroundColor: AppColors.success,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  skipButton: {
    backgroundColor: AppColors.skipped,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  medicationEditActions: {
    flexDirection: "row",
    gap: 6,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.gray300,
    backgroundColor: AppColors.white,
    gap: 4,
  },
  editButtonActive: {
    borderColor: "transparent",
    backgroundColor: AppColors.primary,
  },
  editButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: AppColors.textSecondary,
  },
  editButtonTextActive: {
    color: AppColors.white,
  },
  completedBadge: {
    padding: 4,
  },
  insightsCard: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: AppColors.white,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    padding: 20,
  },
  insightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.textPrimary,
  },
  insightsList: {
    gap: 12,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  insightText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 120,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sideEffectModalContent: {
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: 500,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppColors.textPrimary,
  },
  closeButton: {
    padding: 8,
  },
  modalForm: {
    maxHeight: 400,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  medicationSelector: {
    borderWidth: 1,
    borderColor: AppColors.gray200,
    borderRadius: 12,
    overflow: "hidden",
  },
  medicationSelectorButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  medicationSelectorText: {
    flex: 1,
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  medicationPicker: {
    marginTop: 8,
    backgroundColor: AppColors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.gray200,
    maxHeight: 200,
  },
  medicationOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.gray100,
  },
  medicationOptionSelected: {
    backgroundColor: AppColors.primary + "15",
  },
  medicationOptionText: {
    fontSize: 14,
    color: AppColors.textPrimary,
  },
  medicationOptionTextSelected: {
    color: AppColors.primary,
    fontWeight: "600",
  },
  sideEffectTypes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sideEffectTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.gray200,
    backgroundColor: AppColors.white,
  },
  sideEffectTypeButtonActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  sideEffectTypeText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontWeight: "500",
  },
  sideEffectTypeTextActive: {
    color: AppColors.white,
  },
  severityContainer: {
    flexDirection: "row",
    gap: 12,
  },
  severityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
  },
  severityButtonActive: {
    borderColor: AppColors.primary,
  },
  severityText: {
    fontSize: 14,
    fontWeight: "600",
  },
  severityTextActive: {
    fontWeight: "bold",
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: AppColors.gray200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: AppColors.textPrimary,
    backgroundColor: AppColors.white,
    minHeight: 100,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.gray200,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: AppColors.textSecondary,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    color: AppColors.white,
    fontWeight: "600",
  },

  // Calendar Styles
  calendarHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  calendarIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarTitle: {
    fontSize: 18,
    color: AppColors.white,
    fontWeight: "600",
    opacity: 0.9,
  },
  horizontalCalendar: {
    marginBottom: 16,
  },
  horizontalCalendarContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  dayCard: {
    width: 50,
    height: 70,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    position: "relative",
  },
  dayCardSelected: {
    backgroundColor: AppColors.white,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  dayCardToday: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  dayName: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
    marginBottom: 4,
  },
  dayNameSelected: {
    color: AppColors.primary,
    fontWeight: "600",
  },
  dayNameToday: {
    color: AppColors.white,
    fontWeight: "600",
  },
  dayNumber: {
    fontSize: 18,
    color: AppColors.white,
    fontWeight: "bold",
  },
  dayNumberSelected: {
    color: AppColors.primary,
  },
  dayNumberToday: {
    color: AppColors.white,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppColors.warning,
    position: "absolute",
    bottom: 6,
  },
  todayDotSelected: {
    backgroundColor: AppColors.warning,
  },
  calendarContainer: {
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  calendar: {
    borderRadius: 12,
  },
  todayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: AppColors.white,
    borderTopWidth: 1,
    borderTopColor: AppColors.gray200,
    gap: 8,
  },
  todayButtonText: {
    fontSize: 14,
    color: AppColors.primary,
    fontWeight: "600",
  },
  // Quick Links Styles
  quickLinksCard: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: AppColors.white,
    elevation: 4,
    shadowColor: AppColors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  quickLinksHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  quickLinksTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.textPrimary,
  },
  quickLinksGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
  },
  quickLinkItem: {
    alignItems: "center",
    width: "22%",
    gap: 8,
    paddingVertical: 8,
  },
  quickLinkIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickLinkText: {
    fontSize: 12,
    textAlign: "center",
    color: AppColors.textSecondary,
    fontWeight: "500",
    lineHeight: 16,
  },
});
