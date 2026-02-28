import { ThemedText } from "@/components/ThemedText";
import { AppColors } from "@/constants/AppColors";
import { getGeminiChatResponse } from "@/lib/gemini";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Chip } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: "text" | "suggestion" | "warning";
}

export default function AIAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I'm your AI medication assistant. I can help you with questions about your medications, side effects, drug interactions, and general health guidance. What would you like to know?",
      isUser: false,
      timestamp: new Date(),
      type: "text",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const quickQuestions = [
    { id: "1", text: "Can I take this with food?", icon: "restaurant" },
    { id: "2", text: "What if I miss a dose?", icon: "time" },
    { id: "3", text: "Are these side effects normal?", icon: "warning" },
    { id: "4", text: "Drug interactions check", icon: "alert-circle" },
    {
      id: "5",
      text: "How does this medication work?",
      icon: "information-circle",
    },
    { id: "6", text: "When should I take this?", icon: "clock" },
  ];

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    try {
      const aiText = await getGeminiChatResponse(text.trim());
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiText,
        isUser: false,
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          text: "There was an error connecting to the AI service.",
          isUser: false,
          timestamp: new Date(),
          type: "warning",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Gemini API handles AI response, so getAIResponse is removed.

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
      ]}
    >
      {!item.isUser && (
        <View style={styles.aiAvatar}>
          <Ionicons name="medical" size={20} color={AppColors.white} />
        </View>
      )}

      <View
        style={[
          styles.messageBubble,
          item.isUser ? styles.userMessage : styles.aiMessage,
          item.type === "warning" && styles.warningMessage,
          item.type === "suggestion" && styles.suggestionMessage,
        ]}
      >
        <ThemedText
          style={[
            styles.messageText,
            item.isUser ? styles.userMessageText : styles.aiMessageText,
          ]}
        >
          {item.text}
        </ThemedText>
        <ThemedText
          style={[
            styles.timestamp,
            item.isUser ? styles.userTimestamp : styles.aiTimestamp,
          ]}
        >
          {item.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </ThemedText>
      </View>

      {item.isUser && (
        <View style={styles.userAvatar}>
          <Ionicons name="person" size={20} color={AppColors.white} />
        </View>
      )}
    </View>
  );

  const renderTypingIndicator = () => (
    <View style={styles.typingContainer}>
      <View style={styles.aiAvatar}>
        <Ionicons name="medical" size={20} color={AppColors.white} />
      </View>
      <View style={styles.typingBubble}>
        <View style={styles.typingDots}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={[AppColors.primary, AppColors.primaryLight, AppColors.background]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <Ionicons name="medical" size={24} color={AppColors.white} />
            </View>
            <View>
              <ThemedText style={styles.headerTitle}>AI Assistant</ThemedText>
              <ThemedText style={styles.headerSubtitle}>
                Your medication guide
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Quick Questions */}
        <View style={styles.quickQuestionsContainer}>
          <FlatList
            horizontal
            data={quickQuestions}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Chip
                icon={item.icon}
                onPress={() => handleQuickQuestion(item.text)}
                style={styles.quickQuestionChip}
                textStyle={styles.quickQuestionText}
              >
                {item.text}
              </Chip>
            )}
            contentContainerStyle={styles.quickQuestionsList}
          />
        </View>

        {/* Chat Messages */}
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={isTyping ? renderTypingIndicator : null}
          />

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask about medications, side effects, interactions..."
                placeholderTextColor={AppColors.textLight}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  inputText.trim()
                    ? styles.sendButtonActive
                    : styles.sendButtonInactive,
                ]}
                onPress={() => sendMessage(inputText)}
                disabled={!inputText.trim() || isTyping}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={
                    inputText.trim() ? AppColors.white : AppColors.textLight
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={AppColors.textLight}
          />
          <ThemedText style={styles.disclaimerText}>
            This AI provides general information only. Always consult healthcare
            professionals for medical advice.
          </ThemedText>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 15,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.white,
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
  },
  quickQuestionsContainer: {
    paddingBottom: 15,
  },
  quickQuestionsList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  quickQuestionChip: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    marginRight: 10,
  },
  quickQuestionText: {
    color: AppColors.primary,
    fontSize: 12,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: AppColors.white,
    marginHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: 15,
    alignItems: "flex-end",
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  aiMessageContainer: {
    justifyContent: "flex-start",
  },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AppColors.success,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  messageBubble: {
    maxWidth: "88%",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
  },
  userMessage: {
    backgroundColor: AppColors.primary,
    borderBottomRightRadius: 5,
  },
  aiMessage: {
    backgroundColor: AppColors.gray100,
    borderBottomLeftRadius: 5,
  },
  warningMessage: {
    backgroundColor: `${AppColors.warning}20`,
    borderLeftWidth: 3,
    borderLeftColor: AppColors.warning,
  },
  suggestionMessage: {
    backgroundColor: `${AppColors.success}20`,
    borderLeftWidth: 3,
    borderLeftColor: AppColors.success,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  userMessageText: {
    color: AppColors.white,
  },
  aiMessageText: {
    color: AppColors.textPrimary,
  },
  timestamp: {
    fontSize: 11,
    opacity: 0.7,
  },
  userTimestamp: {
    color: AppColors.white,
    textAlign: "right",
  },
  aiTimestamp: {
    color: AppColors.textSecondary,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 15,
  },
  typingBubble: {
    backgroundColor: AppColors.gray100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 5,
  },
  typingDots: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppColors.textSecondary,
    marginHorizontal: 2,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingBottom: 20, // Reduced padding for floating tab bar
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: AppColors.gray50,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: AppColors.textPrimary,
    maxHeight: 100,
    paddingVertical: 5,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  sendButtonActive: {
    backgroundColor: AppColors.primary,
  },
  sendButtonInactive: {
    backgroundColor: AppColors.gray200,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 24, // Ensures disclaimer is above floating tab bar
  },
  disclaimerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    color: AppColors.textLight,
    lineHeight: 14,
  },
});
