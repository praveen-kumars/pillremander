import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

let supabaseClient: ReturnType<typeof createClient> | null = null;

// Function to get or create the Supabase client
function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseClient;
}

export const supabase = getSupabaseClient();

// User profile interface
export interface UserProfile {
  id: string;
  full_name?: string;
  age?: number;
  phone_number?: string;
  date_of_birth?: string;
  created_at: string;
  updated_at: string;
}

// Profile service functions
export const profileService = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const client = getSupabaseClient();
      
      if (!client) {
        console.error('❌ Supabase client is undefined!');
        return null;
      }

      const { data, error } = await client
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as unknown as UserProfile;
    } catch (error) {
      console.error('Profile fetch error:', error);
      return null;
    }
  },

  async createProfile(profile: Omit<UserProfile, 'created_at' | 'updated_at'>): Promise<UserProfile | null> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('user_profiles')
        .insert([profile])
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return null;
      }

      return data as unknown as UserProfile;
    } catch (error) {
      console.error('Profile creation error:', error);
      return null;
    }
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return null;
      }

      return data as unknown as UserProfile;
    } catch (error) {
      console.error('Profile update error:', error);
      return null;
    }
  },
};
