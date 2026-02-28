import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { deleteAccount, getCurrentUserId } from "../../services/supabase";

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onAccountDeleted: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onClose,
  onAccountDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently delete:\n\n• All your personal information\n• All medication records\n• All health logs\n• All app preferences\n\nThis data cannot be recovered.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final Confirmation",
              "This is your final warning. Your account and all data will be permanently deleted. Are you sure?",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Yes, Delete Everything",
                  style: "destructive",
                  onPress: performAccountDeletion,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const performAccountDeletion = async () => {
    setIsDeleting(true);
    try {

      // 2. Delete account from Supabase and clear all storage
      const userId = await getCurrentUserId();
      const result = await deleteAccount(userId);
      if (result.success) {
        Alert.alert(
          "Account Deleted",
          "Your account has been successfully deleted. You will now be redirected to the welcome screen.",
          [
            {
              text: "OK",
              onPress: () => {
                onAccountDeleted();
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Deletion Error",
          result.error ||
            "Failed to delete account. Please try again or contact support.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Account deletion error:", error);
      Alert.alert(
        "Deletion Error",
        "An unexpected error occurred while deleting your account. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Delete Account</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.warningSection}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningTitle}>
              Warning: This action is permanent
            </Text>
            <Text style={styles.warningText}>
              Deleting your account will permanently remove all your data
              including:
            </Text>
          </View>

          <View style={styles.dataList}>
            <Text style={styles.dataItem}>
              • Personal information and profile
            </Text>
            <Text style={styles.dataItem}>
              • All medication schedules and history
            </Text>
            <Text style={styles.dataItem}>
              • Health logs and side effect records
            </Text>
            <Text style={styles.dataItem}>• App preferences and settings</Text>
            <Text style={styles.dataItem}>
              • Emergency contacts and healthcare providers
            </Text>
            <Text style={styles.dataItem}>• All cached offline data</Text>
          </View>

          <View style={styles.consequenceSection}>
            <Text style={styles.consequenceTitle}>After deletion:</Text>
            <Text style={styles.consequenceText}>
              • You will lose access to all medication reminders
            </Text>
            <Text style={styles.consequenceText}>
              • All health tracking data will be lost
            </Text>
            <Text style={styles.consequenceText}>
              • You cannot recover this data
            </Text>
            <Text style={styles.consequenceText}>
              • You will need to create a new account to use the app
            </Text>
          </View>

          <View style={styles.alternativeSection}>
            <Text style={styles.alternativeTitle}>Alternative:</Text>
            <Text style={styles.alternativeText}>
              Consider signing out instead if you just want to switch accounts
              or take a break. Your data will be preserved and you can sign back
              in anytime.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={isDeleting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deleteButton,
              isDeleting && styles.deleteButtonDisabled,
            ]}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#d32f2f",
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: "#666",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  warningSection: {
    alignItems: "center",
    paddingVertical: 30,
  },
  warningIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#d32f2f",
    marginBottom: 12,
    textAlign: "center",
  },
  warningText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    lineHeight: 22,
  },
  dataList: {
    backgroundColor: "#fff3cd",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  dataItem: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
    lineHeight: 20,
  },
  consequenceSection: {
    backgroundColor: "#f8d7da",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#dc3545",
  },
  consequenceTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#721c24",
    marginBottom: 12,
  },
  consequenceText: {
    fontSize: 14,
    color: "#721c24",
    marginBottom: 6,
    lineHeight: 20,
  },
  alternativeSection: {
    backgroundColor: "#d1ecf1",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#17a2b8",
  },
  alternativeTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0c5460",
    marginBottom: 8,
  },
  alternativeText: {
    fontSize: 14,
    color: "#0c5460",
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#d32f2f",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonDisabled: {
    backgroundColor: "#999",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
