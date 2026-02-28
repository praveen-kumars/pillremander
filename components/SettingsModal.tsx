import { ThemedText } from "@/components/ThemedText";
import { AppColors } from "@/constants/AppColors";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Card } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
  showSaveButton?: boolean;
  onSave?: () => void;
  saveButtonText?: string;
  isLoading?: boolean;
}

export default function SettingsModal({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  children,
  showSaveButton = false,
  onSave,
  saveButtonText = "Save Changes",
  isLoading = false,
}: SettingsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={[
          AppColors.primary,
          AppColors.primaryLight,
          AppColors.background,
        ]}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={AppColors.white} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <View style={styles.titleRow}>
                {icon && (
                  <Ionicons
                    name={icon as any}
                    size={24}
                    color={AppColors.white}
                    style={styles.headerIcon}
                  />
                )}
                <ThemedText style={styles.headerTitle}>{title}</ThemedText>
              </View>
              {subtitle && (
                <ThemedText style={styles.headerSubtitle}>
                  {subtitle}
                </ThemedText>
              )}
            </View>
            {showSaveButton && (
              <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.disabledButton]}
                onPress={onSave}
                disabled={isLoading}
              >
                <ThemedText style={styles.saveButtonText}>
                  {saveButtonText}
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Card style={styles.contentCard}>
              <Card.Content style={styles.cardContent}>{children}</Card.Content>
            </Card>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
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
  closeButton: {
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppColors.white,
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    marginTop: 2,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: AppColors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contentCard: {
    borderRadius: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    padding: 20,
  },
});
