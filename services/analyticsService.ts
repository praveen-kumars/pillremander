/**
 * Analytics Service
 * Provides real medication analytics data from database
 */

import { getTodayDateString } from '../utils/dateUtils';
import { globalDatabaseManager } from './globalDatabaseManager';

export interface AnalyticsData {
  total: number;
  taken: number;
  skipped: number;
  missed: number;
  pending: number;
  adherenceRate: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  streakDates: string[];
}

export interface MedicationLogData {
  date: string;
  medicationId: number;
  medicationName: string;
  status: 'taken' | 'skipped' | 'missed' | 'pending';
  scheduledTime: string;
  actualTime?: string;
}

class AnalyticsService {
  private readonly currentUserId: number = 1; // For single-user app

  // Get health logs database
  private getHealthLogsDb() {
    const db = globalDatabaseManager.getHealthLogsDb();
    if (!db) {
      throw new Error('Health logs database not initialized');
    }
    return db;
  }

  // Get medications database
  private getMedicationsDb() {
    const db = globalDatabaseManager.getMedicationsDb();
    if (!db) {
      throw new Error('Medications database not initialized');
    }
    return db;
  }

  /**
   * Get analytics data for a specific date range
   */
  async getAnalyticsForDateRange(startDate: string, endDate: string): Promise<AnalyticsData> {
    try {
      const logsDb = this.getHealthLogsDb();
      const medsDb = this.getMedicationsDb();
      
      // Get all scheduled medications in the date range (only active medications)
      // NOTE: We filter by isActive = 1 to exclude deleted medications.
      // When medications are "deleted", they're marked as isActive = 0 instead of being
      // physically removed from the database. This preserves historical data while
      // ensuring deleted medications don't appear in current analytics calculations.
      const scheduledMeds = await medsDb.getAllAsync(`
        SELECT 
          m.id as medicationId,
          m.name as medicationName,
          s.timeSlot,
          m.startDate,
          m.endDate,
          s.frequency,
          s.daysOfWeek
        FROM medications m
        INNER JOIN medication_schedules s ON m.id = s.medicationId
        WHERE m.userId = ? 
        AND m.isActive = 1
        AND m.startDate <= ?
        AND (m.endDate IS NULL OR m.endDate = '' OR m.endDate >= ?)
      `, [this.currentUserId, endDate, startDate]);

      // Get all logs in the date range (including logs from deleted medications)
      const logs = await logsDb.getAllAsync(`
        SELECT 
          medicationId,
          medicationName,
          status,
          scheduledTime,
          actualTime
        FROM medication_logs
        WHERE userId = ? 
        AND date(scheduledTime) BETWEEN ? AND ?
        ORDER BY scheduledTime DESC
      `, [this.currentUserId, startDate, endDate]);

      // Calculate expected medications for each date in range
      let totalExpected = 0;
      const dateRange = this.getDateRange(startDate, endDate);
      
      for (const date of dateRange) {
        for (const med of scheduledMeds) {
          if (this.shouldMedicationShowOnDate(med, date)) {
            totalExpected++;
          }
        }
      }

      // Count actual statuses from logs
      const logMap = new Map<string, string>();
      logs.forEach((log: any) => {
        const key = `${log.medicationId}-${log.scheduledTime.split(' ')[0]}`;
        if (!logMap.has(key)) {
          logMap.set(key, log.status);
        }
      });

      const taken = Array.from(logMap.values()).filter(status => status === 'taken').length;
      const skipped = Array.from(logMap.values()).filter(status => status === 'skipped').length;
      
      // Calculate missed and pending with proper logic
      const today = getTodayDateString();
      const { missed, pending } = this.calculateMissedAndPending(scheduledMeds, logMap, dateRange, today);

      const adherenceRate = totalExpected > 0 ? Math.round((taken / totalExpected) * 100) : 0;

      return {
        total: totalExpected,
        taken,
        skipped,
        missed,
        pending,
        adherenceRate
      };
    } catch {
      return {
        total: 0,
        taken: 0,
        skipped: 0,
        missed: 0,
        pending: 0,
        adherenceRate: 0
      };
    }
  }

  /**
   * Get today's analytics
   */
  async getTodayAnalytics(): Promise<AnalyticsData> {
    const today = getTodayDateString();
    return this.getAnalyticsForDateRange(today, today);
  }

  /**
   * Get this week's analytics (last 7 days)
   */
  async getWeekAnalytics(): Promise<AnalyticsData> {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 6);
    
    const startDate = weekAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    
    return this.getAnalyticsForDateRange(startDate, endDate);
  }

  /**
   * Get this month's analytics (last 30 days)
   */
  async getMonthAnalytics(): Promise<AnalyticsData> {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 29);
    
    const startDate = monthAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    
    return this.getAnalyticsForDateRange(startDate, endDate);
  }

  /**
   * Calculate streak data (consecutive days with 100% adherence)
   */
  async getStreakData(): Promise<StreakData> {
    try {
      const today = new Date();
      const monthAgo = new Date(today);
      monthAgo.setDate(today.getDate() - 30);
      
      const startDate = monthAgo.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];
      
      // Get daily adherence for the last 30 days
      const dateRange = this.getDateRange(startDate, endDate);
      const dailyAdherence: { [date: string]: boolean } = {};
      
      for (const date of dateRange) {
        const dayData = await this.getAnalyticsForDateRange(date, date);
        // Perfect day = all medications taken (no skipped, missed, or pending)
        dailyAdherence[date] = dayData.total > 0 && dayData.taken === dayData.total;
      }
      
      // Calculate current streak (working backwards from today)
      let currentStreak = 0;
      const reversedDates = [...dateRange].reverse();
      
      for (const date of reversedDates) {
        if (dailyAdherence[date]) {
          currentStreak++;
        } else {
          break;
        }
      }
      
      // Calculate longest streak in the period
      let longestStreak = 0;
      let tempStreak = 0;
      
      for (const date of dateRange) {
        if (dailyAdherence[date]) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }
      
      // Get dates of current streak
      const streakDates = reversedDates.slice(0, currentStreak).reverse();
      
      return {
        currentStreak,
        longestStreak,
        streakDates
      };
    } catch {
      return {
        currentStreak: 0,
        longestStreak: 0,
        streakDates: []
      };
    }
  }

  /**
   * Get detailed medication logs for a date range
   */
  async getMedicationLogs(startDate: string, endDate: string): Promise<MedicationLogData[]> {
    try {
      const db = this.getHealthLogsDb();
      
      const logs = await db.getAllAsync(`
        SELECT 
          date(scheduledTime) as date,
          medicationId,
          medicationName,
          status,
          scheduledTime,
          actualTime
        FROM medication_logs
        WHERE userId = ? 
        AND date(scheduledTime) BETWEEN ? AND ?
        ORDER BY scheduledTime DESC
      `, [this.currentUserId, startDate, endDate]);

      return logs.map((log: any) => ({
        date: log.date,
        medicationId: log.medicationId,
        medicationName: log.medicationName,
        status: log.status,
        scheduledTime: log.scheduledTime,
        actualTime: log.actualTime
      }));
    } catch {
      return [];
    }
  }

  // Helper methods
  private getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    
    return dates;
  }

  private shouldMedicationShowOnDate(med: any, date: string): boolean {
    // Check if medication is active on this date
    if (date < med.startDate) return false;
    if (med.endDate && med.endDate !== '' && date > med.endDate) return false;
    
    // Check frequency
    if (med.frequency === 'daily') return true;
    if (med.frequency === 'as_needed') return false;
    
    if (med.frequency === 'date_range' || med.frequency === 'weekly') {
      if (!med.daysOfWeek) return true;
      
      try {
        const selectedDays = JSON.parse(med.daysOfWeek);
        const dayOfWeek = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
        
        // Handle both day names and indices
        if (selectedDays.length > 0) {
          if (typeof selectedDays[0] === 'string') {
            return selectedDays.includes(dayOfWeek);
          } else if (typeof selectedDays[0] === 'number') {
            const dayIndex = new Date(date + 'T00:00:00').getDay();
            return selectedDays.includes(dayIndex);
          }
        }
      } catch {
        return true;
      }
    }
    
    return false;
  }

  private getPendingCount(dateRange: string[], today: string): number {
    // Only today and future dates can have pending medications
    return dateRange.filter(date => date >= today).length;
  }

  /**
   * Calculate missed and pending medications with proper logic
   */
  private calculateMissedAndPending(
    scheduledMeds: any[], 
    logMap: Map<string, string>, 
    dateRange: string[], 
    today: string
  ): { missed: number; pending: number } {
    let missed = 0;
    let pending = 0;

    for (const date of dateRange) {
      for (const med of scheduledMeds) {
        if (this.shouldMedicationShowOnDate(med, date)) {
          const key = `${med.medicationId}-${date}`;
          const logStatus = logMap.get(key);

          if (!logStatus) {
            // No log entry for this medication on this date
            if (date < today) {
              // Past date without log = missed
              missed++;
            } else if (date === today) {
              // Today without log = check if time has passed
              const medicationTime = med.timeSlot;
              const now = new Date();
              const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
              
              if (medicationTime <= currentTime) {
                // Time has passed, should be considered missed
                missed++;
              } else {
                // Still pending for today
                pending++;
              }
            } else {
              // Future date = pending
              pending++;
            }
          }
          // If there's a log entry, it's already counted in taken/skipped
        }
      }
    }

    return { missed, pending };
  }
}

export const analyticsService = new AnalyticsService();
