/**
 * Debug script to test auth flow step by step
 */

import { authService } from '../services/authService';
import { supabase } from '../lib/supabase';

export async function testAuthFlow() {
  console.log("🧪 Starting Auth Flow Test...");
  
  try {
    // Test 1: Basic Supabase connection
    console.log("\n1️⃣ Testing Supabase connection...");
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log("❌ Supabase connection error:", error.message);
    } else {
      console.log("✅ Supabase connection OK. Session:", !!data.session);
    }
    
    // Test 2: AuthService initialization
    console.log("\n2️⃣ Testing AuthService initialization...");
    const authResult = await authService.initialize();
    console.log("Auth Result:", {
      success: authResult.success,
      hasUser: !!authResult.user,
      error: authResult.error,
      requiresOnboarding: authResult.requiresOnboarding
    });
    
    // Test 3: Check current user
    console.log("\n3️⃣ Testing current user...");
    const currentUser = authService.getCurrentUser();
    console.log("Current User:", currentUser ? {
      email: currentUser.email,
      isOnboardingComplete: currentUser.isOnboardingComplete
    } : null);
    
    console.log("\n✅ Auth Flow Test Complete!");
    
  } catch (error) {
    console.error("\n❌ Auth Flow Test Failed:", error);
  }
}
