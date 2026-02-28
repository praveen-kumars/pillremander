import { ThemedText } from "@/components/ThemedText";
import { AppColors } from "@/constants/AppColors";
import { globalDatabaseManager } from "@/services/globalDatabaseManager";
import notificationService from "@/services/notificationService";
import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Font from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { checkUserSession, supabaseLogin } from "../services/supabase";

const { width, height } = Dimensions.get("window");
const screenWidth = width;

export default function WelcomeScreen() {
  // Font loading utility
  const loadFonts = React.useCallback(async () => {
    try {
      // Load custom font
      if (Font && typeof Font.loadAsync === "function") {
        await Font.loadAsync({
          SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
        });
      }
    } catch {
      // Continue with system fonts if loading fails
    }
  }, []);
  // Initialization steps state
  const [steps, setSteps] = useState([
    { id: "fonts", name: "Loading fonts...", icon: "font", completed: false },
    {
      id: "database",
      name: "Initializing databases...",
      icon: "database",
      completed: false,
    },
    {
      id: "notifications",
      name: "Setting up notifications...",
      icon: "bell",
      completed: false,
    },
    {
      id: "auth",
      name: "Checking authentication...",
      icon: "user",
      completed: false,
    },
  ]);

  // Helper to update step progress
  const updateStepProgress = (stepIndex: number, completed: boolean) => {
    setSteps((prevSteps) => {
      const newSteps = [...prevSteps];
      newSteps[stepIndex].completed = completed;
      return newSteps;
    });
  };

  // Initialization logic
  const initializeApp = async () => {
    try {
      // Step 1: Load fonts
      updateStepProgress(0, false);
      if (typeof loadFonts === "function") {
        await loadFonts();
      }
      updateStepProgress(0, true);

      // Step 2: Initialize databases
      updateStepProgress(1, false);
      await globalDatabaseManager.initialize();

      updateStepProgress(1, true);

      // Step 3: Setup notifications
      updateStepProgress(2, false);

      await notificationService.registerForPushNotificationsAsync();

      updateStepProgress(2, true);

      // Step 4: Check authentication
      updateStepProgress(3, false);
      await checkAuthAndNavigate();
      updateStepProgress(3, true);
    } catch (error) {
      console.error("Initialization error:", error);
      setError("Initialization failed");
    } finally {
      setIsLoading(false);
    }
  };
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];

  const checkAuthAndNavigate = async () => {
    try {
      console.log("🔍 Welcome: Starting session check...");
      // Check session (AsyncStorage first, then Supabase)
      const sessionResult = await checkUserSession();
      const user = sessionResult.user;
      if (!user) {
        console.log("❌ No active session, redirecting to login");
        router.replace("/auth/login");
        return;
      }
      // Check onboarding status in AsyncStorage first
      const onboardingJson = await AsyncStorage.getItem(
        "onboarding_status_" + user.id
      );
      let isOnboardingComplete = false;
      if (onboardingJson) {
        isOnboardingComplete = JSON.parse(onboardingJson);
      } else {
        // If not found, check Supabase user_profiles table
        const { data: profile, error } = await supabaseLogin
          .from("user_profiles")
          .select("isOnboarding")
          .eq("id", user.id)
          .single();
        if (profile && typeof profile.isOnboarding === "boolean") {
          isOnboardingComplete = profile.isOnboarding;
          await AsyncStorage.setItem(
            "onboarding_status_" + user.id,
            JSON.stringify(isOnboardingComplete)
          );
        }
      }
      if (isOnboardingComplete) {
        console.log("🏠 User completed onboarding, going to home...");
        router.replace("/(tabs)");
      } else {
        console.log("📋 User needs onboarding, redirecting...");
        router.replace("/onboarding/personal-info");
      }
    } catch (error) {
      console.error("❌ Auth check failed:", error);
      setError("Authentication check failed");
      setTimeout(() => {
        router.replace("/auth/login");
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Start initialization steps
    initializeApp();
  }, [fadeAnim, scaleAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[
          AppColors.primary,
          AppColors.primaryLight,
          AppColors.secondary,
          "#667eea",
        ]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Background Pattern */}
        <View style={styles.backgroundPattern}>
          {Array.from({ length: 20 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.patternDot,
                {
                  left: (i % 5) * (screenWidth / 4) + 50,
                  top: Math.floor(i / 5) * (height / 4) + 100,
                  opacity: 0.1,
                },
              ]}
            />
          ))}
        </View>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* App Logo and Title */}
          <View style={styles.logoContainer}>
            <Animated.View
              style={[
                styles.logoBackground,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <FontAwesome name="medkit" size={60} color={AppColors.white} />
            </Animated.View>
            <ThemedText style={styles.appTitle}>PillReminder</ThemedText>
            <ThemedText style={styles.appSubtitle}>
              Your Personal Medication Assistant
            </ThemedText>
            <ThemedText style={styles.appDescription}>
              AI-powered medication tracking with side effects monitoring and
              smart reminders
            </ThemedText>
          </View>

          {/* Loading or Error State */}
          <View style={styles.statusContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={AppColors.white} />
                <ThemedText style={styles.loadingText}>
                  Loading your personalized experience...
                </ThemedText>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <FontAwesome
                  name="exclamation-triangle"
                  size={24}
                  color={AppColors.error}
                />
                <ThemedText style={styles.errorText}>{error}</ThemedText>
                <ThemedText style={styles.errorSubtext}>
                  Redirecting to login...
                </ThemedText>
              </View>
            ) : null}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              Keeping you healthy, one pill at a time
            </ThemedText>
          </View>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  errorCode: {
    fontSize: 13,
    color: AppColors.error,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  backgroundPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternDot: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppColors.white,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    padding: 40,
    paddingTop: 80,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: AppColors.white,
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 1,
  },
  appSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    fontWeight: "300",
  },
  progressContainer: {
    flex: 1,
    justifyContent: "center",
    maxHeight: 400,
  },
  progressHeader: {
    alignItems: "center",
    marginBottom: 30,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: AppColors.white,
    marginBottom: 8,
    textAlign: "center",
  },
  progressSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  progressBarContainer: {
    marginBottom: 40,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: AppColors.white,
    borderRadius: 3,
    shadowColor: AppColors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  stepsContainer: {
    marginBottom: 40,
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  stepIconActive: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: AppColors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  stepIconCompleted: {
    backgroundColor: AppColors.success,
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "400",
  },
  stepTextActive: {
    color: AppColors.white,
    fontWeight: "500",
  },
  stepTextCompleted: {
    color: AppColors.white,
    fontWeight: "500",
  },
  loadingContainer: {
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  errorContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: AppColors.white,
    textAlign: "center",
    fontWeight: "500",
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
  successContainer: {
    alignItems: "center",
    padding: 20,
  },
  successText: {
    marginTop: 12,
    fontSize: 16,
    color: AppColors.white,
    textAlign: "center",
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
    paddingTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 18,
  },
});
