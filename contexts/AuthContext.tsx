import { supabase, profileService, UserProfile } from "@/lib/supabase";
import { personalInfoService } from "@/services/personalInfoService";
import { Session, User } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error?: string }>;
  signUpWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
  needsOnboarding: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only listen to Supabase auth state changes
    // DO NOT initialize authService here - it's handled in welcome.tsx
    
    // Get initial session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes from Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Supabase auth state changed:", event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadUserProfile(session.user.id);
        
        // If user just signed up/in and no profile exists, create one
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          const userProfile = await profileService.getProfile(session.user.id);
          
          if (!userProfile && session.user.email) {
            try {
              const newProfile = await profileService.createProfile({
                id: session.user.id,
                full_name:
                  session.user.user_metadata?.full_name ||
                  session.user.email.split("@")[0] ||
                  "User",
              });
              console.log("Profile created successfully:", newProfile);
              await loadUserProfile(session.user.id);
            } catch (error) {
              console.error("Failed to create profile automatically:", error);
            }
          }
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const userProfile = await profileService.getProfile(userId);
      console.log("🚀 ~ loadUserProfile ~ userProfile:", userProfile);
      setProfile(userProfile);
    } catch (error) {
      console.error("Error loading profile:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log("Attempting to sign in with email:", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Supabase sign in error:", error);
        return { error: error.message };
      }

      console.log("Sign in successful:", data);
      // AuthContext will handle state updates via onAuthStateChange
      return {};
    } catch (error) {
      console.error("Sign in error:", error);
      return { error: "An unexpected error occurred" };
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      console.log("Attempting to sign up with email:", email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: email.split("@")[0], // Default firstName from email
            last_name: ""
          }
        }
      });

      if (error) {
        console.error("Supabase sign up error:", error);
        return { error: error.message };
      }

      console.log("Sign up successful:", data);
      // AuthContext will handle profile creation via onAuthStateChange
      return {};
    } catch (error) {
      console.error("Sign up error:", error);
      return { error: "An unexpected error occurred" };
    }
  };

  const signInWithGoogle = async () => {
    try {
      // For React Native, we'll use Linking or WebBrowser
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "pillremainder://auth/callback",
        },
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      console.error("Google sign in error:", error);
      return {
        error:
          "Google sign-in requires additional setup. Please use email for now.",
      };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // State will be cleared via onAuthStateChange
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: "No user logged in" };
    }

    try {
      const updatedProfile = await profileService.updateProfile(
        user.id,
        updates
      );
      if (updatedProfile) {
        setProfile(updatedProfile);
        return {};
      } else {
        return { error: "Failed to update profile" };
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      return { error: "An unexpected error occurred" };
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    await loadUserProfile(user.id);
  };

  const needsOnboarding = async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Check personal info service for essential fields
      const personalInfo = await personalInfoService.getPersonalInfo();

      if (!personalInfo) {
        console.log("No personal info found, onboarding needed");
        return true;
      }

      // Check if essential fields are completed
      const essentialFields =
        personalInfo.firstName &&
        personalInfo.lastName &&
        personalInfo.dateOfBirth;
      const needsOnboard = !essentialFields;

      console.log("Personal info onboarding check:", {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        dateOfBirth: personalInfo.dateOfBirth,
        needsOnboarding: needsOnboard,
      });

      return needsOnboard;
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      // If we can't check, assume onboarding is needed for safety
      return true;
    }
  };

  const value: AuthContextType = {
    session,
    user,
    profile,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    updateProfile,
    refreshProfile,
    needsOnboarding,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
