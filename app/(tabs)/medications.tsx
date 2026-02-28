import { ThemedText } from "@/components/ThemedText";
import { AppColors } from "@/constants/AppColors";
import {
  simpleMedicationService,
  type Medication,
} from "@/services/simpleMedicationService";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Card } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MedicationsScreen() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(
    null
  );
  const [editForm, setEditForm] = useState<{
    name: string;
    dosage: string;
    strength: string;
    form: "tablet" | "capsule" | "liquid" | "injection" | "cream" | "inhaler";
    color: string;
    shape: string;
    manufacturer: string;
    prescribedBy: string;
    startDate: string;
    endDate: string;
    instructions: string;
    sideEffects: string;
    isActive: boolean;
    time: string;
    frequency: "daily" | "weekly" | "as_needed";
    daysOfWeek?: string[];
    withFood: boolean;
  }>({
    name: "",
    dosage: "",
    strength: "",
    form: "tablet",
    color: "",
    shape: "",
    manufacturer: "",
    prescribedBy: "",
    startDate: "",
    endDate: "",
    instructions: "",
    sideEffects: "",
    isActive: true,
    time: "",
    frequency: "daily",
    daysOfWeek: [],
    withFood: false,
  });

  const loadMedications = useCallback(async () => {
    try {
      const meds = await simpleMedicationService.getMedications();
      setMedications(meds);
    } catch (error) {
      console.error("Failed to load medications:", error);
      Alert.alert("Error", "Failed to load medications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMedications();
  }, [loadMedications]);

  // Refresh medications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshMedicationsData = async () => {
        try {
          // Global database manager ensures databases are ready automatically
          await loadMedications();
        } catch (error) {
          console.error("❌ Failed to load medications data:", error);

          // Show user-friendly error for database issues
          if (
            error instanceof Error &&
            error.message.includes("Database initialization failed")
          ) {
            Alert.alert(
              "Database Error",
              "Unable to load medications. Please restart the app if this persists.",
              [{ text: "OK" }]
            );
          }
        }
      };

      refreshMedicationsData();
    }, [loadMedications])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMedications();
  }, [loadMedications]);

  const openEditModal = async (medication: Medication) => {
    if (!medication.id) {
      Alert.alert("Error", "Cannot edit medication: ID not found");
      return;
    }

    try {
      // Get schedule data for this medication
      const schedules = await simpleMedicationService.getMedicationSchedules(
        medication.id
      );
      const schedule = schedules.length > 0 ? schedules[0] : null;

      setEditingMedication(medication);
      setEditForm({
        name: medication.name,
        dosage: medication.dosage,
        strength: medication.strength,
        form: medication.form,
        color: medication.color || "",
        shape: medication.shape || "",
        manufacturer: medication.manufacturer || "",
        prescribedBy: medication.prescribedBy || "",
        startDate: medication.startDate,
        endDate: medication.endDate || "",
        instructions: medication.instructions,
        sideEffects: medication.sideEffects || "",
        isActive: medication.isActive,
        time: schedule?.timeSlot || "",
        frequency: schedule?.frequency || "daily",
        daysOfWeek: schedule?.daysOfWeek ? JSON.parse(schedule.daysOfWeek) : [],
        withFood: false, // This field doesn't exist in schedule, we may need to add it later
      });
      setEditModalVisible(true);
    } catch (error) {
      console.error("Error loading medication schedule:", error);
      Alert.alert("Error", "Failed to load medication schedule data");
    }
  };

  const saveEdit = async () => {
    if (!editingMedication?.id) return;

    try {
      // Update medication basic info
      await simpleMedicationService.updateMedication(editingMedication.id, {
        name: editForm.name,
        dosage: editForm.dosage,
        strength: editForm.strength,
        form: editForm.form,
        color: editForm.color,
        shape: editForm.shape,
        manufacturer: editForm.manufacturer,
        prescribedBy: editForm.prescribedBy,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        instructions: editForm.instructions,
        sideEffects: editForm.sideEffects,
        isActive: editForm.isActive,
      });

      // Update or create schedule
      const schedules = await simpleMedicationService.getMedicationSchedules(
        editingMedication.id
      );
      if (schedules.length > 0) {
        // Update existing schedule
        await simpleMedicationService.updateMedicationSchedule(
          schedules[0].id!,
          {
            timeSlot: editForm.time,
            frequency: editForm.frequency,
            daysOfWeek: JSON.stringify(editForm.daysOfWeek),
            isActive: editForm.isActive,
            reminderEnabled: true,
          }
        );
      } else {
        // Create new schedule
        await simpleMedicationService.saveMedicationSchedule({
          medicationId: editingMedication.id,
          timeSlot: editForm.time,
          frequency: editForm.frequency,
          daysOfWeek: JSON.stringify(editForm.daysOfWeek),
          isActive: editForm.isActive,
          reminderEnabled: true,
        });
      }

      // Notification service has been removed

      // Refresh medications list
      await loadMedications();
      setEditModalVisible(false);
      setEditingMedication(null);
      Alert.alert("Success", "Medication updated successfully");
    } catch (error) {
      console.error("Error updating medication:", error);
      Alert.alert("Error", "Failed to update medication");
    }
  };

  const deleteMedication = async (id: number) => {
    Alert.alert(
      "Delete Medication",
      "Are you sure you want to delete this medication? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Notification service has been removed

              await simpleMedicationService.deleteMedication(id);
              await loadMedications();
              Alert.alert("Success", "Medication deleted successfully");
            } catch (error) {
              console.error("Error deleting medication:", error);

              // Provide user-friendly error messages for database issues
              let errorMessage = "Failed to delete medication";
              if (error instanceof Error) {
                if (
                  error.message.includes("database conflicts") ||
                  error.message.includes("database is locked")
                ) {
                  errorMessage =
                    "Database is busy. Please wait a moment and try again.";
                } else if (
                  error.message.includes("finalizeAsync") ||
                  error.message.includes("NativeStatement")
                ) {
                  errorMessage =
                    "Database connection issue. Please restart the app and try again.";
                } else {
                  errorMessage = `Delete failed: ${error.message}`;
                }
              }

              Alert.alert("Error", errorMessage);
            }
          },
        },
      ]
    );
  };

  const filteredMedications = medications.filter((med) => {
    const matchesSearch =
      med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.dosage.toLowerCase().includes(searchQuery.toLowerCase());

    // For now, show all medications regardless of filter since we don't have timeOfDay
    return matchesSearch;
  });

  // Since new medication structure doesn't have timeOfDay, we'll just show all medications in a simple list

  const filterOptions = [
    { key: "all", label: "All Medications", icon: "list" },
  ];

  const renderMedicationCard = (medication: Medication) => (
    <View key={medication.id} style={styles.medicationCard}>
      <View style={styles.medicationCardContent}>
        <View style={styles.medicationInfo}>
          <View
            style={[
              styles.medicationStatus,
              { backgroundColor: AppColors.primary },
            ]}
          >
            <FontAwesome name="medkit" size={12} color={AppColors.white} />
          </View>
          <View style={styles.medicationDetails}>
            <ThemedText style={styles.medicationName}>
              {medication.name}
            </ThemedText>
            <ThemedText style={styles.medicationDosage}>
              {medication.dosage}
            </ThemedText>
            <ThemedText style={styles.medicationTime}>
              {medication.strength} • {medication.form}
            </ThemedText>
          </View>
        </View>

        <View style={styles.medicationActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditModal(medication)}
          >
            <FontAwesome name="edit" size={14} color={AppColors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteMedication(medication.id!)}
          >
            <FontAwesome name="trash" size={14} color={AppColors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
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
            <FontAwesome name="medkit" size={48} color={AppColors.white} />
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
      {/* Header Section */}
      <LinearGradient
        colors={[AppColors.primary, AppColors.primaryLight]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <ThemedText style={styles.headerTitle}>My Medications</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {medications.length} medication
              {medications.length !== 1 ? "s" : ""} registered
            </ThemedText>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.mainContent}>
        {/* Search Bar */}
        <Card style={styles.searchCard}>
          <View style={styles.searchInputContainer}>
            <FontAwesome
              name="search"
              size={16}
              color={AppColors.textSecondary}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search medications..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={AppColors.textSecondary}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <FontAwesome
                  name="times"
                  size={16}
                  color={AppColors.textSecondary}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterButton,
                  selectedFilter === option.key && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedFilter(option.key)}
              >
                <FontAwesome
                  name={option.icon as any}
                  size={14}
                  color={
                    selectedFilter === option.key
                      ? AppColors.white
                      : AppColors.textSecondary
                  }
                />
                <ThemedText
                  style={[
                    styles.filterText,
                    selectedFilter === option.key && styles.filterTextActive,
                  ]}
                >
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Medications List */}
        <View style={styles.listWrapper}>
          <FlatList
            data={filteredMedications}
            renderItem={({ item }) => renderMedicationCard(item)}
            keyExtractor={(item) => item.id?.toString() || ""}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[AppColors.primary]}
              />
            }
            ListEmptyComponent={
              <Card style={styles.emptyCard}>
                <View style={styles.emptyContainer}>
                  <FontAwesome
                    name="medkit"
                    size={64}
                    color={AppColors.textLight}
                  />
                  <ThemedText style={styles.emptyTitle}>
                    No medications found
                  </ThemedText>
                  <ThemedText style={styles.emptySubtitle}>
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Add your first medication to get started"}
                  </ThemedText>
                </View>
              </Card>
            }
            contentContainerStyle={styles.listContainer}
          />
        </View>
      </View>

      {/* Floating Add Medication Button - Right Side */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/add-medication")}
      >
        <FontAwesome name="plus" size={24} color={AppColors.white} />
      </TouchableOpacity>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Edit Medication</ThemedText>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setEditModalVisible(false)}
              >
                <FontAwesome
                  name="times"
                  size={20}
                  color={AppColors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>
                  Medication Name
                </ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={editForm.name}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, name: text })
                  }
                  placeholder="Enter medication name"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Dosage</ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={editForm.dosage}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, dosage: text })
                  }
                  placeholder="e.g., 50mg, 2 tablets"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Time</ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={editForm.time}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, time: text })
                  }
                  placeholder="e.g., 08:00 AM"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Frequency</ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={editForm.frequency}
                  onChangeText={(text) =>
                    setEditForm({
                      ...editForm,
                      frequency: text as "daily" | "weekly" | "as_needed",
                    })
                  }
                  placeholder="e.g., daily, weekly"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Instructions</ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={editForm.instructions}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, instructions: text })
                  }
                  placeholder="Special instructions"
                  multiline
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>
                  End Date (Optional)
                </ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={editForm.endDate}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, endDate: text })
                  }
                  placeholder="YYYY-MM-DD (optional)"
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.rowContainer}>
                  <ThemedText style={styles.inputLabel}>
                    Take with food
                  </ThemedText>
                  <Switch
                    value={editForm.withFood}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, withFood: value })
                    }
                    trackColor={{
                      false: AppColors.gray200,
                      true: AppColors.primary,
                    }}
                    thumbColor={
                      editForm.withFood
                        ? AppColors.white
                        : AppColors.textSecondary
                    }
                  />
                </View>
              </View>

              {editForm.frequency === "weekly" && (
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>
                    Days of Week
                  </ThemedText>
                  <View style={styles.daysContainer}>
                    {[
                      "monday",
                      "tuesday",
                      "wednesday",
                      "thursday",
                      "friday",
                      "saturday",
                      "sunday",
                    ].map((day) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayButton,
                          editForm.daysOfWeek?.includes(day) &&
                            styles.dayButtonSelected,
                        ]}
                        onPress={() => {
                          const currentDays = editForm.daysOfWeek || [];
                          const updatedDays = currentDays.includes(day)
                            ? currentDays.filter((d) => d !== day)
                            : [...currentDays, day];
                          setEditForm({ ...editForm, daysOfWeek: updatedDays });
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.dayButtonText,
                            editForm.daysOfWeek?.includes(day) &&
                              styles.dayButtonTextSelected,
                          ]}
                        >
                          {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveEdit}>
                <ThemedText style={styles.saveButtonText}>
                  Save Changes
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
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 0,
  },
  headerContent: {
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.white,
  },
  headerSubtitle: {
    fontSize: 16,
    color: AppColors.white,
    opacity: 0.9,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -10,
    paddingBottom: 20, // Reduced padding since we'll move add button above tab bar
  },
  listWrapper: {
    flex: 1, // Take remaining space
  },
  searchCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: AppColors.white,
    elevation: 6,
    shadowColor: AppColors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  searchContainer: {
    marginBottom: 12, // Reduced margin
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.gray50,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 16,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: AppColors.gray100,
    gap: 8,
    minWidth: 90,
  },
  filterButtonActive: {
    backgroundColor: AppColors.primary,
  },
  filterText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontWeight: "500",
  },
  filterTextActive: {
    color: AppColors.white,
  },
  statsCard: {
    marginBottom: 16, // Reduced margin
    borderRadius: 16,
    backgroundColor: AppColors.white,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    padding: 16,
  },
  listContainer: {
    paddingBottom: 20, // Reduced padding since we added space to mainContent
  },
  timeSection: {
    marginBottom: 16, // Reduced margin
  },
  timeSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8, // Reduced margin
    gap: 10,
  },
  timeSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.textPrimary,
    flex: 1,
  },
  timeSectionCount: {
    fontSize: 14,
    color: AppColors.textSecondary,
    backgroundColor: AppColors.gray100,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "600",
  },
  medicationCard: {
    backgroundColor: AppColors.white,
    borderRadius: 12,
    marginBottom: 6,
    elevation: 3,
    shadowColor: AppColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  medicationCardContent: {
    padding: 14, // Reduced padding
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
    width: 32,
    height: 32,
    borderRadius: 16,
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
  editButton: {
    backgroundColor: AppColors.touchFeedback,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCard: {
    borderRadius: 16,
    backgroundColor: AppColors.white,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    padding: 40,
  },
  emptyContainer: {
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: AppColors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  addButton: {
    position: "absolute",
    bottom: 100, // Position above the floating tab bar
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: AppColors.primary,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "80%",
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
    gap: 20,
    marginBottom: 32,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  textInput: {
    borderWidth: 1,
    borderColor: AppColors.gray200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: AppColors.textPrimary,
    backgroundColor: AppColors.white,
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
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.gray300,
    backgroundColor: AppColors.white,
  },
  dayButtonSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  dayButtonText: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontWeight: "500",
  },
  dayButtonTextSelected: {
    color: AppColors.white,
  },
});
