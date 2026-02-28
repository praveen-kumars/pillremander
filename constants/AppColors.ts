export const AppColors = {
  // Primary colors - Softer Medical Blue (Less vibrant, more professional)
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  
  // Secondary colors - Muted Health Green (Calmer)
  secondary: '#059669',
  secondaryLight: '#10B981',
  secondaryDark: '#047857',
  
  // Accent colors - Softer Amber (Less intense)
  accent: '#D97706',
  accentLight: '#F59E0B',
  accentDark: '#B45309',
  
  // Success colors
  success: '#059669',
  successLight: '#10B981',
  successDark: '#047857',
  
  // Warning colors - Muted Amber
  warning: '#D97706',
  warningLight: '#F59E0B',
  warningDark: '#B45309',
  
  // Error colors - Softer Red
  error: '#DC2626',
  errorLight: '#EF4444',
  errorDark: '#B91C1C',
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',
  
  // Medication status colors - Clear & Distinct
  taken: '#059669',        // Green - success, completed
  skipped: '#D97706',      // Amber - warning, attention needed
  pending: '#3B82F6',      // Blue - neutral, waiting
  missed: '#DC2626',       // Red - missed, critical attention needed
  overdue: '#DC2626',      // Red - urgent, critical
  reminder: '#8B5CF6',     // Purple - notification, upcoming
  chatBot: '#7C3AED',      // Purple - AI assistant, intelligent
  
  // Interactive states
  buttonPrimary: '#3B82F6',
  buttonHover: '#2563EB',
  buttonDisabled: '#CBD5E1',
  touchFeedback: 'rgba(59, 130, 246, 0.08)',
  rippleEffect: 'rgba(59, 130, 246, 0.15)',
  
  // Light theme colors (static) - add back the missing properties
  background: '#F8FAFC',
  backgroundCard: '#FFFFFF',
  backgroundSecondary: '#F1F5F9',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  shadow: '#64748B',
  
  // Tab bar colors
  tabBarBackground: '#FFFFFF',
  tabBarBackdrop: '#F8FAFC',
  tabBarBorder: '#E2E8F0',
  tabBarShadow: '#64748B',
};

// Theme-aware colors that change based on dark/light mode
export const getThemeColors = (isDarkMode: boolean) => ({
  // Background colors - Clean & Fresh
  background: isDarkMode ? '#0F172A' : '#F8FAFC',
  backgroundSecondary: isDarkMode ? '#1E293B' : '#FFFFFF',
  backgroundCard: isDarkMode ? '#1E293B' : '#FFFFFF',
  
  // Text colors - High Contrast
  textPrimary: isDarkMode ? '#F1F5F9' : '#1E293B',
  textSecondary: isDarkMode ? '#94A3B8' : '#64748B',
  textLight: isDarkMode ? '#64748B' : '#94A3B8',
  
  // Border colors - Subtle & Clean
  border: isDarkMode ? '#334155' : '#E2E8F0',
  borderLight: isDarkMode ? '#1E293B' : '#F1F5F9',
  
  // Shadow colors
  shadow: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(15, 23, 42, 0.1)',
  shadowLight: isDarkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(15, 23, 42, 0.05)',
  
  // Tab Bar specific colors
  tabBarBackground: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
  tabBarBorder: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
  tabBarShadow: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.08)',
  tabBarBackdrop: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(248, 250, 252, 0.8)',
});
