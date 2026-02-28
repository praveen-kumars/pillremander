import { ThemedText } from "@/components/ThemedText";
import { AppColors } from "@/constants/AppColors";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TAB_BAR_HEIGHT = 70;
const TAB_BAR_WIDTH = SCREEN_WIDTH * 0.9;
const SPIRAL_RADIUS = 80;

interface SpiralTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export default function SpiralTabBar({
  state,
  descriptors,
  navigation,
}: SpiralTabBarProps) {
  const spiralAnimation = useRef(new Animated.Value(0)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Continuous spiral rotation
    const spiralLoop = Animated.loop(
      Animated.timing(spiralAnimation, {
        toValue: 1,
        duration: 15000,
        useNativeDriver: true,
      })
    );

    // Glow effect
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    // Pulse effect for active tab
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    spiralLoop.start();
    glowLoop.start();
    pulseLoop.start();

    return () => {
      spiralLoop.stop();
      glowLoop.stop();
      pulseLoop.stop();
    };
  }, [spiralAnimation, glowAnimation, pulseAnimation]);

  const getTabPosition = (index: number, total: number) => {
    // Create a horizontal row arrangement for tabs
    const tabWidth = 60;
    const totalWidth = total * tabWidth;
    const startX = -totalWidth / 2 + tabWidth / 2;
    const x = startX + index * tabWidth;
    const y = 0; // Keep all tabs at the same vertical level

    return { x, y };
  };

  const getSpiralDecorationPosition = (index: number) => {
    const totalDecorations = 12; // More decorations for better spiral
    const angle = (index / totalDecorations) * 2 * Math.PI;
    const radius = SPIRAL_RADIUS + (index % 3) * 15; // Varying radius for spiral effect
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  const renderSpiralDecorations = () => {
    return Array.from({ length: 12 }, (_, index) => {
      const position = getSpiralDecorationPosition(index);
      const rotation = spiralAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
      });

      const scale = glowAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 1.5],
      });

      const opacity = glowAnimation.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.3, 0.8, 0.3],
      });

      return (
        <Animated.View
          key={index}
          style={[
            styles.spiralDecoration,
            {
              left: TAB_BAR_WIDTH / 2 + position.x - 3,
              top: TAB_BAR_HEIGHT / 2 + position.y - 3,
              transform: [{ rotate: rotation }, { scale }],
              opacity,
            },
          ]}
        >
          <LinearGradient
            colors={[
              AppColors.primary,
              AppColors.primaryLight,
              AppColors.secondary,
            ]}
            style={styles.decorationGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
      );
    });
  };

  return (
    <View style={styles.container}>
      {/* Floating rounded tab bar */}
      <View style={styles.floatingTabBar}>
        {/* Background with blur effect */}
        {Platform.OS === "ios" ? (
          <BlurView
            tint="systemUltraThinMaterialLight"
            intensity={100}
            style={styles.blurBackground}
          />
        ) : (
          <View style={styles.androidBackground} />
        )}

        {/* Gradient overlay */}
        <LinearGradient
          colors={[
            "rgba(255, 255, 255, 0.95)",
            "rgba(255, 255, 255, 0.8)",
            `rgba(128, 90, 213, 0.15)`,
          ]}
          style={styles.gradientOverlay}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Spiral decorations */}
        {renderSpiralDecorations()}

        {/* Central spiral design */}
        <View style={styles.centralSpiral}>
          <Animated.View
            style={[
              styles.spiralRing,
              {
                transform: [
                  {
                    rotate: spiralAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={["#805AD5", "transparent", "#9F7AEA"]}
              style={styles.spiralRingGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.spiralRingInner,
              {
                transform: [
                  {
                    rotate: spiralAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["360deg", "0deg"],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={["#4299E1", "transparent", "#805AD5"]}
              style={styles.spiralRingGradient}
              start={{ x: 1, y: 1 }}
              end={{ x: 0, y: 0 }}
            />
          </Animated.View>
        </View>

        {/* Tab buttons */}
        <View style={styles.tabContainer}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const position = getTabPosition(index, state.routes.length);

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

            const tabScale = isFocused ? pulseAnimation : new Animated.Value(1);
            const iconColor = isFocused ? "#FFFFFF" : "#4B5563";
            const textColor = isFocused ? "#FFFFFF" : "#9CA3AF";

            return (
              <Animated.View
                key={route.key}
                style={[
                  styles.tabButton,
                  {
                    left: TAB_BAR_WIDTH / 2 + position.x - 30,
                    top: TAB_BAR_HEIGHT / 2 + position.y - 25,
                    transform: [{ scale: tabScale }],
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={onPress}
                  style={[
                    styles.tabTouchable,
                    isFocused && styles.activeTabTouchable,
                    !isFocused && {
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.2)",
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={
                      isFocused
                        ? ["#805AD5", "#9F7AEA", "#B794F6"]
                        : ["transparent", "transparent"]
                    }
                    style={styles.tabGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.tabContent}>
                      {options.tabBarIcon && (
                        <View style={styles.iconContainer}>
                          {options.tabBarIcon({
                            color: iconColor,
                            size: isFocused ? 24 : 18,
                          })}
                        </View>
                      )}
                      <ThemedText
                        style={[
                          styles.tabLabel,
                          {
                            color: textColor,
                            fontWeight: isFocused ? "bold" : "500",
                            fontSize: isFocused ? 10 : 8,
                          },
                        ]}
                      >
                        {options.title}
                      </ThemedText>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
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
    bottom: 20,
    left: (SCREEN_WIDTH - TAB_BAR_WIDTH) / 2,
    width: TAB_BAR_WIDTH,
    height: TAB_BAR_HEIGHT + 40,
    justifyContent: "flex-end",
  },
  floatingTabBar: {
    width: TAB_BAR_WIDTH,
    height: TAB_BAR_HEIGHT,
    borderRadius: 35,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 35,
  },
  androidBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 35,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 35,
  },
  centralSpiral: {
    position: "absolute",
    left: TAB_BAR_WIDTH / 2 - SPIRAL_RADIUS / 2,
    top: TAB_BAR_HEIGHT / 2 - SPIRAL_RADIUS / 2,
    width: SPIRAL_RADIUS,
    height: SPIRAL_RADIUS,
    justifyContent: "center",
    alignItems: "center",
  },
  spiralRing: {
    position: "absolute",
    width: SPIRAL_RADIUS * 0.6,
    height: SPIRAL_RADIUS * 0.6,
    borderRadius: SPIRAL_RADIUS * 0.3,
    borderWidth: 2,
    borderColor: "transparent",
  },
  spiralRingInner: {
    position: "absolute",
    width: SPIRAL_RADIUS * 0.4,
    height: SPIRAL_RADIUS * 0.4,
    borderRadius: SPIRAL_RADIUS * 0.2,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  spiralRingGradient: {
    flex: 1,
    borderRadius: SPIRAL_RADIUS * 0.3,
  },
  spiralDecoration: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  decorationGradient: {
    flex: 1,
    borderRadius: 3,
  },
  tabContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  tabButton: {
    position: "absolute",
    width: 58,
    height: 52,
  },
  tabTouchable: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  activeTabTouchable: {
    shadowColor: "#805AD5",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
    backgroundColor: "transparent",
  },
  tabGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 26,
    paddingVertical: 7,
    paddingHorizontal: 3,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    marginBottom: 2,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 24,
  },
  tabLabel: {
    textAlign: "center",
    fontWeight: "500",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
