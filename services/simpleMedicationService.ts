/**
 * Simplified Medication Service
 * Uses global database manager - no more initialization chaos!
 */

import { globalDatabaseManager } from './globalDatabaseManager';

// Type definitions moved from medicationService.ts
export interface Medication {
  id?: number;
  userId?: number;
  name: string;
  dosage: string;
  strength: string;
  form: 'tablet' | 'capsule' | 'liquid' | 'injection' | 'cream' | 'inhaler';
  color?: string;
  shape?: string;
  manufacturer?: string;
  prescribedBy?: string;
  startDate: string;
  endDate?: string;
  instructions: string;
  sideEffects?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicationSchedule {
  id?: number;
  userId?: number;
  medicationId: number;
  timeSlot: string; // "08:00", "12:00", "18:00", etc.
  frequency: 'daily' | 'weekly' | 'as_needed';
  daysOfWeek?: string; // JSON array ["monday", "tuesday", ...] for weekly
  isActive: boolean;
  reminderEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

class SimpleMedicationService {
  private readonly currentUserId: number = 1; // For single-user app

  // Get database instance (throws if not initialized)
  private getDb() {
    const db = globalDatabaseManager.getMedicationsDb();
    if (!db) {
      throw new Error('Medications database not initialized');
    }
    return db;
  }

  // Get health logs database for medication logging
  private getHealthLogsDb() {
    const db = globalDatabaseManager.getHealthLogsDb();
    if (!db) {
      throw new Error('Health logs database not initialized');
    }
    return db;
  }

  // MEDICATION METHODS
  async getMedications(): Promise<Medication[]> {
    const db = this.getDb();
    
    const results = await db.getAllAsync(`
      SELECT * FROM medications 
      WHERE userId = ? AND isActive = 1
      ORDER BY name ASC
    `, [this.currentUserId]) as Medication[];
    
    return results || [];
  }

  async addMedication(medication: Omit<Medication, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = this.getDb();
    
    const result = await db.runAsync(`
      INSERT INTO medications (
        userId, name, dosage, strength, form, color, shape, manufacturer, 
        prescribedBy, startDate, endDate, instructions, sideEffects, isActive, 
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      this.currentUserId,
      medication.name,
      medication.dosage,
      medication.strength,
      medication.form,
      medication.color || null,
      medication.shape || null,
      medication.manufacturer || null,
      medication.prescribedBy || null,
      medication.startDate,
      medication.endDate || null,
      medication.instructions || '',
      medication.sideEffects || null,
      medication.isActive ? 1 : 0,
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    return result.lastInsertRowId!;
  }

  async updateMedication(id: number, medication: Partial<Omit<Medication, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
    const db = this.getDb();
    const updates: string[] = [];
    const values: any[] = [];

    // Build dynamic update query
    if (medication.name !== undefined) {
      updates.push('name = ?');
      values.push(medication.name);
    }
    if (medication.dosage !== undefined) {
      updates.push('dosage = ?');
      values.push(medication.dosage);
    }
    if (medication.strength !== undefined) {
      updates.push('strength = ?');
      values.push(medication.strength);
    }
    if (medication.form !== undefined) {
      updates.push('form = ?');
      values.push(medication.form);
    }
    if (medication.color !== undefined) {
      updates.push('color = ?');
      values.push(medication.color);
    }
    if (medication.shape !== undefined) {
      updates.push('shape = ?');
      values.push(medication.shape);
    }
    if (medication.manufacturer !== undefined) {
      updates.push('manufacturer = ?');
      values.push(medication.manufacturer);
    }
    if (medication.prescribedBy !== undefined) {
      updates.push('prescribedBy = ?');
      values.push(medication.prescribedBy);
    }
    if (medication.startDate !== undefined) {
      updates.push('startDate = ?');
      values.push(medication.startDate);
    }
    if (medication.endDate !== undefined) {
      updates.push('endDate = ?');
      values.push(medication.endDate);
    }
    if (medication.instructions !== undefined) {
      updates.push('instructions = ?');
      values.push(medication.instructions);
    }
    if (medication.sideEffects !== undefined) {
      updates.push('sideEffects = ?');
      values.push(medication.sideEffects);
    }
    if (medication.isActive !== undefined) {
      updates.push('isActive = ?');
      values.push(medication.isActive ? 1 : 0);
    }

    updates.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id, this.currentUserId);

    await db.runAsync(`
      UPDATE medications 
      SET ${updates.join(', ')}
      WHERE id = ? AND userId = ?
    `, values);
  }

  async deleteMedication(id: number): Promise<void> {
    const { globalDatabaseManager } = await import('./globalDatabaseManager');
    
    // Use global database lock to prevent concurrent operations
    await globalDatabaseManager.withLock('medications', async () => {
      const db = this.getDb();

      try {
        // Use transaction for soft deletion (preserve logs)
        await db.withTransactionAsync(async () => {
          // Soft delete schedules (set isActive = 0 instead of DELETE)
          await db.runAsync(`
            UPDATE medication_schedules 
            SET isActive = 0, updatedAt = ?
            WHERE medicationId = ? AND userId = ?
          `, [new Date().toISOString(), id, this.currentUserId]);

          // Soft delete the medication (set isActive = 0 instead of DELETE)
          await db.runAsync(`
            UPDATE medications 
            SET isActive = 0, updatedAt = ?
            WHERE id = ? AND userId = ?
          `, [new Date().toISOString(), id, this.currentUserId]);
        });
      } catch (error) {
        
        // Handle database lock errors specifically
        if (error instanceof Error) {
          if (error.message.includes('database is locked') || 
              error.message.includes('finalizeAsync') ||
              error.message.includes('NativeStatement')) {
            throw new Error('Failed to delete medication due to database conflicts. Please try again.');
          }
        }
        
        throw error;
      }
    });
  }

  // SCHEDULE METHODS
  async saveMedicationSchedule(schedule: Omit<MedicationSchedule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = this.getDb();
    const now = new Date().toISOString();

    const result = await db.runAsync(`
      INSERT INTO medication_schedules (
        userId, medicationId, timeSlot, frequency, daysOfWeek, isActive, reminderEnabled, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      this.currentUserId,
      schedule.medicationId,
      schedule.timeSlot,
      schedule.frequency,
      schedule.daysOfWeek || '',
      schedule.isActive ? 1 : 0,
      schedule.reminderEnabled ? 1 : 0,
      now,
      now
    ]);

    return result.lastInsertRowId;
  }

  async getMedicationSchedules(medicationId: number): Promise<MedicationSchedule[]> {
    const db = this.getDb();

    const results = await db.getAllAsync(`
      SELECT * FROM medication_schedules 
      WHERE medicationId = ? AND userId = ? AND isActive = 1
      ORDER BY timeSlot ASC
    `, [medicationId, this.currentUserId]) as MedicationSchedule[];
    
    return results || [];
  }

  async updateMedicationSchedule(id: number, schedule: Partial<Omit<MedicationSchedule, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
    const db = this.getDb();
    const updates: string[] = [];
    const values: any[] = [];

    if (schedule.timeSlot !== undefined) {
      updates.push('timeSlot = ?');
      values.push(schedule.timeSlot);
    }
    if (schedule.frequency !== undefined) {
      updates.push('frequency = ?');
      values.push(schedule.frequency);
    }
    if (schedule.daysOfWeek !== undefined) {
      updates.push('daysOfWeek = ?');
      values.push(schedule.daysOfWeek);
    }
    if (schedule.isActive !== undefined) {
      updates.push('isActive = ?');
      values.push(schedule.isActive ? 1 : 0);
    }
    if (schedule.reminderEnabled !== undefined) {
      updates.push('reminderEnabled = ?');
      values.push(schedule.reminderEnabled ? 1 : 0);
    }

    updates.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id, this.currentUserId);

    await db.runAsync(`
      UPDATE medication_schedules 
      SET ${updates.join(', ')}
      WHERE id = ? AND userId = ?
    `, values);
  }

  // Simplified daily medications method for home screen compatibility
  async getDailyMedications(date: string): Promise<any[]> {
    const db = this.getDb();
    
    // Query to get medications with schedules for the specific date
    const results = await db.getAllAsync(`
      SELECT 
        m.id as medicationId,
        m.name as medicationName,
        m.dosage,
        m.strength,
        m.form,
        m.instructions,
        m.startDate,
        m.endDate,
        s.timeSlot,
        s.frequency,
        s.daysOfWeek
      FROM medications m
      INNER JOIN medication_schedules s ON m.id = s.medicationId
      WHERE m.userId = ? AND m.isActive = 1 AND s.isActive = 1
      AND m.startDate <= ?
      AND (m.endDate IS NULL OR m.endDate = '' OR m.endDate >= ?)
      ORDER BY s.timeSlot ASC
    `, [this.currentUserId, date, date]);


    // Filter results based on frequency and date rules
    const filteredResults = (results || []).filter((med: any) => {
      const { frequency, daysOfWeek, startDate, endDate } = med;
      
      // For daily frequency
      if (frequency === 'daily') {
        // If has endDate (fixed period), only show within that period
        if (endDate && endDate !== '') {
          const withinPeriod = date >= startDate && date <= endDate;
          return withinPeriod;
        }
        // If no endDate (ongoing), show from startDate onwards
        const afterStart = date >= startDate;
        return afterStart;
      }
      
      // For weekly frequency
      if (frequency === 'weekly') {
        // If no daysOfWeek specified, treat as daily for now (backward compatibility)
        if (!daysOfWeek || daysOfWeek === '' || daysOfWeek === '[]') {
          if (endDate && endDate !== '') {
            return date >= startDate && date <= endDate;
          }
          return date >= startDate;
        }
        
        try {
          const selectedDays = JSON.parse(daysOfWeek);
          const dayOfWeek = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
          
          let isCorrectDay = false;
          
          // Handle both day names (strings) and day indices (numbers)
          if (selectedDays.length > 0) {
            if (typeof selectedDays[0] === 'string') {
              // Day names format: ["Monday", "Tuesday", ...]
              isCorrectDay = selectedDays.includes(dayOfWeek);
            } else if (typeof selectedDays[0] === 'number') {
              // Day indices format: [0, 1, 2, ...] where 0=Sunday, 1=Monday, etc.
              const dayIndex = new Date(date + 'T00:00:00').getDay();
              isCorrectDay = selectedDays.includes(dayIndex);
            }
          }
          
          if (endDate && endDate !== '') {
            const result = isCorrectDay && date >= startDate && date <= endDate;
            return result;
          }
          const result = isCorrectDay && date >= startDate;
          return result;
        } catch {
          // If parsing fails, don't show the medication
          return false;
        }
      }
      
      // For date_range frequency (specific date range with selected days)
      if (frequency === 'date_range') {
        // Must have both start and end dates for date range
        if (!endDate || endDate === '') {
          return false;
        }
        
        // Check if current date is within the range
        const withinRange = date >= startDate && date <= endDate;
        if (!withinRange) {
          return false;
        }
        
        // If no specific days selected, show every day in the range
        if (!daysOfWeek || daysOfWeek === '' || daysOfWeek === '[]') {
          return true;
        }
        
        // Check if today matches one of the selected days
        try {
          const selectedDays = JSON.parse(daysOfWeek);
          const dayOfWeek = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
          
          let result = false;
          
          // Handle both day names (strings) and day indices (numbers)
          if (selectedDays.length > 0) {
            if (typeof selectedDays[0] === 'string') {
              // Day names format: ["Monday", "Tuesday", ...]
              result = selectedDays.includes(dayOfWeek);
            } else if (typeof selectedDays[0] === 'number') {
              // Day indices format: [0, 1, 2, ...] where 0=Sunday, 1=Monday, etc.
              const dayIndex = new Date(date + 'T00:00:00').getDay();
              result = selectedDays.includes(dayIndex);
            }
          }
          
          return result;
        } catch {
          // If parsing fails, show every day in range as fallback
          return true;
        }
      }
      
      // For as_needed frequency, never show automatically
      if (frequency === 'as_needed') {
        return false;
      }
      
      return false;
    });

    if (filteredResults && filteredResults.length > 0) {
    }

    return filteredResults;
  }

  // MEDICATION LOG METHODS
  async getMedicationLog(medicationId: number, date: string, timeSlot: string): Promise<{status: string, actualTime: string} | null> {
    const db = this.getHealthLogsDb(); // Use health logs database
    
    // Check for any log for this medication on this date, regardless of time
    const result = await db.getFirstAsync(`
      SELECT status, actualTime FROM medication_logs 
      WHERE userId = ? AND medicationId = ? AND scheduledTime LIKE ? 
      ORDER BY createdAt DESC 
      LIMIT 1
    `, [this.currentUserId, medicationId, `${date}%`]) as any;
    
    return result || null;
  }

  // New method: Get all medication logs for a specific date (optimized)
  async getAllMedicationLogsForDate(date: string): Promise<Map<number, {status: string, actualTime: string}>> {
    const db = this.getHealthLogsDb(); // Use health logs database
    
    const results = await db.getAllAsync(`
      SELECT medicationId, status, actualTime FROM medication_logs 
      WHERE userId = ? AND scheduledTime LIKE ? 
      ORDER BY createdAt DESC
    `, [this.currentUserId, `${date}%`]) as any[];
    
    // Create a map of medicationId -> latest log status
    const logMap = new Map<number, {status: string, actualTime: string}>();
    
    for (const log of results) {
      // Only store the first (latest) log for each medication
      if (!logMap.has(log.medicationId)) {
        logMap.set(log.medicationId, {
          status: log.status,
          actualTime: log.actualTime
        });
      }
    }
    
    return logMap;
  }

  // New method: Get logs for deleted medications for a specific date
  async getDeletedMedicationLogsForDate(date: string): Promise<any[]> {
    const logsDb = this.getHealthLogsDb(); // Use health logs database for logs
    const medicationsDb = this.getDb(); // Use medications database for medications table
    
    try {
      // First, get all medication logs for this date
      const allLogs = await logsDb.getAllAsync(`
        SELECT 
          medicationId,
          medicationName,
          dosage,
          scheduledTime,
          actualTime,
          status,
          notes
        FROM medication_logs
        WHERE userId = ? 
        AND date(scheduledTime) = ?
        ORDER BY scheduledTime ASC
      `, [this.currentUserId, date]);
      
      if (!allLogs || allLogs.length === 0) {
        return [];
      }
      
      // Then, check which medications are now deleted/inactive
      const medicationIds = [...new Set(allLogs.map((log: any) => log.medicationId))];
      const activeMedications = new Set();
      
      for (const medId of medicationIds) {
        try {
          const med = await medicationsDb.getFirstAsync(`
            SELECT id FROM medications 
            WHERE id = ? AND userId = ? AND isActive = 1
          `, [medId, this.currentUserId]);
          
          if (med) {
            activeMedications.add(medId);
          }
        } catch {
          // If error accessing medications table, treat as deleted
        }
      }
      
      // Filter logs to only include those from deleted medications
      const deletedMedLogs = allLogs.filter((log: any) => !activeMedications.has(log.medicationId));
      
      return deletedMedLogs;
    } catch {
      return [];
    }
  }

  async logMedicationStatus(data: {
    medicationId: number;
    medicationName: string;
    dosage: string;
    date: string;
    status: string;
    actualTime: string;
    notes?: string;
  }): Promise<number> {
    const db = this.getHealthLogsDb(); // Use health logs database
    
    // Create scheduledTime by combining date and current time
    const scheduledTime = `${data.date} ${new Date().toTimeString().substring(0, 5)}`;
    
    const result = await db.runAsync(`
      INSERT INTO medication_logs (
        userId, medicationId, medicationName, dosage, 
        scheduledTime, actualTime, status, notes, 
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      this.currentUserId,
      data.medicationId,
      data.medicationName,
      data.dosage,
      scheduledTime,
      data.actualTime,
      data.status,
      data.notes || '',
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    return result.lastInsertRowId!;
  }

  // New method: Delete all medication logs
  async deleteAllMedicationLogs(): Promise<void> {
    const db = this.getHealthLogsDb(); // Use health logs database
    
    try {
      await db.runAsync(`
        DELETE FROM medication_logs 
        WHERE userId = ?
      `, [this.currentUserId]);
      
    } catch (error) {
      throw error;
    }
  }

  // Helper methods
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  static formatTime(date: Date): string {
    return date.toTimeString().substring(0, 5); // HH:MM
  }
}

export const simpleMedicationService = new SimpleMedicationService();
