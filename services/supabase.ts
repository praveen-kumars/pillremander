import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
// Fetch user profile from Supabase, fallback to SQLite if not found
export const getUserProfile = async (userId: string) => {
  try {
    // Try Supabase first
    const { data: profile, error } = await supabaseLogin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (profile && !error) {
      return { profile, source: 'supabase' };
    }
    // Fallback to SQLite
    try {
      const { personalInfoService } = await import('@/services/personalInfoService');
      const localProfile = await personalInfoService.getPersonalInfo();
      if (localProfile) {
        return { profile: localProfile, source: 'sqlite' };
      }
    } catch (sqliteError) {
      // Ignore, return null below
    }
    return { profile: null, error: error || 'No profile found' };
  } catch (err) {
    return { profile: null, error: err };
  }
};


const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supabaseLogin = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export const signUpWithEmail = async (email: string, password: string) => {
  try {
    // Check if user already exists in user_profiles table
    const { data: profileData, error: profileError } = await supabaseLogin
      .from('user_profiles')
      .select('id, email')
      .eq('email', email)
      .single();
    if (profileError && profileError.code !== 'PGRST116') throw profileError;
    if (profileData) {
      return { data: null, error: 'User already exists' };
    }
    // Proceed with signup
    const { data, error } = await supabaseLogin.auth.signUp({ email, password });
    if (error) throw error;
    if (data?.user) {
      // Store user in user_profiles table
      await supabaseLogin.from('user_profiles').insert({ id: data.user.id, email });
      await AsyncStorage.setItem('meduser', JSON.stringify(data.user));
    }
    return { data, error: null };
  } catch (error) {
    return { error };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabaseLogin.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await AsyncStorage.setItem('meduser', JSON.stringify(data.user));
    return { data, error: null };
  } catch (error) {
    return { error };
  }
};

export const signOut = async () => {
  try {

    await Promise.all([
      AsyncStorage.removeItem('meduser'),
      AsyncStorage.removeItem('onboarding_status_'),
    ]);
    const { error } = await supabaseLogin.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const checkUserSession = async () => {
  // First, check AsyncStorage
  const userJson = await AsyncStorage.getItem('meduser');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user && user.id) {
        return { user, source: 'asyncStorage' };
      }
    } catch (e) {
      // If parsing fails, continue to Supabase check
    }
  }
  // If not found, check Supabase session
  const { data, error } = await supabaseLogin.auth.getSession();
  if (data?.session?.user) {
    await AsyncStorage.setItem('meduser', JSON.stringify(data.session.user));
    return { user: data.session.user, source: 'supabase' };
  }
  return { user: null, error: error || 'No session found' };
};

export const isUserLoggedIn = async (): Promise<boolean> => {
  // Check AsyncStorage first
  const userJson = await AsyncStorage.getItem('meduser');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user && user.id) {
        return true;
      }
    } catch (e) {
      // If parsing fails, continue to Supabase check
    }
  }
  // If not found, check Supabase session
  const { data } = await supabaseLogin.auth.getSession();
  if (data?.session?.user && data.session.user.id) {
    await AsyncStorage.setItem('meduser', JSON.stringify(data.session.user));
    return true;
  }
  return false;
};


export const setOnboardingComplete = async (userId: string, onboardingData: Record<string, any>) => {
  // Merge isOnboarding: true with onboardingData
  const updateData = { ...onboardingData, isOnboarding: true };
  const { error } = await supabaseLogin
    .from('user_profiles')
    .update(updateData)
    .eq('id', userId);
        console.log("🚀 ~ setOnboardingComplete ~ error:", error)

  if (!error) {
    // Store onboarding status in AsyncStorage for fast access
    await AsyncStorage.setItem('onboarding_status_' + userId, JSON.stringify(true));
    // Optionally, store onboarding data locally as well
    await AsyncStorage.setItem('onboarding_data_' + userId, JSON.stringify(onboardingData));
  }
  return { error };
};


export const deleteAccount = async (userId: string) => {
  let errorMsg = null;
  try {
    // Delete from user_profiles table
    const { error: profileError } = await supabaseLogin
      .from('user_profiles')
      .delete()
      .eq('id', userId);
    if (profileError) errorMsg = profileError.message;

    // Delete from authentication table
    const { error: authError } = await supabaseLogin.auth.admin.deleteUser(userId);
    if (authError) errorMsg = authError.message;

    // Sign out
    await supabaseLogin.auth.signOut();

    // Remove all relevant AsyncStorage data
    await Promise.all([
      AsyncStorage.removeItem('meduser'),
      AsyncStorage.removeItem('session'),
      AsyncStorage.removeItem('@PillReminder_OnboardingComplete'),
      AsyncStorage.removeItem('@PillReminder_OnboardingStatus'),
      AsyncStorage.removeItem('onboarding_status_' + userId),
    ]);

    return { success: !errorMsg, error: errorMsg };
  } catch (error) {
    return { success: false, error: error || 'Unknown error' };
  }
};

export const getCurrentUserId = async (): Promise<string | null> => {
  // Try AsyncStorage first
  const userJson = await AsyncStorage.getItem('meduser');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user && user.id) return user.id;
    } catch {}
  }
  // Fallback to Supabase session
  const { data } = await supabaseLogin.auth.getSession();
  if (data?.session?.user?.id) {
    await AsyncStorage.setItem('meduser', JSON.stringify(data.session.user));
    return data.session.user.id;
  }
  return null;
};
