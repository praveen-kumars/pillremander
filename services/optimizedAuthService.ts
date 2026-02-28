import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const USER_PROFILE_KEY = '@user_profile';
const ONBOARDING_KEY = '@onboarding_complete';

export const authService = {
  // Login with AsyncStorage-first approach
  async handleLogin(email: string, password: string) {
    try {
      console.log('🔐 Starting login for:', email);
      
      // 1. Sign in the user
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("Login successful, but no user data returned.");

      console.log('✅ Supabase login successful');

      // 2. Fetch the user's public profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, full_name, email, phone_number, date_of_birth')
        .eq('id', data.user.id)
        .single(); // .single() returns one object instead of an array

      // Don't throw error if profile doesn't exist, just continue without it
      if (profileError && profileError.code !== 'PGRST116') {
        console.warn('⚠️ Profile fetch warning:', profileError);
      }

      // 3. Store the fetched profile in AsyncStorage
      if (profile) {
        await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
        console.log('💾 Profile stored in AsyncStorage');
      }

      console.log('✅ Login successful, profile stored.');
      return { user: data.user, profile: profile || null, session: data.session };

    } catch (error: any) {
      console.error('❌ Error during login:', error.message);
      return { error: error.message };
    }
  },

  // Signup with profile creation
  async handleSignup(email: string, password: string, username: string) {
    try {
      console.log('📝 Starting signup for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: username
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error("Signup successful, but no user data returned.");

      // Create profile in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          username,
          full_name: username,
          email: data.user.email
        });

      const userProfile = {
        id: data.user.id,
        email: data.user.email || email,
        username,
        full_name: username
      };

      // Store profile even if Supabase insert failed
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));

      if (profileError) {
        console.warn('⚠️ Profile creation warning:', profileError);
      }

      console.log('✅ Signup successful');
      return { user: data.user, profile: userProfile, session: data.session };

    } catch (error: any) {
      console.error('❌ Error during signup:', error.message);
      return { error: error.message };
    }
  },

  // Check user status with AsyncStorage-first approach
  async checkUserStatus(): Promise<{ user: any; profile: any; session: any; error?: string }> {
    try {
      console.log('🔍 Checking user status...');
      
      // 1. Check AsyncStorage for a stored profile first
      const storedProfile = await AsyncStorage.getItem(USER_PROFILE_KEY);
      let profile = null;
      
      if (storedProfile) {
        console.log('💾 Found profile in storage. Loading optimistically.');
        profile = JSON.parse(storedProfile);
      }

      // 2. Validate the session with Supabase in the background
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('⚠️ Session validation error:', error);
        // Clear storage if session is invalid
        await this.clearUserData();
        return { user: null, profile: null, session: null, error: error.message };
      }

      if (session?.user) {
        console.log('✅ Supabase session is valid.');
        
        // If the profile in storage was missing, fetch it again
        if (!storedProfile) {
          console.log('🔄 Fetching fresh profile from Supabase...');
          const { data: freshProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (freshProfile) {
            await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(freshProfile));
            profile = freshProfile;
          }
        }
        
        return { user: session.user, profile, session };
      } else {
        // If Supabase has no session, clear local storage
        console.log('❌ No valid Supabase session. Clearing local data.');
        await this.clearUserData();
        return { user: null, profile: null, session: null };
      }
    } catch (error: any) {
      console.warn('⚠️ Error checking user status:', error);
      await this.clearUserData();
      return { user: null, profile: null, session: null, error: error.message };
    }
  },

  // Check if onboarding is complete
  async isOnboardingComplete(userId?: string) {
    try {
      if (!userId) return false;
      
      const onboardingKey = `${ONBOARDING_KEY}_${userId}`;
      const isComplete = await AsyncStorage.getItem(onboardingKey);
      return isComplete === 'true';
    } catch (error) {
      console.warn('⚠️ Error checking onboarding status:', error);
      return false;
    }
  },

  // Mark onboarding as complete
  async markOnboardingComplete(userId: string) {
    try {
      const onboardingKey = `${ONBOARDING_KEY}_${userId}`;
      await AsyncStorage.setItem(onboardingKey, 'true');
      console.log('✅ Onboarding marked as complete');
    } catch (error) {
      console.warn('⚠️ Error marking onboarding complete:', error);
    }
  },

  // Sign out
  async signOut() {
    try {
      console.log('👋 Signing out...');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      await this.clearUserData();
      console.log('✅ Signed out successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error during signout:', error);
      return { error: error.message };
    }
  },

  // Clear all user data
  async clearUserData() {
    try {
      await AsyncStorage.multiRemove([USER_PROFILE_KEY]);
      console.log('🗑️ User data cleared from storage');
    } catch (error) {
      console.warn('⚠️ Error clearing user data:', error);
    }
  }
};

export default authService;
