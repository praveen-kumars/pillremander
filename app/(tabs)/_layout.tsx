import { FontAwesome } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

import PillTabBar from "@/components/ui/PillTabBar";
import { AppColors } from "@/constants/AppColors";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: AppColors.primary,
        tabBarInactiveTintColor: AppColors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          display: "none", // Hide default tab bar since we're using custom
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome
              name="home"
              size={24}
              color={focused ? AppColors.primary : AppColors.textSecondary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: "Medications",
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome
              name="medkit"
              size={24}
              color={focused ? AppColors.primary : AppColors.textSecondary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome
              name="bar-chart"
              size={24}
              color={focused ? AppColors.primary : AppColors.textSecondary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-assistant"
        options={{
          title: "AI Chat",
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome
              name="comments"
              size={24}
              color={focused ? AppColors.primary : AppColors.textSecondary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome
              name="cog"
              size={24}
              color={focused ? AppColors.primary : AppColors.textSecondary}
            />
          ),
        }}
      />
    </Tabs>
  );
}
