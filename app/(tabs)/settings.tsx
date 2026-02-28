import { DeleteAccountModal } from "@/components/modals/DeleteAccountModal";
import EmergencyContactModal from "@/components/modals/EmergencyContactModal";
import ExportDataModal, {
  ExportOptions,
} from "@/components/modals/ExportDataModal";
import HealthcareProviderModal from "@/components/modals/HealthcareProviderModal";
import MedicalInformationModal from "@/components/modals/MedicalInformationModal";
import PersonalInformationModal from "@/components/modals/PersonalInformationModal";
import { ThemedText } from "@/components/ThemedText";
import { AppColors } from "@/constants/AppColors";
import { signOut } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import { Card, Divider } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

interface SettingsItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  type: "navigation" | "toggle" | "info";
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

export default function SettingsScreen() {

  


  // UI states
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const [healthcareModalVisible, setHealthcareModalVisible] = useState(false);
  const [personalModalVisible, setPersonalModalVisible] = useState(false);
  const [medicalModalVisible, setMedicalModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);

  // User profile state
  const [userEmail, setUserEmail] = useState<string>("");
  const [profileError, setProfileError] = useState<string>("");

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { getCurrentUserId, getUserProfile } = await import("@/services/supabase");
        const userId = await getCurrentUserId();
        if (userId) {
          const result = await getUserProfile(userId);
          if (result.profile && result.profile.email) {
            setUserEmail(result.profile.email);
          } else {
            // Attach email to error field if available
            setProfileError(result.error ? `${result.error} (email: ${result.profile?.email || "unknown"})` : "Profile not found");
          }
        } else {
          setProfileError("User ID not found");
        }
      } catch (err) {
        setProfileError("Failed to fetch user profile");
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/welcome");
          } catch (error) {
            console.error("Error during logout:", error);
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };

  const handleAccountDeleted = () => {
    // Navigate back to welcome screen after account deletion
    router.replace("/welcome");
  };

  const profileSettings: SettingsItem[] = [
    {
      id: "profile",
      title: "Personal Information",
      subtitle: "Update your basic profile details",
      icon: "person-outline",
      type: "navigation",
      onPress: () => setPersonalModalVisible(true),
    },
    {
      id: "medical-profile",
      title: "Medical Information",
      subtitle: "Blood type, allergies, medical conditions",
      icon: "medical-outline",
      type: "navigation",
      onPress: () => setMedicalModalVisible(true),
    },
    {
      id: "emergency-contacts",
      title: "Emergency Contacts",
      subtitle: "Emergency contact information",
      icon: "call-outline",
      type: "navigation",
      onPress: () => setEmergencyModalVisible(true),
    },
    {
      id: "healthcare-providers",
      title: "Healthcare Providers",
      subtitle: "Doctor and clinic information",
      icon: "medical-outline",
      type: "navigation",
      onPress: () => setHealthcareModalVisible(true),
    },
  ];

  const appSettings: SettingsItem[] = [
    // Temporarily disabled dark mode
    // {
    //   id: "theme",
    //   title: "Dark Mode",
    //   subtitle: "Switch to dark theme",
    //   icon: "moon-outline",
    //   type: "toggle",
    //   value: isDarkMode,
    //   onToggle: () => toggleColorScheme(),
    // },
    {
      id: "export",
      title: "Export Data",
      subtitle: "Download your medication data",
      icon: "download-outline",
      type: "navigation",
      onPress: () => setExportModalVisible(true),
    },
    {
      id: "backup",
      title: "Backup & Sync",
      subtitle: "Cloud backup settings",
      icon: "cloud-outline",
      type: "navigation",
      onPress: () =>
        Alert.alert("Backup & Sync", "Backup settings will be implemented"),
    },
  ];

  const supportSettings: SettingsItem[] = [
    {
      id: "help",
      title: "Help & Support",
      subtitle: "FAQs and contact support",
      icon: "help-circle-outline",
      type: "navigation",
      onPress: () => setHelpModalVisible(true),
    },
    {
      id: "about",
      title: "About",
      subtitle: "Version 1.0.0",
      icon: "information-circle-outline",
      type: "info",
    },
  ];

  const renderSettingsItem = (item: SettingsItem) => {
    const isLogout = item.id === "logout";

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.settingsItem}
        onPress={item.onPress}
        disabled={item.type === "toggle" || item.type === "info"}
        activeOpacity={0.7}
      >
        <View style={styles.settingsItemLeft}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={item.icon as any}
              size={22}
              color={isLogout ? AppColors.error : AppColors.primary}
            />
          </View>
          <View style={styles.textContainer}>
            <ThemedText style={styles.settingsTitle}>{item.title}</ThemedText>
            {item.subtitle && (
              <ThemedText style={styles.settingsSubtitle}>
                {item.subtitle}
              </ThemedText>
            )}
          </View>
        </View>

        <View style={styles.settingsItemRight}>
          {item.type === "toggle" && (
            <Switch
              value={item.value}
              onValueChange={item.onToggle}
              trackColor={{
                false: "#767577",
                true: AppColors.primaryLight,
              }}
              thumbColor={item.value ? AppColors.primary : "#f4f3f4"}
            />
          )}
          {item.type === "navigation" && (
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isLogout ? AppColors.error : AppColors.textSecondary}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (title: string, items: SettingsItem[]) => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <Card style={styles.sectionCard}>
        <Card.Content style={styles.sectionContent}>
          {items.map((item, index) => (
            <View key={item.id}>
              {renderSettingsItem(item)}
              {index < items.length - 1 && <Divider style={styles.divider} />}
            </View>
          ))}
        </Card.Content>
      </Card>
    </View>
  );

  return (
    <LinearGradient
      colors={[AppColors.primary, AppColors.primaryLight, AppColors.background]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Settings</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Manage your app preferences
          </ThemedText>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Section */}
          {renderSection("Profile & Medical Info", profileSettings)}

          {/* App Settings Section */}
          {renderSection("App Settings", appSettings)}

          {/* Support Section */}
          {renderSection("Support & Legal", supportSettings)}

          {/* Account Section - Logout */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Account</ThemedText>
            <Card style={styles.logoutCard}>
              <TouchableOpacity
                style={styles.logoutCardContent}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <View style={styles.logoutInfo}>
                  <View style={styles.logoutIconWrapper}>
                    <Ionicons
                      name="log-out-outline"
                      size={24}
                      color={AppColors.white}
                    />
                  </View>
                  <View style={styles.logoutTextContainer}>
                    <ThemedText style={styles.logoutCardTitle}>
                      Sign Out
                    </ThemedText>
                    <ThemedText style={styles.logoutCardSubtitle}>
                      {userEmail || "Sign out of your account"}
                    </ThemedText>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={AppColors.error}
                />
              </TouchableOpacity>
            </Card>
          </View>

          {/* Danger Zone - Delete Account */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Danger Zone</ThemedText>
            <Card style={styles.deleteCard}>
              <TouchableOpacity
                style={styles.deleteCardContent}
                onPress={() => setDeleteAccountModalVisible(true)}
                activeOpacity={0.8}
              >
                <View style={styles.deleteInfo}>
                  <View style={styles.deleteIconWrapper}>
                    <Ionicons
                      name="trash-outline"
                      size={24}
                      color={AppColors.white}
                    />
                  </View>
                  <View style={styles.deleteTextContainer}>
                    <ThemedText style={styles.deleteCardTitle}>
                      Delete Account
                    </ThemedText>
                    <ThemedText style={styles.deleteCardSubtitle}>
                      Permanently delete your account and all data
                    </ThemedText>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#d32f2f" />
              </TouchableOpacity>
            </Card>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Export Data Modal */}

        <ExportDataModal
          visible={exportModalVisible}
          onClose={() => setExportModalVisible(false)}
          onExport={async (options: ExportOptions) => {
            // Import services and PDF/sharing libs dynamically
            const [
              simpleMedicationService,
              healthLogsService,
              personalInfoService,
            ] = await Promise.all([
              import("@/services/simpleMedicationService"),
              import("@/services/healthLogsService"),
              import("@/services/personalInfoService"),
            ]);

            const Print = await import("expo-print");
            const Sharing = await import("expo-sharing");

            // Format dates
            const startDateStr = options.startDate.toISOString().split("T")[0];
            const endDateStr = options.endDate.toISOString().split("T")[0];

            // Fetch data as per user selection

            let medications: any[] = [];
            let logs: any = null;
            let profile: any = null;
            if (options.includeMedications) {
              medications =
                await simpleMedicationService.simpleMedicationService.getMedications();
            }
            if (options.includeSideEffects || options.includeAnalytics) {
              logs =
                await healthLogsService.healthLogsService.exportLogsForDateRange(
                  startDateStr,
                  endDateStr
                );
            }
            if (options.includeProfile) {
              profile =
                await personalInfoService.personalInfoService.exportPersonalInfo();
            }

            // Build HTML for PDF
            let html = `<h1 style='text-align:center'>PillRemainder Health Data Export</h1>`;
            html += `<p><b>Date Range:</b> ${startDateStr} to ${endDateStr}</p>`;

            if (profile) {
              html += `<h2>Profile Information</h2><table border='1' cellpadding='4' cellspacing='0'>`;
              Object.entries(profile).forEach(([k, v]) => {
                html += `<tr><td><b>${k}</b></td><td>${v ?? ""}</td></tr>`;
              });
              html += `</table>`;
            }

            if (medications.length) {
              html += `<h2>Medications</h2><table border='1' cellpadding='4' cellspacing='0'><tr><th>Name</th><th>Dosage</th><th>Strength</th><th>Form</th><th>Instructions</th></tr>`;
              medications.forEach((m) => {
                html += `<tr><td>${m.name}</td><td>${m.dosage}</td><td>${m.strength}</td><td>${m.form}</td><td>${m.instructions}</td></tr>`;
              });
              html += `</table>`;
            }

            if (logs) {
              if (options.includeAnalytics && logs.dailySummaries?.length) {
                html += `<h2>Health Analytics</h2><table border='1' cellpadding='4' cellspacing='0'><tr><th>Date</th><th>Adherence</th><th>Side Effects</th></tr>`;
                logs.dailySummaries.forEach((s: any) => {
                  html += `<tr><td>${s.date}</td><td>${
                    s.adherence ?? ""
                  }</td><td>${s.sideEffectsReported ?? ""}</td></tr>`;
                });
                html += `</table>`;
              }
              if (options.includeSideEffects && logs.sideEffects?.length) {
                html += `<h2>Side Effects</h2><table border='1' cellpadding='4' cellspacing='0'><tr><th>Date</th><th>Description</th><th>Severity</th><th>Notes</th></tr>`;
                logs.sideEffects.forEach((e: any) => {
                  html += `<tr><td>${e.reportedTime?.split("T")[0]}</td><td>${
                    e.description ?? ""
                  }</td><td>${e.severity ?? ""}</td><td>${
                    e.additionalNotes ?? ""
                  }</td></tr>`;
                });
                html += `</table>`;
              }
            }

            // Generate PDF using expo-print
            try {
              const { uri } = await Print.printToFileAsync({
                html,
                base64: false,
              });
              if (uri && (await Sharing.isAvailableAsync())) {
                await Sharing.shareAsync(uri);
              } else {
                Alert.alert("Export Complete", "PDF generated at: " + uri);
              }
            } catch (err) {
              Alert.alert("Export Failed", "Could not generate PDF.");
              console.error("PDF export error:", err);
            }
          }}
        />

        {/* Help & Support Modal */}
        <Modal
          visible={helpModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setHelpModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.sideEffectModalContent, { maxWidth: 400 }]}>
              {" "}
              {/* Reuse modal style if available */}
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>
                  Help & Support
                </ThemedText>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setHelpModalVisible(false)}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={AppColors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.modalForm}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.helpSection}>
                  <ThemedText style={styles.appTitle}>
                    PillRemainder App
                  </ThemedText>
                  <ThemedText style={styles.versionText}>
                    Version: 1.0.0
                  </ThemedText>
                  <ThemedText style={styles.descriptionText}>
                    Need help or have feedback? We&apos;re here for you!
                  </ThemedText>
                </View>

                <View style={styles.contactSection}>
                  <ThemedText style={styles.sectionHeader}>
                    Contact Support
                  </ThemedText>
                  <View style={styles.contactItem}>
                    <Ionicons
                      name="mail-outline"
                      size={16}
                      color={AppColors.primary}
                    />
                    <ThemedText style={styles.contactText}>
                      support@pillremainder.app
                    </ThemedText>
                  </View>
                  <View style={styles.contactItem}>
                    <Ionicons
                      name="globe-outline"
                      size={16}
                      color={AppColors.primary}
                    />
                    <ThemedText style={styles.contactText}>
                      Visit our website for FAQs
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.emergencySection}>
                  <ThemedText style={styles.emergencyTitle}>
                    ⚠️ Important
                  </ThemedText>
                  <ThemedText style={styles.emergencyText}>
                    For urgent medical issues, contact your healthcare provider
                    immediately or call emergency services.
                  </ThemedText>
                </View>

                <View style={styles.featuresSection}>
                  <ThemedText style={styles.sectionHeader}>
                    App Features
                  </ThemedText>
                  <ThemedText style={styles.featureText}>
                    • Medication scheduling and tracking
                  </ThemedText>
                  <ThemedText style={styles.featureText}>
                    • Side effects tracking and monitoring
                  </ThemedText>
                  <ThemedText style={styles.featureText}>
                    • AI-powered medication assistance
                  </ThemedText>
                  <ThemedText style={styles.featureText}>
                    • Health analytics and reports
                  </ThemedText>
                </View>
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setHelpModalVisible(false)}
                >
                  <ThemedText style={styles.cancelButtonText}>Close</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modals */}
        <PersonalInformationModal
          visible={personalModalVisible}
          onClose={() => setPersonalModalVisible(false)}
          onSave={(data) => {
            // TODO: Save personal information to database
          }}
        />

        <MedicalInformationModal
          visible={medicalModalVisible}
          onClose={() => setMedicalModalVisible(false)}
          onSave={(data) => {
            // TODO: Save medical information to database
          }}
        />

        <EmergencyContactModal
          visible={emergencyModalVisible}
          onClose={() => setEmergencyModalVisible(false)}
          onSave={(data) => {
            // TODO: Save emergency contact to database
          }}
        />

        <HealthcareProviderModal
          visible={healthcareModalVisible}
          onClose={() => setHealthcareModalVisible(false)}
          onSave={(data) => {
            // TODO: Save healthcare provider to database
          }}
        />

        <DeleteAccountModal
          visible={deleteAccountModalVisible}
          onClose={() => setDeleteAccountModalVisible(false)}
          onAccountDeleted={handleAccountDeleted}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Modal Styles for Help & Support
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  sideEffectModalContent: {
    backgroundColor: AppColors.backgroundCard,
    borderRadius: 20,
    padding: 0,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: AppColors.backgroundCard,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppColors.primary,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: AppColors.backgroundSecondary,
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: AppColors.gray100,
    marginLeft: 10,
  },
  modalForm: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    maxHeight: 350,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: AppColors.backgroundCard,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: AppColors.gray100,
  },
  cancelButtonText: {
    color: AppColors.primary,
    fontWeight: "bold",
    fontSize: 15,
  },
  // Help & Support Modal specific styles
  helpSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.primary,
    marginBottom: 4,
  },
  versionText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: AppColors.textPrimary,
    lineHeight: 20,
  },
  contactSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.primary,
    marginBottom: 10,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  contactText: {
    fontSize: 14,
    color: AppColors.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  emergencySection: {
    backgroundColor: `${AppColors.warning}15`,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: AppColors.warning,
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.warning,
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 13,
    color: AppColors.textPrimary,
    lineHeight: 18,
  },
  featuresSection: {
    marginBottom: 10,
  },
  featureText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 16,
    elevation: 3,
    shadowColor: AppColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: AppColors.backgroundCard,
  },
  sectionContent: {
    padding: 0,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${AppColors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  settingsSubtitle: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  settingsItemRight: {
    marginLeft: 10,
  },
  divider: {
    marginLeft: 75,
    backgroundColor: AppColors.border,
  },
  bottomSpacer: {
    height: 110,
  },
  logoutCard: {
    borderRadius: 16,
    elevation: 3,
    backgroundColor: AppColors.backgroundCard,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.error,
    shadowColor: AppColors.error,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoutCardContent: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoutInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logoutIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: AppColors.error,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    shadowColor: AppColors.error,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutTextContainer: {
    flex: 1,
  },
  logoutCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.error,
    marginBottom: 4,
  },
  logoutCardSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontWeight: "500",
  },
  deleteCard: {
    borderRadius: 16,
    elevation: 3,
    backgroundColor: AppColors.backgroundCard,
    borderLeftWidth: 4,
    borderLeftColor: "#d32f2f",
    shadowColor: "#d32f2f",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deleteCardContent: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deleteInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  deleteIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#d32f2f",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    shadowColor: "#d32f2f",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteTextContainer: {
    flex: 1,
  },
  deleteCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#d32f2f",
    marginBottom: 4,
  },
  deleteCardSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontWeight: "500",
  },
});
