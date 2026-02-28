import { ThemedText } from "@/components/ThemedText";
import { AppColors } from "@/constants/AppColors";
import { healthLogsService } from "@/services/healthLogsService";
import { analyticsService, AnalyticsData, StreakData } from "@/services/analyticsService";
import { dataComparisonService } from "@/services/dataComparisonService";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Card, Chip } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

interface SideEffectLog {
  id: string;
  medicationName: string;
  sideEffectType: string;
  severity: "mild" | "moderate" | "severe";
  description: string;
  dateTime: string;
  date: string;
  time: string;
}

export default function AnalyticsScreen() {
  // Analytics data state
  const [currentPeriodData, setCurrentPeriodData] = useState<AnalyticsData>({
    total: 0,
    taken: 0,
    skipped: 0,
    missed: 0,
    pending: 0,
    adherenceRate: 0,
  });
  
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    streakDates: [],
  });
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "today" | "week" | "month"
  >("today");
  const [activeTab, setActiveTab] = useState<"overview" | "side-effects">(
    "overview"
  );

  // Side Effects State
  const [sideEffectsLogs, setSideEffectsLogs] = useState<SideEffectLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SideEffectLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedMedication, setSelectedMedication] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Load analytics data based on selected period
  const loadAnalyticsData = useCallback(async () => {
    try {
      let analyticsData: AnalyticsData;
      
      switch (selectedPeriod) {
        case "today":
          analyticsData = await analyticsService.getTodayAnalytics();
          break;
        case "week":
          analyticsData = await analyticsService.getWeekAnalytics();
          break;
        case "month":
          analyticsData = await analyticsService.getMonthAnalytics();
          break;
        default:
          analyticsData = await analyticsService.getTodayAnalytics();
      }
      
      setCurrentPeriodData(analyticsData);
      
      // Load streak data (always based on 1 month as requested)
      const streak = await analyticsService.getStreakData();
      setStreakData(streak);
      
      
      // Run data comparison for today's data only
      if (selectedPeriod === "today") {
        try {
          await dataComparisonService.compareDataForDate();
          await dataComparisonService.compareDataSources();
        } catch {
          // Silent comparison failure
        }
      }
    } catch {
      Alert.alert(
        "Loading Error",
        "Failed to load analytics data. Please try refreshing.",
        [
          { text: "Retry", onPress: () => loadAnalyticsData() },
          { text: "Cancel" },
        ]
      );
    }
  }, [selectedPeriod]);

  const loadSideEffects = useCallback(async () => {
    try {
      // Global database manager ensures databases are ready automatically

      // Load side effects from the last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      const allSideEffects: SideEffectLog[] = [];

      // Get side effects for each day in the last 30 days
      for (
        let d = new Date(thirtyDaysAgo);
        d <= today;
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = d.toISOString().split("T")[0];

        try {
          const dailySideEffects =
            await healthLogsService.getSideEffectsForDate(dateStr);

          // Transform the data to match our interface
          const transformedSideEffects = dailySideEffects.map((se) => {
            const reportedTime =
              se.reportedTime || se.startTime || new Date().toISOString();
            const displayTime = new Date(reportedTime);

            const transformed = {
              id: se.id?.toString() || Date.now().toString(),
              medicationName: se.medicationName || "No medication specified",
              sideEffectType: se.symptom || "Unknown symptom",
              severity: (se.severity || "mild") as
                | "mild"
                | "moderate"
                | "severe",
              description: se.description || "",
              dateTime: reportedTime,
              date: displayTime.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
              time: displayTime.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }),
            };

            return transformed;
          });

          allSideEffects.push(...transformedSideEffects);
        } catch {
          // Continue with other dates even if one fails
        }
      }

      // Sort by most recent first
      allSideEffects.sort(
        (a, b) =>
          new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
      );

      setSideEffectsLogs(allSideEffects);
      setFilteredLogs(allSideEffects);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Show user-friendly error message
      Alert.alert(
        "Loading Error",
        `Failed to load side effects data: ${errorMessage}. Please try refreshing.`,
        [
          { text: "Retry", onPress: () => loadSideEffects() },
          { text: "Cancel" },
        ]
      );

      setSideEffectsLogs([]);
      setFilteredLogs([]);
    }
  }, []);

  // Real data loading based on analytics service
  const loadStats = useCallback(async () => {
    try {
      // Load analytics data for current period
      await loadAnalyticsData();
      
      // Load side effects data
      await loadSideEffects();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (Platform.OS === "android") {
        Alert.alert(
          "Database Error",
          `Failed to load statistics: ${errorMessage}. This may be due to Android SQLite issues. Please restart the app.`,
          [{ text: "OK" }]
        );
      }
      // Reset to default values on error
      setCurrentPeriodData({
        total: 0,
        taken: 0,
        skipped: 0,
        missed: 0,
        pending: 0,
        adherenceRate: 0,
      });
      setStreakData({
        currentStreak: 0,
        longestStreak: 0,
        streakDates: [],
      });
      setSideEffectsLogs([]);
      setFilteredLogs([]);
    }
  }, [loadAnalyticsData, loadSideEffects]);

  useEffect(() => {
    const initializeAndLoad = async () => {
      try {
        // Global database manager handles initialization automatically
        loadStats();
      } catch {
        loadStats(); // Still try to load with fallback values
      }
    };

    initializeAndLoad();
  }, [loadStats]);

  // Reload analytics data when period changes
  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod, loadAnalyticsData]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshAnalyticsData = async () => {
        try {
          // Global database manager handles initialization automatically

          // Load stats and side effects
          await Promise.all([loadStats(), loadSideEffects()]);
        } catch (error) {
          // Show user-friendly error for severe issues
          if (
            error instanceof Error &&
            (error.message.includes("Database initialization failed") ||
              error.message.includes("prepareAsync"))
          ) {
            Alert.alert(
              "Database Error",
              "Unable to load analytics data. Please restart the app if this persists.",
              [{ text: "OK" }]
            );
          }
        }
      };

      refreshAnalyticsData();
    }, [loadStats, loadSideEffects])
  );

  // Filter side effects based on search and filters
  useEffect(() => {
    let filtered = sideEffectsLogs;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (log) =>
          log.medicationName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          log.sideEffectType
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          log.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Severity filter
    if (selectedSeverity !== "all") {
      filtered = filtered.filter((log) => log.severity === selectedSeverity);
    }

    // Medication filter
    if (selectedMedication !== "all") {
      filtered = filtered.filter(
        (log) => log.medicationName === selectedMedication
      );
    }

    setFilteredLogs(filtered);
  }, [sideEffectsLogs, searchQuery, selectedSeverity, selectedMedication]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadStats();
    } finally {
      setRefreshing(false);
    }
  }, [loadStats]);

  // Use currentPeriodData for summary card
  const adherencePercentage = currentPeriodData.adherenceRate;
  const periodAdherencePercentage = currentPeriodData.adherenceRate;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "mild":
        return AppColors.success;
      case "moderate":
        return AppColors.warning;
      case "severe":
        return AppColors.error;
      default:
        return AppColors.textSecondary;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "mild":
        return "info-circle";
      case "moderate":
        return "exclamation-triangle";
      case "severe":
        return "exclamation-circle";
      default:
        return "circle";
    }
  };

  const getMedicationList = () => {
    const medications = [
      ...new Set(sideEffectsLogs.map((log) => log.medicationName)),
    ];
    return medications;
  };

  const getSideEffectStats = () => {
    const total = sideEffectsLogs.length;
    const mild = sideEffectsLogs.filter(
      (log) => log.severity === "mild"
    ).length;
    const moderate = sideEffectsLogs.filter(
      (log) => log.severity === "moderate"
    ).length;
    const severe = sideEffectsLogs.filter(
      (log) => log.severity === "severe"
    ).length;

    return { total, mild, moderate, severe };
  };

  // Delete side effect function
  const handleDeleteSideEffect = useCallback(async (sideEffectId: string) => {
    Alert.alert(
      "Delete Side Effect",
      "Are you sure you want to delete this side effect log? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await healthLogsService.deleteSideEffect(sideEffectId);
              // Reload side effects data
              await loadSideEffects();
            } catch {
              Alert.alert(
                "Error",
                "Failed to delete side effect. Please try again."
              );
            }
          },
        },
      ]
    );
  }, [loadSideEffects]);

  // ...CircularProgress component removed...

  const SideEffectCard = ({ log }: { log: SideEffectLog }) => (
    <Card style={styles.sideEffectCard}>
      <Card.Content style={styles.sideEffectCardContent}>
        <View style={styles.sideEffectHeader}>
          <View style={styles.sideEffectInfo}>
            <View style={styles.sideEffectTitle}>
              <FontAwesome name="medkit" size={16} color={AppColors.primary} />
              <ThemedText style={styles.medicationName}>
                {log.medicationName}
              </ThemedText>
            </View>
            <View style={styles.sideEffectMeta}>
              <ThemedText style={styles.sideEffectDate}>{log.date}</ThemedText>
              <ThemedText style={styles.sideEffectTime}>{log.time}</ThemedText>
            </View>
          </View>
          <View style={styles.sideEffectActions}>
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: getSeverityColor(log.severity) + "20" },
              ]}
            >
              <FontAwesome
                name={getSeverityIcon(log.severity) as any}
                size={12}
                color={getSeverityColor(log.severity)}
              />
              <ThemedText
                style={[
                  styles.severityText,
                  { color: getSeverityColor(log.severity) },
                ]}
              >
                {log.severity.charAt(0).toUpperCase() + log.severity.slice(1)}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteSideEffect(log.id)}
            >
              <FontAwesome
                name="trash"
                size={14}
                color={AppColors.error}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sideEffectDetails}>
          <View style={styles.sideEffectType}>
            <FontAwesome
              name="stethoscope"
              size={14}
              color={AppColors.secondary}
            />
            <ThemedText style={styles.sideEffectTypeText}>
              {log.sideEffectType}
            </ThemedText>
          </View>
          {log.description && (
            <ThemedText style={styles.sideEffectDescription}>
              {log.description}
            </ThemedText>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const periods = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
  ];

  const tabs = [
    { key: "overview", label: "Overview", icon: "bar-chart" },
    { key: "side-effects", label: "Side Effects", icon: "stethoscope" },
  ];

  const sideEffectStats = getSideEffectStats();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[AppColors.primary, AppColors.primaryLight]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Analytics</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Track your health insights
          </ThemedText>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <FontAwesome
                name={tab.icon as any}
                size={18}
                color={
                  activeTab === tab.key ? AppColors.primary : AppColors.white
                }
              />
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[AppColors.primary]}
          />
        }
      >
        {activeTab === "overview" && (
          <>
            {/* Period Filter */}
            <View style={styles.periodContainer}>
              {periods.map((period) => (
                <Chip
                  key={period.key}
                  selected={selectedPeriod === period.key}
                  onPress={() => setSelectedPeriod(period.key as any)}
                  style={[
                    styles.periodChip,
                    selectedPeriod === period.key && styles.selectedPeriodChip,
                  ]}
                  textStyle={[
                    styles.periodChipText,
                    selectedPeriod === period.key &&
                      styles.selectedPeriodChipText,
                  ]}
                >
                  {period.label}
                </Chip>
              ))}
            </View>

            {/* Medication Adherence Overview removed (duplicate) - only health metric card will be shown */}

            {/* Enhanced Health Metrics Cards - Interactive */}
            <View style={styles.healthMetricsContainer}>
              {/* Adherence Card (restored Card look) */}
              <TouchableOpacity
                style={styles.healthMetricCard}
                onPress={() => {
                  Alert.alert(
                    "Adherence Details",
                    [
                      `Adherence Rate: ${adherencePercentage}%`,
                      `Taken: ${currentPeriodData.taken} medications`,
                      `Total Due: ${currentPeriodData.total} medications`,
                      `Skipped: ${currentPeriodData.skipped} medications`,
                      `Pending: ${currentPeriodData.pending} medications`,
                      "",
                      adherencePercentage >= 90
                        ? "🎉 Excellent adherence!"
                        : adherencePercentage >= 70
                        ? "👍 Good adherence!"
                        : "💪 Keep improving!",
                    ].join("\n")
                  );
                }}
                activeOpacity={0.7}
              >
                <Card style={styles.interactiveCard}>
                  <Card.Content style={styles.healthMetricContent}>
                    <View style={styles.metricHeader}>
                      <View
                        style={[
                          styles.metricIcon,
                          { backgroundColor: AppColors.success + "15" },
                        ]}
                      >
                        <FontAwesome
                          name="heartbeat"
                          size={24}
                          color={AppColors.success}
                        />
                      </View>
                      <View style={styles.metricInfo}>
                        <ThemedText style={styles.metricValue}>
                          {adherencePercentage}%
                        </ThemedText>
                        <ThemedText style={styles.metricLabel}>
                          Adherence Rate
                        </ThemedText>
                      </View>
                      <View style={styles.interactiveIndicator}>
                        <FontAwesome
                          name="chevron-right"
                          size={14}
                          color={AppColors.textSecondary}
                        />
                      </View>
                    </View>
                    <View style={styles.metricProgress}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            styles.animatedProgress,
                            {
                              width: `${adherencePercentage}%`,
                              backgroundColor:
                                adherencePercentage >= 80
                                  ? AppColors.success
                                  : adherencePercentage >= 60
                                  ? AppColors.warning
                                  : AppColors.error,
                            },
                          ]}
                        />
                      </View>
                      <ThemedText style={styles.progressSubtext}>
                        {currentPeriodData.taken}/{currentPeriodData.total} completed
                      </ThemedText>
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>

              {/* Streak Card (restored Card look) */}
              <TouchableOpacity
                style={styles.healthMetricCard}
                onPress={() => {
                  const streakMessage =
                    streakData.currentStreak >= 7
                      ? "🔥 Amazing streak! Keep it up!"
                      : streakData.currentStreak >= 3
                      ? "⭐ Great progress!"
                      : "💪 Building momentum!";

                  Alert.alert(
                    "Streak Details",
                    `Current streak: ${streakData.currentStreak} days\n\n${streakMessage}\n\nConsistent medication adherence helps build healthy habits and improves treatment effectiveness.`
                  );
                }}
                activeOpacity={0.7}
              >
                <Card style={styles.interactiveCard}>
                  <Card.Content style={styles.healthMetricContent}>
                    <View style={styles.metricHeader}>
                      <View
                        style={[
                          styles.metricIcon,
                          { backgroundColor: AppColors.primary + "15" },
                        ]}
                      >
                        <FontAwesome
                          name="fire"
                          size={24}
                          color={AppColors.primary}
                        />
                      </View>
                      <View style={styles.metricInfo}>
                        <ThemedText style={styles.metricValue}>
                          {streakData.currentStreak}
                        </ThemedText>
                        <ThemedText style={styles.metricLabel}>
                          Day Streak
                        </ThemedText>
                      </View>
                      <View style={styles.interactiveIndicator}>
                        <FontAwesome
                          name="chevron-right"
                          size={14}
                          color={AppColors.textSecondary}
                        />
                      </View>
                    </View>
                    <View style={styles.metricProgress}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            styles.animatedProgress,
                            {
                              width: `${Math.min(
                                (streakData.currentStreak / 30) * 100,
                                100
                              )}%`,
                              backgroundColor:
                                streakData.currentStreak >= 7
                                  ? AppColors.primary
                                  : streakData.currentStreak >= 3
                                  ? AppColors.warning
                                  : AppColors.textSecondary,
                            },
                          ]}
                        />
                      </View>
                      <ThemedText style={styles.progressSubtext}>
                        {streakData.currentStreak >= 30
                          ? "Master level!"
                          : `${30 - streakData.currentStreak} days to milestone`}
                      </ThemedText>
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            </View>

            {/* Period Summary Card (Today/Week/Month) */}
            <Card style={styles.summaryCard}>
              <Card.Content style={styles.summaryContent}>
                <View style={styles.summaryHeader}>
                  <FontAwesome
                    name="clock-o"
                    size={20}
                    color={AppColors.primary}
                  />
                  <ThemedText style={styles.summaryTitle}>
                    {selectedPeriod === "today"
                      ? "Today's Summary"
                      : selectedPeriod === "week"
                      ? "This Week's Summary"
                      : "This Month's Summary"}
                  </ThemedText>
                </View>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <View
                      style={[
                        styles.summaryIcon,
                        { backgroundColor: AppColors.success + "15" },
                      ]}
                    >
                      <FontAwesome
                        name="check"
                        size={16}
                        color={AppColors.success}
                      />
                    </View>
                    <ThemedText style={styles.summaryValue}>
                      {currentPeriodData.taken}
                    </ThemedText>
                    <ThemedText style={styles.summaryLabel}>Taken</ThemedText>
                  </View>
                  <View style={styles.summaryItem}>
                    <View
                      style={[
                        styles.summaryIcon,
                        { backgroundColor: AppColors.pending + "15" },
                      ]}
                    >
                      <FontAwesome
                        name="clock-o"
                        size={16}
                        color={AppColors.pending}
                      />
                    </View>
                    <ThemedText style={styles.summaryValue}>
                      {currentPeriodData.pending}
                    </ThemedText>
                    <ThemedText style={styles.summaryLabel}>Pending</ThemedText>
                  </View>
                  <View style={styles.summaryItem}>
                    <View
                      style={[
                        styles.summaryIcon,
                        { backgroundColor: AppColors.warning + "15" },
                      ]}
                    >
                      <FontAwesome
                        name="times"
                        size={16}
                        color={AppColors.warning}
                      />
                    </View>
                    <ThemedText style={styles.summaryValue}>
                      {currentPeriodData.skipped}
                    </ThemedText>
                    <ThemedText style={styles.summaryLabel}>Skipped</ThemedText>
                  </View>
                  <View style={styles.summaryItem}>
                    <View
                      style={[
                        styles.summaryIcon,
                        { backgroundColor: AppColors.error + "15" },
                      ]}
                    >
                      <FontAwesome
                        name="minus-circle"
                        size={16}
                        color={AppColors.error}
                      />
                    </View>
                    <ThemedText style={styles.summaryValue}>
                      {currentPeriodData.missed}
                    </ThemedText>
                    <ThemedText style={styles.summaryLabel}>Missed</ThemedText>
                  </View>
                  <View style={styles.summaryItem}>
                    <View
                      style={[
                        styles.summaryIcon,
                        { backgroundColor: AppColors.secondary + "15" },
                      ]}
                    >
                      <FontAwesome
                        name="exclamation-triangle"
                        size={16}
                        color={AppColors.secondary}
                      />
                    </View>
                    <ThemedText style={styles.summaryValue}>
                      {sideEffectStats.total}
                    </ThemedText>
                    <ThemedText style={styles.summaryLabel}>
                      Side Effects
                    </ThemedText>
                  </View>
                </View>
                {/* Period adherence rate */}
                <View style={{ alignItems: "center", marginTop: 10 }}>
                  <ThemedText
                    style={{ fontSize: 13, color: AppColors.textSecondary }}
                  >
                    Adherence Rate: {periodAdherencePercentage}%
                  </ThemedText>
                </View>
              </Card.Content>
            </Card>

            {/* Insights */}
            <Card style={styles.insightsCard}>
              <Card.Content style={styles.insightsContent}>
                <ThemedText style={styles.insightsTitle}>
                  Health Insights
                </ThemedText>

                {adherencePercentage >= 90 && (
                  <View style={styles.insightItem}>
                    <FontAwesome
                      name="trophy"
                      size={20}
                      color={AppColors.success}
                    />
                    <ThemedText style={styles.insightText}>
                      Excellent adherence! Keep up the great work.
                    </ThemedText>
                  </View>
                )}

                {adherencePercentage < 70 && currentPeriodData.total > 0 && (
                  <View style={styles.insightItem}>
                    <FontAwesome
                      name="exclamation-triangle"
                      size={20}
                      color={AppColors.warning}
                    />
                    <ThemedText style={styles.insightText}>
                      Consider setting more reminders to improve adherence.
                    </ThemedText>
                  </View>
                )}

                {sideEffectStats.severe > 0 && (
                  <View style={styles.insightItem}>
                    <FontAwesome
                      name="exclamation-circle"
                      size={20}
                      color={AppColors.error}
                    />
                    <ThemedText style={styles.insightText}>
                      You have {sideEffectStats.severe} severe side effect(s).
                      Consider consulting your doctor.
                    </ThemedText>
                  </View>
                )}

                {currentPeriodData.total === 0 && (
                  <View style={styles.insightItem}>
                    <FontAwesome
                      name="plus-circle"
                      size={20}
                      color={AppColors.primary}
                    />
                    <ThemedText style={styles.insightText}>
                      Add your medications to start tracking your adherence.
                    </ThemedText>
                  </View>
                )}
              </Card.Content>
            </Card>
          </>
        )}

        {activeTab === "side-effects" && (
          <>
            {/* Search and Filter Section */}
            <Card style={styles.searchCard}>
              <Card.Content style={styles.searchContent}>
                <View style={styles.searchInputContainer}>
                  <FontAwesome
                    name="search"
                    size={16}
                    color={AppColors.textSecondary}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search side effects..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={AppColors.textSecondary}
                  />
                  <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setShowFilters(!showFilters)}
                  >
                    <FontAwesome
                      name="filter"
                      size={16}
                      color={
                        showFilters
                          ? AppColors.primary
                          : AppColors.textSecondary
                      }
                    />
                  </TouchableOpacity>
                </View>

                {showFilters && (
                  <View style={styles.filtersContainer}>
                    {/* Severity Filter */}
                    <View style={styles.filterGroup}>
                      <ThemedText style={styles.filterLabel}>
                        Severity:
                      </ThemedText>
                      <View style={styles.filterChips}>
                        {["all", "mild", "moderate", "severe"].map(
                          (severity) => (
                            <TouchableOpacity
                              key={severity}
                              style={[
                                styles.filterChip,
                                selectedSeverity === severity &&
                                  styles.selectedFilterChip,
                              ]}
                              onPress={() => setSelectedSeverity(severity)}
                            >
                              <ThemedText
                                style={[
                                  styles.filterChipText,
                                  selectedSeverity === severity &&
                                    styles.selectedFilterChipText,
                                ]}
                              >
                                {severity.charAt(0).toUpperCase() +
                                  severity.slice(1)}
                              </ThemedText>
                            </TouchableOpacity>
                          )
                        )}
                      </View>
                    </View>

                    {/* Medication Filter */}
                    <View style={styles.filterGroup}>
                      <ThemedText style={styles.filterLabel}>
                        Medication:
                      </ThemedText>
                      <View style={styles.filterChips}>
                        <TouchableOpacity
                          style={[
                            styles.filterChip,
                            selectedMedication === "all" &&
                              styles.selectedFilterChip,
                          ]}
                          onPress={() => setSelectedMedication("all")}
                        >
                          <ThemedText
                            style={[
                              styles.filterChipText,
                              selectedMedication === "all" &&
                                styles.selectedFilterChipText,
                            ]}
                          >
                            All
                          </ThemedText>
                        </TouchableOpacity>
                        {getMedicationList().map((medication) => (
                          <TouchableOpacity
                            key={medication}
                            style={[
                              styles.filterChip,
                              selectedMedication === medication &&
                                styles.selectedFilterChip,
                            ]}
                            onPress={() => setSelectedMedication(medication)}
                          >
                            <ThemedText
                              style={[
                                styles.filterChipText,
                                selectedMedication === medication &&
                                  styles.selectedFilterChipText,
                              ]}
                            >
                              {medication}
                            </ThemedText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </Card.Content>
            </Card>

            {/* Side Effects Stats */}
            <View style={styles.sideEffectStatsGrid}>
              <View style={styles.sideEffectStatCard}>
                <FontAwesome name="list" size={20} color={AppColors.primary} />
                <ThemedText style={styles.sideEffectStatValue}>
                  {sideEffectStats.total}
                </ThemedText>
                <ThemedText style={styles.sideEffectStatLabel}>
                  Total Logs
                </ThemedText>
              </View>
              <View style={styles.sideEffectStatCard}>
                <FontAwesome
                  name="info-circle"
                  size={20}
                  color={AppColors.success}
                />
                <ThemedText style={styles.sideEffectStatValue}>
                  {sideEffectStats.mild}
                </ThemedText>
                <ThemedText style={styles.sideEffectStatLabel}>Mild</ThemedText>
              </View>
              <View style={styles.sideEffectStatCard}>
                <FontAwesome
                  name="exclamation-triangle"
                  size={20}
                  color={AppColors.warning}
                />
                <ThemedText style={styles.sideEffectStatValue}>
                  {sideEffectStats.moderate}
                </ThemedText>
                <ThemedText style={styles.sideEffectStatLabel}>
                  Moderate
                </ThemedText>
              </View>
              <View style={styles.sideEffectStatCard}>
                <FontAwesome
                  name="exclamation-circle"
                  size={20}
                  color={AppColors.error}
                />
                <ThemedText style={styles.sideEffectStatValue}>
                  {sideEffectStats.severe}
                </ThemedText>
                <ThemedText style={styles.sideEffectStatLabel}>
                  Severe
                </ThemedText>
              </View>
            </View>

            {/* Results Header */}
            <View style={styles.resultsHeader}>
              <ThemedText style={styles.resultsTitle}>
                Side Effects Log ({filteredLogs.length})
              </ThemedText>
              {filteredLogs.length !== sideEffectsLogs.length && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    setSelectedSeverity("all");
                    setSelectedMedication("all");
                  }}
                >
                  <ThemedText style={styles.clearFiltersText}>
                    Clear Filters
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>

            {/* Side Effects List */}
            {filteredLogs.length > 0 ? (
              <View style={styles.sideEffectsList}>
                {filteredLogs.map((log) => (
                  <SideEffectCard key={log.id} log={log} />
                ))}
              </View>
            ) : (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyContent}>
                  <FontAwesome
                    name="search"
                    size={48}
                    color={AppColors.textSecondary}
                  />
                  <ThemedText style={styles.emptyTitle}>
                    No side effects found
                  </ThemedText>
                  <ThemedText style={styles.emptySubtitle}>
                    {searchQuery ||
                    selectedSeverity !== "all" ||
                    selectedMedication !== "all"
                      ? "Try adjusting your search or filters"
                      : "No side effects have been logged yet"}
                  </ThemedText>
                </Card.Content>
              </Card>
            )}
          </>
        )}

        {/* Bottom spacing for tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  safeArea: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: AppColors.white,
    marginBottom: 5,
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
  },
  // Tab Navigation Styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 25,
    padding: 4,
    marginTop: 20,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  activeTab: {
    backgroundColor: AppColors.white,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.white,
  },
  activeTabText: {
    color: AppColors.primary,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  periodContainer: {
    flexDirection: "row",
    marginTop: 20,
    marginBottom: 20,
    gap: 10,
  },
  periodChip: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  selectedPeriodChip: {
    backgroundColor: AppColors.white,
  },
  periodChipText: {
    color: AppColors.textSecondary,
  },
  selectedPeriodChipText: {
    color: AppColors.primary,
    fontWeight: "bold",
  },
  overviewCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 4,
  },
  overviewContent: {
    padding: 20,
  },
  overviewTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    marginBottom: 20,
  },
  overviewRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  circularProgressContainer: {
    marginRight: 30,
  },
  circularProgress: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  circularProgressBg: {
    position: "absolute",
  },
  circularProgressFill: {
    position: "absolute",
  },
  circularProgressContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  circularProgressText: {
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.textPrimary,
  },
  circularProgressLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  overviewStats: {
    flex: 1,
  },
  overviewStatItem: {
    marginBottom: 15,
  },
  overviewStatValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.textPrimary,
  },
  overviewStatLabel: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    borderRadius: 16,
    elevation: 3,
  },
  statCardContent: {
    padding: 16,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.textPrimary,
  },
  statTitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: AppColors.gray200,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontWeight: "600",
  },
  insightsCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 3,
  },
  insightsContent: {
    padding: 20,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    marginBottom: 15,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  insightText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  // Search and Filter Styles
  searchCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: AppColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  searchContent: {
    padding: 20,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.gray50,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 14,
    borderWidth: 1.5,
    borderColor: AppColors.gray200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: AppColors.textPrimary,
    paddingVertical: 0,
    fontWeight: "500",
  },
  filterButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: AppColors.gray100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  filtersContainer: {
    marginTop: 16,
    gap: 16,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  filterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: AppColors.gray100,
  },
  selectedFilterChip: {
    backgroundColor: AppColors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontWeight: "500",
  },
  selectedFilterChipText: {
    color: AppColors.white,
  },
  // Side Effects Stats
  sideEffectStatsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  sideEffectStatCard: {
    flex: 1,
    backgroundColor: AppColors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
    elevation: 2,
  },
  sideEffectStatValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppColors.textPrimary,
  },
  sideEffectStatLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    textAlign: "center",
  },
  // Results and List
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.textPrimary,
  },
  clearFiltersText: {
    fontSize: 14,
    color: AppColors.primary,
    fontWeight: "600",
  },
  sideEffectsList: {
    gap: 12,
    marginBottom: 20,
  },
  // Side Effect Card Styles
  sideEffectCard: {
    borderRadius: 12,
    elevation: 2,
  },
  sideEffectCardContent: {
    padding: 16,
  },
  sideEffectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  sideEffectInfo: {
    flex: 1,
    marginRight: 12,
  },
  sideEffectActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sideEffectTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  sideEffectMeta: {
    flexDirection: "row",
    gap: 8,
  },
  sideEffectDate: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  sideEffectTime: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  severityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  severityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: AppColors.error + "10",
  },
  sideEffectDetails: {
    gap: 8,
  },
  sideEffectType: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sideEffectTypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  sideEffectDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  // Empty State
  emptyCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 2,
  },
  emptyContent: {
    padding: 40,
    alignItems: "center",
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.textPrimary,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  exportCard: {
    marginBottom: 100,
    borderRadius: 16,
    elevation: 3,
  },
  exportContent: {
    padding: 20,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    marginBottom: 5,
  },
  exportSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 20,
  },
  exportButtons: {
    flexDirection: "row",
    gap: 15,
  },
  exportButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${AppColors.primary}15`,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 8,
  },
  exportButtonText: {
    color: AppColors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  bottomSpacer: {
    height: 110, // Space for floating tab bar
  },

  // Chart specific styles
  chartCard: {
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderRadius: 12,
  },

  chartContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },

  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textPrimary,
    flex: 1,
  },

  chartStyle: {
    borderRadius: 8,
    marginVertical: 4,
  },

  chartDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },

  progressRingContainer: {
    alignItems: "center",
    marginVertical: 16,
  },

  progressRingLabels: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 16,
    paddingHorizontal: 20,
  },

  progressRingLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  legendText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },

  chartPercentage: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.success,
  },

  // New Beautiful Overview Styles
  healthMetricsContainer: {
    flexDirection: "column",
    gap: 12,
    marginBottom: 20,
  },
  healthMetricCard: {
    flex: 1,
    borderRadius: 16,
    elevation: 3,
    shadowColor: AppColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  healthMetricContent: {
    padding: 16,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  metricInfo: {
    flex: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 13,
    color: AppColors.textSecondary,
    fontWeight: "500",
  },
  metricProgress: {
    marginTop: 8,
  },
  summaryCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: AppColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  summaryContent: {
    padding: 20,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.textPrimary,
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    textAlign: "center",
    fontWeight: "500",
  },
  // Interactive styles for enhanced adherence cards
  interactiveCard: {
    borderRadius: 16,
    elevation: 4,
    shadowColor: AppColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    backgroundColor: AppColors.white,
    transform: [{ scale: 1 }],
  },
  interactiveIndicator: {
    marginLeft: "auto",
    justifyContent: "center",
    alignItems: "center",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AppColors.gray100,
  },
  animatedProgress: {
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  progressSubtext: {
    fontSize: 11,
    color: AppColors.textSecondary,
    marginTop: 4,
    fontWeight: "500",
  },
});
