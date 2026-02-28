import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service to handle onboarding completion and sync with Supabase
 */
export const onboardingService = {
  /**
   * Mark onboarding as complete both locally and in Supabase
   */
  async completeOnboarding(userId: string): Promise<boolean> {
    try {
      console.log("✅ Completing onboarding for user:", userId);
      
      // 1. Save to local storage immediately
      const onboardingKey = `@PillReminder_Onboarding_${userId}`;
      await AsyncStorage.setItem(onboardingKey, 'true');
      console.log("✅ Onboarding status saved locally");
      
      // 2. Try to update Supabase (don't fail if table doesn't exist)
      try {
        // First try to update if record exists
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();
        
        if (existingProfile) {
          // Update existing profile
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ onboarding_complete: true })
            .eq('id', userId);
          
          if (!updateError) {
            console.log("✅ Onboarding status updated in Supabase profiles");
          } else {
            console.warn("⚠️ Failed to update profiles table:", updateError.message);
          }
        } else {
          // Create new profile record
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                email: user.email,
                onboarding_complete: true,
                created_at: new Date().toISOString()
              });
            
            if (!insertError) {
              console.log("✅ New profile created in Supabase with onboarding complete");
            } else {
              console.warn("⚠️ Failed to create profile:", insertError.message);
            }
          }
        }
      } catch (supabaseError) {
        console.warn("⚠️ Supabase onboarding update failed (table may not exist):", supabaseError);
        // Don't fail - local storage is primary source of truth
      }
      
      return true;
    } catch (error) {
      console.error("❌ Error completing onboarding:", error);
      return false;
    }
  },

  /**
   * Check if onboarding is complete (check local storage first)
   */
  async isOnboardingComplete(userId: string): Promise<boolean> {
    try {
      // Check local storage first (primary source)
      const onboardingKey = `@PillReminder_Onboarding_${userId}`;
      const localStatus = await AsyncStorage.getItem(onboardingKey);
      
      if (localStatus === 'true') {
        return true;
      }
      
      // If not in local storage, check Supabase as backup
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('id', userId)
          .single();
        
        if (!error && data?.onboarding_complete) {
          // Sync to local storage for future quick access
          await AsyncStorage.setItem(onboardingKey, 'true');
          return true;
        }
      } catch (supabaseError) {
        console.warn("⚠️ Supabase onboarding check failed:", supabaseError);
      }
      
      return false;
    } catch (error) {
      console.error("❌ Error checking onboarding status:", error);
      return false;
    }
  },

  /**
   * Reset onboarding status (for testing)
   */
  async resetOnboarding(userId: string): Promise<void> {
    try {
      const onboardingKey = `@PillReminder_Onboarding_${userId}`;
      await AsyncStorage.removeItem(onboardingKey);
      
      // Also update Supabase if possible
      try {
        await supabase
          .from('profiles')
          .update({ onboarding_complete: false })
          .eq('id', userId);
      } catch (supabaseError) {
        console.warn("⚠️ Failed to reset onboarding in Supabase:", supabaseError);
      }
      
      console.log("✅ Onboarding status reset");
    } catch (error) {
      console.error("❌ Error resetting onboarding:", error);
    }
  }
};
