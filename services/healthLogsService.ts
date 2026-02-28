import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// Interfaces for health logging
export interface MedicationLog {
  id?: number;
  userId?: number;
  medicationId: number;
  medicationName: string;
  dosage: string;
  scheduledTime: string; // ISO string format
  actualTime?: string; // When they actually took it
  status: 'taken' | 'skipped' | 'missed' | 'rescheduled';
  notes?: string;
  location?: string; // Where they took it
  createdAt?: string;
  updatedAt?: string;
}

export interface SideEffectLog {
  id?: number;
  userId?: number;
  medicationId?: number; // Optional - might be related to specific medication
  medicationName?: string;
  symptom: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  duration?: string; // How long it lasted
  startTime: string; // When side effect started
  endTime?: string; // When it ended (if applicable)
  reportedTime: string; // When user logged it
  actionTaken?: string; // What they did about it
  contactedDoctor: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyHealthSummary {
  id?: number;
  userId?: number;
  date: string; // YYYY-MM-DD format
  totalMedications: number;
  medicationsTaken: number;
  medicationsSkipped: number;
  medicationsMissed: number;
  sideEffectsReported: number;
  overallMood?: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicationReminder {
  id?: number;
  userId?: number;
  medicationId: number;
  medicationName: string;
  dosage: string;
  frequency: string; // "daily", "twice daily", "as needed", etc.
  times: string; // JSON array of times ["08:00", "20:00"]
  startDate: string;
  endDate?: string;
  isActive: boolean;
  reminderEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

class HealthLogsService {
  private db: SQLite.SQLiteDatabase | null = null;
  private currentUserId: number = 1; // For single-user app

  async initializeDatabase(): Promise<void> {
    try {
      // Use global database manager for consistent initialization
      const { globalDatabaseManager } = await import('./globalDatabaseManager');
      
      // Wait for global database manager to initialize all databases
      await globalDatabaseManager.initialize();
      
      // Get the health logs database from global manager
      this.db = globalDatabaseManager.getHealthLogsDb();
      
      if (!this.db) {
        throw new Error('Failed to get health logs database from global manager');
      }
      
    } catch (error) {
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Ultra-simplified table schemas for maximum Android compatibility
    const tables = [
      // Medication Logs Table - Simplified
      {
        name: 'medication_logs',
        query: `CREATE TABLE IF NOT EXISTS medication_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          medicationId INTEGER NOT NULL,
          medicationName TEXT NOT NULL,
          dosage TEXT NOT NULL,
          scheduledTime TEXT NOT NULL,
          actualTime TEXT,
          status TEXT NOT NULL,
          notes TEXT,
          location TEXT,
          createdAt TEXT,
          updatedAt TEXT
        )`
      },

      // Side Effects Logs Table - Simplified
      {
        name: 'side_effect_logs', 
        query: `CREATE TABLE IF NOT EXISTS side_effect_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          medicationId INTEGER,
          medicationName TEXT,
          symptom TEXT NOT NULL,
          severity TEXT NOT NULL,
          description TEXT NOT NULL,
          duration TEXT,
          startTime TEXT NOT NULL,
          endTime TEXT,
          reportedTime TEXT NOT NULL,
          actionTaken TEXT,
          contactedDoctor INTEGER,
          createdAt TEXT,
          updatedAt TEXT
        )`
      },

      // Daily Health Summary Table - Simplified
      {
        name: 'daily_health_summaries',
        query: `CREATE TABLE IF NOT EXISTS daily_health_summaries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          date TEXT NOT NULL,
          totalMedications INTEGER,
          medicationsTaken INTEGER,
          medicationsSkipped INTEGER,
          medicationsMissed INTEGER,
          sideEffectsReported INTEGER,
          overallMood TEXT,
          notes TEXT,
          createdAt TEXT,
          updatedAt TEXT
        )`
      },

      // Medication Reminders Table - Simplified
      {
        name: 'medication_reminders',
        query: `CREATE TABLE IF NOT EXISTS medication_reminders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          medicationId INTEGER NOT NULL,
          medicationName TEXT NOT NULL,
          dosage TEXT NOT NULL,
          frequency TEXT NOT NULL,
          times TEXT NOT NULL,
          startDate TEXT NOT NULL,
          endDate TEXT,
          isActive INTEGER,
          reminderEnabled INTEGER,
          soundEnabled INTEGER,
          vibrationEnabled INTEGER,
          createdAt TEXT,
          updatedAt TEXT
        )`
      }
    ];

    // Create tables sequentially with individual error handling
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      try {
        await this.db.execAsync(table.query);
        
        // Android-specific delay between operations
        if (Platform.OS === 'android') {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      } catch (error) {
        throw new Error(`Table creation failed for 'pillRemainderLogs.db': ${error}`);
      }
    }

    // Skip indexes for now to avoid additional complexity on Android
  }

  // MEDICATION LOGGING METHODS
  async logMedicationTaken(log: Omit<MedicationLog, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      const now = new Date().toISOString();
      await this.db.runAsync(`
        INSERT INTO medication_logs (userId, medicationId, medicationName, dosage, scheduledTime, actualTime, status, notes, location, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        this.currentUserId,
        log.medicationId,
        log.medicationName,
        log.dosage,
        log.scheduledTime,
        log.actualTime || now,
        log.status,
        log.notes || '',
        log.location || '',
        now,
        now
      ]);

      // Update daily summary
      await this.updateDailySummary(log.scheduledTime.split('T')[0]);
    } catch (error) {
      throw error;
    }
  }

  async updateMedicationStatus(
    medicationId: number, 
    scheduledTime: string, 
    newStatus: 'taken' | 'skipped', 
    notes?: string
  ): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      // Update the existing log
      await this.db.runAsync(`
        UPDATE medication_logs 
        SET status = ?, actualTime = ?, notes = ?, updatedAt = ?
        WHERE userId = ? AND medicationId = ? AND scheduledTime = ?
      `, [
        newStatus,
        new Date().toISOString(),
        notes || `Status changed to ${newStatus}`,
        new Date().toISOString(),
        this.currentUserId,
        medicationId,
        scheduledTime
      ]);

      // Update daily summary
      const date = scheduledTime.split('T')[0];
      await this.updateDailySummary(date);
    } catch (error) {
      throw error;
    }
  }

  async getMedicationLogsForDate(date: string): Promise<MedicationLog[]> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      const results = await this.db.getAllAsync(`
        SELECT * FROM medication_logs 
        WHERE userId = ? AND date(scheduledTime) = ?
        ORDER BY scheduledTime ASC
      `, [this.currentUserId, date]) as MedicationLog[];
      
      return results || [];
    } catch (error) {
      throw error;
    }
  }

  async getMedicationLogsForDateRange(startDate: string, endDate: string): Promise<MedicationLog[]> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      const results = await this.db.getAllAsync(`
        SELECT * FROM medication_logs 
        WHERE userId = ? AND date(scheduledTime) BETWEEN ? AND ?
        ORDER BY scheduledTime ASC
      `, [this.currentUserId, startDate, endDate]) as MedicationLog[];
      
      return results || [];
    } catch (error) {
      throw error;
    }
  }

  // SIDE EFFECTS LOGGING METHODS
  async logSideEffect(sideEffect: Omit<SideEffectLog, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      const now = new Date().toISOString();
      await this.db.runAsync(`
        INSERT INTO side_effect_logs (
          userId, medicationId, medicationName, symptom, severity, description, 
          duration, startTime, endTime, reportedTime, actionTaken, contactedDoctor, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        this.currentUserId,
        sideEffect.medicationId || null,
        sideEffect.medicationName || '',
        sideEffect.symptom,
        sideEffect.severity,
        sideEffect.description,
        sideEffect.duration || '',
        sideEffect.startTime,
        sideEffect.endTime || null,
        sideEffect.reportedTime,
        sideEffect.actionTaken || '',
        sideEffect.contactedDoctor ? 1 : 0,
        now,
        now
      ]);
      // Update daily summary
      const reportDate = sideEffect.reportedTime.split('T')[0];
      await this.updateDailySummary(reportDate);
    } catch (error) {
      throw error;
    }
  }

  async getSideEffectsForDate(date: string): Promise<SideEffectLog[]> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      // Query for the specific date
      const results = await this.db.getAllAsync(`
        SELECT * FROM side_effect_logs 
        WHERE userId = ? AND date(reportedTime) = ?
        ORDER BY reportedTime DESC
      `, [this.currentUserId, date]) as SideEffectLog[];
      
      return results || [];
    } catch (error) {
      throw error;
    }
  }

  async getSideEffectsByMedication(medicationId: number): Promise<SideEffectLog[]> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      const results = await this.db.getAllAsync(`
        SELECT * FROM side_effect_logs 
        WHERE userId = ? AND medicationId = ?
        ORDER BY reportedTime DESC
      `, [this.currentUserId, medicationId]) as SideEffectLog[];
      
      return results || [];
    } catch (error) {
      throw error;
    }
  }

  // DAILY SUMMARY METHODS
  private async updateDailySummary(date: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Get medication stats for the date
      const medStats = await this.db.getFirstAsync(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'taken' THEN 1 END) as taken,
          COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped,
          COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed
        FROM medication_logs 
        WHERE userId = ? AND date(scheduledTime) = ?
      `, [this.currentUserId, date]) as any;

      // Get side effects count for the date
      const sideEffectsCount = await this.db.getFirstAsync(`
        SELECT COUNT(*) as count
        FROM side_effect_logs 
        WHERE userId = ? AND date(reportedTime) = ?
      `, [this.currentUserId, date]) as any;

      // Insert or update daily summary
      const now = new Date().toISOString();
      await this.db.runAsync(`
        INSERT OR REPLACE INTO daily_health_summaries (
          userId, date, totalMedications, medicationsTaken, medicationsSkipped, 
          medicationsMissed, sideEffectsReported, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        this.currentUserId,
        date,
        medStats?.total || 0,
        medStats?.taken || 0,
        medStats?.skipped || 0,
        medStats?.missed || 0,
        sideEffectsCount?.count || 0,
        now,
        now
      ]);
    } catch (error) {
      throw error;
    }
  }

  async getDailySummary(date: string): Promise<DailyHealthSummary | null> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      const result = await this.db.getFirstAsync(`
        SELECT * FROM daily_health_summaries 
        WHERE userId = ? AND date = ?
      `, [this.currentUserId, date]) as DailyHealthSummary | null;
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async getWeeklySummary(startDate: string): Promise<DailyHealthSummary[]> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      const results = await this.db.getAllAsync(`
        SELECT * FROM daily_health_summaries 
        WHERE userId = ? AND date >= ? AND date < date(?, '+7 days')
        ORDER BY date ASC
      `, [this.currentUserId, startDate, startDate]) as DailyHealthSummary[];
      
      return results || [];
    } catch (error) {
      throw error;
    }
  }

  // ANALYTICS METHODS
  async getAdherenceStats(startDate: string, endDate: string): Promise<{
    totalDoses: number;
    takenDoses: number;
    skippedDoses: number;
    missedDoses: number;
    adherencePercentage: number;
  }> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      const stats = await this.db.getFirstAsync(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'taken' THEN 1 END) as taken,
          COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped,
          COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed
        FROM medication_logs 
        WHERE userId = ? AND date(scheduledTime) BETWEEN ? AND ?
      `, [this.currentUserId, startDate, endDate]) as any;

      const total = stats?.total || 0;
      const taken = stats?.taken || 0;
      const adherencePercentage = total > 0 ? Math.round((taken / total) * 100) : 0;

      return {
        totalDoses: total,
        takenDoses: taken,
        skippedDoses: stats?.skipped || 0,
        missedDoses: stats?.missed || 0,
        adherencePercentage
      };
    } catch (error) {
      throw error;
    }
  }

  // UTILITY METHODS
  async exportLogsForDateRange(startDate: string, endDate: string): Promise<{
    medicationLogs: MedicationLog[];
    sideEffects: SideEffectLog[];
    dailySummaries: DailyHealthSummary[];
  }> {
    return {
      medicationLogs: await this.getMedicationLogsForDateRange(startDate, endDate),
      sideEffects: await this.db!.getAllAsync(`
        SELECT * FROM side_effect_logs 
        WHERE userId = ? AND date(reportedTime) BETWEEN ? AND ?
        ORDER BY reportedTime DESC
      `, [this.currentUserId, startDate, endDate]) as SideEffectLog[],
      dailySummaries: await this.db!.getAllAsync(`
        SELECT * FROM daily_health_summaries 
        WHERE userId = ? AND date BETWEEN ? AND ?
        ORDER BY date ASC
      `, [this.currentUserId, startDate, endDate]) as DailyHealthSummary[]
    };
  }

  async deleteAllLogs(): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      const tables = ['medication_logs', 'side_effect_logs', 'daily_health_summaries', 'medication_reminders'];
      
      for (const table of tables) {
        await this.db.runAsync(`DELETE FROM ${table} WHERE userId = ?`, [this.currentUserId]);
      }
    } catch (error) {
      throw error;
    }
  }

  async deleteSideEffect(sideEffectId: string): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      await this.db.runAsync(`
        DELETE FROM side_effect_logs 
        WHERE id = ? AND userId = ?
      `, [sideEffectId, this.currentUserId]);
      
    } catch (error) {
      throw error;
    }
  }

  // Helper method to format date for consistency
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  static formatDateTime(date: Date): string {
    return date.toISOString(); // Full ISO string with time
  }
}

export { HealthLogsService };
export const healthLogsService = new HealthLogsService();
