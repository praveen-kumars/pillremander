import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import { getDaysArray } from '../utils/dateHelpers';

// Configure notification handler globally
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Define notification action categories
const MEDICATION_CATEGORY = 'MEDICATION_REMINDER';

export interface MedicationReminder {
  id: string;
  medicationName: string;
  dosage: string;
  time: string; // HH:MM format
  date: string; // YYYY-MM-DD format
  medicationId: number;
  scheduleId: number;
  frequency?: 'daily' | 'weekly' | 'as_needed'; // Add frequency support
  daysOfWeek?: string[]; // For weekly frequency
  endDate?: string; // When to stop the reminders
}

// Modern functional approach for notification service
export const notificationService = {
  isInitialized: false,

  /**
   * Initialize notification permissions and setup
   */
  async registerForPushNotificationsAsync(): Promise<boolean> {
    try {
      
      if (!Device.isDevice) {
        return false;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('medication-reminders', {
          name: 'Medication Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
        });
        console.log('📱 Android notification channel configured');
      }

      // Set up notification action categories
      await this.setupNotificationActions();

      this.isInitialized = true;
      console.log('✅ Notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
      return false;
    }
  },

  /**
   * Setup notification action buttons
   */
  async setupNotificationActions(): Promise<void> {
    try {
      await Notifications.setNotificationCategoryAsync(MEDICATION_CATEGORY, [
        {
          identifier: 'TAKE_ACTION',
          buttonTitle: 'Mark as Taken',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'SKIP_ACTION', 
          buttonTitle: 'Skip',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);
      console.log('🔘 Notification actions configured successfully');
    } catch (error) {
      console.error('❌ Failed to setup notification actions:', error);
    }
  },

  /**
   * Schedule a medication reminder with proper recurring logic
   */
  async scheduleMedicationReminder(reminder: MedicationReminder): Promise<string | null> {
    try {
      console.log('🔔 Scheduling reminder for:', reminder.medicationName);
      
      if (!this.isInitialized) {
        console.log('⚠️ Service not initialized, initializing now...');
        const initialized = await this.registerForPushNotificationsAsync();
        if (!initialized) {
          console.error('❌ Failed to initialize notification service');
          return null;
        }
      }

      // Check permissions
      const permissionStatus = await this.getPermissionStatus();
      if (permissionStatus !== 'granted') {
        console.error('❌ Notification permissions not granted:', permissionStatus);
        return null;
      }

      // Handle different frequency types
      const frequency = reminder.frequency || 'daily';
      
      if (frequency === 'as_needed') {
        console.log('⏸️ As-needed medication - not scheduling automatic reminders');
        return null;
      }
      
      return await this.scheduleBasedOnFrequency(reminder, frequency);
    } catch (error) {
      console.error('❌ Failed to schedule reminder:', error);
      return null;
    }
  },

  /**
   * Schedule notification based on frequency type
   */
  async scheduleBasedOnFrequency(reminder: MedicationReminder, frequency: 'daily' | 'weekly'): Promise<string | null> {
    const [hours, minutes] = reminder.time.split(':').map(num => parseInt(num, 10));
    
    if (frequency === 'daily') {
      return await this.scheduleDailyReminder(reminder, hours, minutes);
    } else if (frequency === 'weekly') {
      return await this.scheduleWeeklyReminder(reminder, hours, minutes);
    }
    
    return null;
  },

  /**
   * Schedule daily recurring reminder
   */
  async scheduleDailyReminder(reminder: MedicationReminder, hours: number, minutes: number): Promise<string | null> {
    console.log(`📅 Scheduling daily reminder for ${reminder.medicationName} at ${reminder.time}`);

    // Check if the time is in the future today
    const now = new Date();
    const todayAtTime = new Date();
    todayAtTime.setHours(hours, minutes, 0, 0);
    
    const isFutureToday = todayAtTime > now;
    
    let primaryNotificationId: string | null = null;

    if (isFutureToday) {
      // Schedule an immediate notification for today
      console.log(`⏰ Scheduling immediate notification for today at ${reminder.time}`);
      
      primaryNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💊 Time for Your Medication',
          body: `${reminder.medicationName} (${reminder.dosage})`,
          sound: 'default',
          categoryIdentifier: MEDICATION_CATEGORY,
          data: {
            medicationId: reminder.medicationId,
            scheduleId: reminder.scheduleId,
            medicationName: reminder.medicationName,
            dosage: reminder.dosage,
            type: 'medication-reminder',
            reminderTime: reminder.time,
            frequency: 'daily',
            isRecurring: false, // This is the immediate one
          },
        },
        trigger: {
          date: todayAtTime,
          channelId: 'medication-reminders',
        },
      });

      console.log(`✅ Scheduled immediate notification for today with ID: ${primaryNotificationId}`);
    }

    // Always schedule the recurring daily notification for future days
    const recurringNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Time for Your Medication',
        body: `${reminder.medicationName} (${reminder.dosage})`,
        sound: 'default',
        categoryIdentifier: MEDICATION_CATEGORY,
        data: {
          medicationId: reminder.medicationId,
          scheduleId: reminder.scheduleId,
          medicationName: reminder.medicationName,
          dosage: reminder.dosage,
          type: 'medication-reminder',
          reminderTime: reminder.time,
          frequency: 'daily',
          isRecurring: true,
        },
      },
      trigger: {
        hour: hours,
        minute: minutes,
        repeats: true,
        channelId: 'medication-reminders',
      },
    });

    console.log(`✅ Scheduled recurring daily reminder with ID: ${recurringNotificationId}`);
    
    // Return the immediate notification ID if scheduled, otherwise the recurring one
    return primaryNotificationId || recurringNotificationId;
  },

  /**
   * Schedule weekly recurring reminder
   */
  async scheduleWeeklyReminder(reminder: MedicationReminder, hours: number, minutes: number): Promise<string | null> {
    if (!reminder.daysOfWeek || reminder.daysOfWeek.length === 0) {
      console.error('❌ Weekly reminder requires daysOfWeek to be specified');
      return null;
    }

    console.log(`📅 Scheduling weekly reminder for ${reminder.medicationName} on ${reminder.daysOfWeek.join(', ')}`);

    // Map day names to weekday numbers (1=Monday, 7=Sunday)
    const dayToNumber: { [key: string]: number } = {
      'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
      'friday': 5, 'saturday': 6, 'sunday': 7
    };

    const weekdays = reminder.daysOfWeek.map(day => dayToNumber[day.toLowerCase()]).filter(Boolean);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Time for Your Medication',
        body: `${reminder.medicationName} (${reminder.dosage})`,
        sound: 'default',
        categoryIdentifier: MEDICATION_CATEGORY,
        data: {
          medicationId: reminder.medicationId,
          scheduleId: reminder.scheduleId,
          medicationName: reminder.medicationName,
          dosage: reminder.dosage,
          type: 'medication-reminder',
          reminderTime: reminder.time,
          frequency: 'weekly',
          daysOfWeek: reminder.daysOfWeek,
          isRecurring: true,
        },
      },
      trigger: {
        hour: hours,
        minute: minutes,
        weekday: weekdays.length === 1 ? weekdays[0] : undefined, // Single day or multiple days
        repeats: true,
        channelId: 'medication-reminders',
      },
    });

    console.log(`✅ Scheduled weekly reminder for ${reminder.medicationName} with ID: ${notificationId}`);
    return notificationId;
  },

  /**
   * Schedule all medication reminders for today (only future times)
   */
  async scheduleTodayReminders(reminders: MedicationReminder[]): Promise<string[]> {
    const scheduledIds: string[] = [];
    const now = new Date();

    console.log(`🔔 Processing ${reminders.length} potential reminders for today...`);
    console.log(`🕐 Current time: ${now.toLocaleString()}`);

    for (const reminder of reminders) {
      try {
        // Parse the reminder time - ensure it's for today
        const [hours, minutes] = reminder.time.split(':').map(num => parseInt(num, 10));
        const reminderTime = new Date();
        reminderTime.setHours(hours, minutes, 0, 0);

        console.log(`📋 Checking ${reminder.medicationName}: scheduled for ${reminderTime.toLocaleString()}`);

        // Only schedule if the time hasn't passed yet today
        if (reminderTime.getTime() > now.getTime()) {
          console.log(`✅ Scheduling future reminder: ${reminder.medicationName} at ${reminder.time}`);
          
          // Create a proper reminder object with today's date
          const todayReminder = {
            ...reminder,
            date: now.toISOString().split('T')[0] // Ensure it's today's date
          };
          
          const notificationId = await this.scheduleMedicationReminder(todayReminder);
          if (notificationId) {
            scheduledIds.push(notificationId);
          }
        } else {
          console.log(`⏭️ Skipping past reminder: ${reminder.medicationName} at ${reminder.time} (time has passed)`);
        }
      } catch (error) {
        console.error(`❌ Failed to process reminder for ${reminder.medicationName}:`, error);
      }
    }

    console.log(`📅 Successfully scheduled ${scheduledIds.length} medication reminders for today`);
    return scheduledIds;
  },

  /**
   * Cancel a specific notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('❌ Cancelled notification:', notificationId);
    } catch (error) {
      console.error('❌ Failed to cancel notification:', error);
    }
  },

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ Cancelled all scheduled notifications');
    } catch (error) {
      console.error('❌ Failed to cancel all notifications:', error);
    }
  },

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('❌ Failed to get scheduled notifications:', error);
      return [];
    }
  },

  /**
   * Schedules a single, repeating daily notification at a specific time.
   */
  async scheduleDailyNotification(medicationName: string, dosage: string, timeSlot: string): Promise<boolean> {
    console.log(`Scheduling daily notification for ${medicationName} at ${timeSlot}...`);
    
    try {
      if (!this.isInitialized) {
        console.log('⚠️ Service not initialized, initializing now...');
        const initialized = await this.registerForPushNotificationsAsync();
        if (!initialized) {
          console.error('❌ Failed to initialize notification service');
          return false;
        }
      }

      // Parse the time slot (e.g., "09:00")
      const [hours, minutes] = timeSlot.split(':').map(num => parseInt(num, 10));
      console.log("🚀 ~ scheduleDailyNotification ~ minutes:", minutes)
      console.log("🚀 ~ scheduleDailyNotification ~ hours:", hours)

      // Schedule the new daily notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "💊 Time for Your Medication",
          body: `${medicationName} (${dosage}) - Daily reminder`,
          sound: 'default',
          categoryIdentifier: MEDICATION_CATEGORY,
          data: {
            medicationName,
            dosage,
            type: 'medication-reminder-daily',
            reminderTime: timeSlot,
            isRecurring: true,
          },
        },
        trigger: {
          hour: hours,        // Uses 24-hour format
          minute: minutes,    // Minutes past the hour
          repeats: true,      // This is the key that makes it repeat every day
          channelId: 'medication-reminders',
        },
      });

      console.log(`✅ Daily notification scheduled successfully for ${medicationName} at ${timeSlot} with ID: ${notificationId}`);
      Alert.alert("Success!", `Your daily reminder for ${medicationName} has been set for ${timeSlot}.`);
      return true;

    } catch (error) {
      console.error("❌ Error scheduling daily notification:", error);
      Alert.alert("Error", `Could not schedule the daily reminder for ${medicationName}.`);
      return false;
    }
  },

  /**
   * Show an immediate test notification
   */


  /**
   * Schedule a test reminder in 30 seconds
   */


  /**
   * Check notification permissions status
   */
  async getPermissionStatus(): Promise<string> {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  },

  /**
   * Get badge count (iOS)
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  },

  /**
   * Set badge count (iOS)
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  },

  /**
   * Debug function to check current notification status
   */
  async debugNotificationStatus(): Promise<void> {
    try {
      console.log('🐛 === NOTIFICATION DEBUG STATUS ===');
      
      // Check permissions
      const permissions = await Notifications.getPermissionsAsync();
      console.log('🔐 Permission status:', permissions);
      
      // Check scheduled notifications
      const scheduled = await this.getScheduledNotifications();
      console.log('📅 Total scheduled notifications:', scheduled.length);
      
      scheduled.forEach((notification, index) => {
        const data = notification.content.data;
        const trigger = notification.trigger as any;
        
        console.log(`📋 Notification ${index + 1}:`, {
          id: notification.identifier,
          title: notification.content.title,
          body: notification.content.body,
          medicationName: data?.medicationName,
          scheduledFor: trigger?.date ? new Date(trigger.date).toLocaleString() : 'Unknown',
          type: data?.type
        });
      });
      
      // Check if service is initialized
      console.log('⚙️ Service initialized:', this.isInitialized);
      
      // Check device compatibility
      console.log('📱 Is physical device:', Device.isDevice);
      console.log('🤖 Platform:', Platform.OS);
      
      console.log('🐛 === END DEBUG STATUS ===');
    } catch (error) {
      console.error('❌ Failed to debug notification status:', error);
    }
  },

  /**
   * Schedule notifications for a date range
   */
  async scheduleDateRangeNotifications(startDate: Date, endDate: Date, medicationName: string, dosage: string, timeSlot: string): Promise<number> {
    console.log(`Scheduling reminders from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

    const datesToSchedule = getDaysArray(startDate, endDate);
    let successCount = 0;

    for (const date of datesToSchedule) {
      // Parse the time slot (e.g., "10:30")
      const [hours, minutes] = timeSlot.split(':').map(num => parseInt(num, 10));
      
      // Set the exact time for the notification
      const triggerDate = new Date(date);
      triggerDate.setHours(hours);
      triggerDate.setMinutes(minutes);
      triggerDate.setSeconds(0);
            console.log("🚀 ~ scheduleDateRangeNotifications ~ triggerDate:", triggerDate)


      // Skip any dates that are in the past
      if (triggerDate.getTime() < Date.now()) {
        continue;
      }

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "💊 Time for Your Medication",
            body: `${medicationName} (${dosage}) - ${triggerDate.toLocaleDateString()}`,
            sound: 'default',
            categoryIdentifier: MEDICATION_CATEGORY,
            data: {
              medicationName,
              dosage,
              type: 'medication-reminder-range',
              reminderTime: timeSlot,
              reminderDate: triggerDate.toISOString().split('T')[0],
            },
          },
          trigger: {
            date: triggerDate,
            channelId: 'medication-reminders',
          },
        });
        successCount++;
        console.log(`✅ Scheduled reminder for ${medicationName} on ${triggerDate.toLocaleDateString()} at ${timeSlot}`);
      } catch (error) {
        console.error(`❌ Failed to schedule for ${triggerDate.toISOString()}:`, error);
      }
    }

    console.log(`📅 Successfully scheduled ${successCount} reminders for ${medicationName}`);
    
    if (successCount > 0) {
      Alert.alert("Success", `${successCount} reminders have been scheduled for ${medicationName}.`);
    } else {
      Alert.alert("No Reminders Set", "Could not schedule any reminders. The dates may be in the past.");
    }

    return successCount;
  },
};

// Export default for backwards compatibility
export default notificationService;
