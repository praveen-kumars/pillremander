import { useAuth } from "@/contexts/AuthContext";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { ThemedText } from "./ThemedText";

interface OnboardingCheckerProps {
  children: React.ReactNode;
}

export function OnboardingChecker({ children }: OnboardingCheckerProps) {
  const { user, needsOnboarding, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<
    "unknown" | "needed" | "completed"
  >("unknown");

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user || authLoading || onboardingStatus !== "unknown") return;

      console.log(
        "OnboardingChecker: Checking onboarding status for user:",
        user.email
      );
      setChecking(true);

      try {
        const needsOnboard = await needsOnboarding();
        console.log(
          "OnboardingChecker: Needs onboarding result:",
          needsOnboard
        );

        if (needsOnboard) {
          console.log(
            "OnboardingChecker: User needs onboarding, redirecting..."
          );
          setOnboardingStatus("needed");
          router.replace("/onboarding/personal-info");
        } else {
          console.log(
            "OnboardingChecker: Onboarding complete, showing main app"
          );
          setOnboardingStatus("completed");
        }
      } catch (error) {
        console.error(
          "OnboardingChecker: Error checking onboarding status:",
          error
        );
        // If we can't check, assume onboarding is needed for safety
        setOnboardingStatus("needed");
        router.replace("/onboarding/personal-info");
      } finally {
        setChecking(false);
      }
    };

    checkOnboardingStatus();
  }, [user, authLoading, onboardingStatus, needsOnboarding]);

  // Show loading while checking onboarding status
  if (checking || (onboardingStatus === "unknown" && user && !authLoading)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={{ marginTop: 16 }}>
          Checking your profile...
        </ThemedText>
      </View>
    );
  }

  // If user is logged in and has completed onboarding, show the app
  if (user && onboardingStatus === "completed") {
    return <>{children}</>;
  }

  // For all other cases (no user, auth loading, needs onboarding), show children
  return <>{children}</>;
}
