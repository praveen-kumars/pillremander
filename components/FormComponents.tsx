import { ThemedText } from "@/components/ThemedText";
import { AppColors } from "@/constants/AppColors";
import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
  editable?: boolean;
}

interface PickerFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = "default",
  editable = true,
}: FormFieldProps) {
  return (
    <View style={styles.inputGroup}>
      <ThemedText style={styles.inputLabel}>{label}</ThemedText>
      <TextInput
        style={[
          styles.textInput,
          multiline && styles.multilineInput,
          !editable && styles.disabledInput,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={AppColors.textSecondary}
        editable={editable}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
      />
    </View>
  );
}

export function PickerField({
  label,
  value,
  onValueChange,
  options,
}: PickerFieldProps) {
  return (
    <View style={styles.inputGroup}>
      <ThemedText style={styles.inputLabel}>{label}</ThemedText>
      <View style={styles.pickerContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.pickerOption,
              value === option && styles.selectedPickerOption,
            ]}
            onPress={() => onValueChange(option)}
          >
            <ThemedText
              style={[
                styles.pickerOptionText,
                value === option && styles.selectedPickerOptionText,
              ]}
            >
              {option}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {subtitle && (
        <ThemedText style={styles.sectionSubtitle}>{subtitle}</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: AppColors.textPrimary,
    backgroundColor: AppColors.white,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
  },
  disabledInput: {
    backgroundColor: AppColors.gray100,
    color: AppColors.textSecondary,
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: AppColors.gray100,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  selectedPickerOption: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  pickerOptionText: {
    fontSize: 14,
    color: AppColors.textPrimary,
    fontWeight: "500",
  },
  selectedPickerOptionText: {
    color: AppColors.white,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
});
