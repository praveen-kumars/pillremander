import { ThemedText } from "@/components/ThemedText";
import { AppColors } from "@/constants/AppColors";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";

interface ExportDataModalProps {
  visible: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
}

export interface ExportOptions {
  startDate: Date;
  endDate: Date;
  includeMedications: boolean;
  includeSideEffects: boolean;
  includeAnalytics: boolean;
  includeProfile: boolean;
}

export default function ExportDataModal({
  visible,
  onClose,
  onExport,
}: ExportDataModalProps) {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [includeMedications, setIncludeMedications] = useState(true);
  const [includeSideEffects, setIncludeSideEffects] = useState(true);
  const [includeAnalytics, setIncludeAnalytics] = useState(true);
  const [includeProfile, setIncludeProfile] = useState(false);

  const handleExport = () => {
    onExport({
      startDate,
      endDate,
      includeMedications,
      includeSideEffects,
      includeAnalytics,
      includeProfile,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <ThemedText style={styles.title}>Export Data</ThemedText>
          <ThemedText style={styles.label}>Date Range</ThemedText>
          <View style={styles.dateRow}>
            <TouchableOpacity
              onPress={() => setShowStartPicker(true)}
              style={styles.dateButton}
            >
              <ThemedText style={styles.dateText}>
                {startDate.toDateString()}
              </ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.toText}>to</ThemedText>
            <TouchableOpacity
              onPress={() => setShowEndPicker(true)}
              style={styles.dateButton}
            >
              <ThemedText style={styles.dateText}>
                {endDate.toDateString()}
              </ThemedText>
            </TouchableOpacity>
          </View>
          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="default"
              onChange={(_, date) => {
                setShowStartPicker(false);
                if (date) setStartDate(date);
              }}
              maximumDate={endDate}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display="default"
              onChange={(_, date) => {
                setShowEndPicker(false);
                if (date) setEndDate(date);
              }}
              minimumDate={startDate}
              maximumDate={new Date()}
            />
          )}
          <ThemedText style={styles.label}>Include</ThemedText>
          <View style={styles.checkboxRow}>
            <Checkbox
              label="Medications"
              checked={includeMedications}
              onPress={() => setIncludeMedications((v) => !v)}
            />
            <Checkbox
              label="Side Effects"
              checked={includeSideEffects}
              onPress={() => setIncludeSideEffects((v) => !v)}
            />
          </View>
          <View style={styles.checkboxRow}>
            <Checkbox
              label="Analytics"
              checked={includeAnalytics}
              onPress={() => setIncludeAnalytics((v) => !v)}
            />
          </View>
          <View style={styles.checkboxRow}>
            <Checkbox
              label="Profile Info"
              checked={includeProfile}
              onPress={() => setIncludeProfile((v) => !v)}
            />
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExport}
            >
              <ThemedText style={styles.exportText}>Export</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Checkbox({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.checkbox} onPress={onPress}>
      <View
        style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}
      />
      <ThemedText style={styles.checkboxLabel}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: AppColors.backgroundCard,
    borderRadius: 18,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppColors.primary,
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.textPrimary,
    marginTop: 10,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  dateButton: {
    backgroundColor: AppColors.gray100,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  dateText: {
    fontSize: 14,
    color: AppColors.textPrimary,
  },
  toText: {
    marginHorizontal: 8,
    color: AppColors.textSecondary,
    fontSize: 14,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 18,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: AppColors.primary,
    marginRight: 8,
    backgroundColor: AppColors.white,
  },
  checkboxBoxChecked: {
    backgroundColor: AppColors.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: AppColors.textPrimary,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 18,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: AppColors.gray100,
    marginRight: 10,
  },
  cancelText: {
    color: AppColors.primary,
    fontWeight: "bold",
    fontSize: 15,
  },
  exportButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: AppColors.primary,
  },
  exportText: {
    color: AppColors.white,
    fontWeight: "bold",
    fontSize: 15,
  },
});
