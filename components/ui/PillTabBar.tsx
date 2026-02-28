import { AppColors } from "@/constants/AppColors";
import { FontAwesome } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import {
  Dimensions,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TAB_BAR_WIDTH = SCREEN_WIDTH * 0.9;
const TAB_BAR_HEIGHT = 60;

interface PillTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const tabIcons = {
  index: "home",
  medications: "medkit",
  analytics: "bar-chart",
  "ai-assistant": "comments",
  settings: "cog",
};

export default function PillTabBar({
  state,
  descriptors,
  navigation,
}: PillTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { bottom: insets.bottom + 10 }]}>
      <View style={styles.tabBar}>
        {/* Blur background for iOS */}
        {Platform.OS === "ios" ? (
          <>
            <View style={styles.iosBackdrop} />
            <BlurView
              tint="light"
              intensity={85}
              style={styles.blurBackground}
            />
          </>
        ) : (
          <View style={styles.androidBackground} />
        )}

        {/* Tab buttons */}
        <View style={styles.tabContainer}>
          {state.routes.map((route: any, index: number) => {
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const iconName =
              tabIcons[route.name as keyof typeof tabIcons] || "circle";

            return (
              <TouchableOpacity
                key={route.key}
                style={[styles.tabButton, isFocused && styles.activeTabButton]}
                onPress={onPress}
                activeOpacity={0.7}
              >
                <FontAwesome
                  name={iconName as any}
                  size={22}
                  color={isFocused ? AppColors.white : AppColors.textSecondary}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: (SCREEN_WIDTH - TAB_BAR_WIDTH) / 2,
    width: TAB_BAR_WIDTH,
    height: TAB_BAR_HEIGHT + 20,
    justifyContent: "flex-end",
  },
  tabBar: {
    width: TAB_BAR_WIDTH,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2, // Perfect pill shape
    overflow: "hidden",
    shadowColor: AppColors.tabBarShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: AppColors.tabBarBorder,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TAB_BAR_HEIGHT / 2,
  },
  iosBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AppColors.tabBarBackdrop,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: 1,
    borderColor: AppColors.tabBarBorder,
  },
  androidBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AppColors.tabBarBackground,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: 1.5,
    borderColor: AppColors.tabBarBorder,
  },
  tabContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
  tabButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  activeTabButton: {
    backgroundColor: AppColors.primary,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
