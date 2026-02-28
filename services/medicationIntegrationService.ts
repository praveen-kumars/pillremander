/**
 * SIMPLIFIED MEDICATION INTEGRATION SERVICE
 * 
 * This service provides a simple interface for medication management.
 * Uses the global database manager with separate medications and schedules tables.
 */

import { getTodayDateString } from '../utils/dateUtils';
import { notificationService } from './notificationService';
import { simpleMedicationService, type Medication, type MedicationSchedule } from './simpleMedicationService';

export class MedicationIntegrationService {
  private static instance: MedicationIntegrationService;

  static getInstance(): MedicationIntegrationService {
    if (!MedicationIntegrationService.instance) {
      MedicationIntegrationService.instance = new MedicationIntegrationService();
    }
    return MedicationIntegrationService.instance;
  }

  /**
   * Initialize without rescheduling - simplified
   */
  async initializeSystemWithoutRescheduling(): Promise<boolean> {
    try {
      // Ensure all databases are initialized, including health logs
      const { globalDatabaseManager } = await import('./globalDatabaseManager');
      await globalDatabaseManager.initialize();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Add a new medication with database storage and notification scheduling
   */
  async addMedication(medicationData: any): Promise<number | null> {
    try {
      
      // Prepare medication data for the global database schema
      const medication: Omit<Medication, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        name: medicationData.name,
        dosage: medicationData.dosage || '1',
        strength: medicationData.dosage || '1', // Use dosage as strength if not provided
        form: 'tablet', // Default form
        startDate: medicationData.startDate || getTodayDateString(),
        endDate: medicationData.endDate,
        instructions: `Take ${medicationData.dosage || '1'} ${medicationData.frequency || 'daily'}`,
        isActive: true
      };

      // Save medication to database
      const medicationId = await simpleMedicationService.addMedication(medication);

      // If we have scheduling info, save the schedule
      if (medicationData.timeSlot) {
        const schedule: Omit<MedicationSchedule, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
          medicationId: medicationId,
          timeSlot: medicationData.timeSlot,
          frequency: medicationData.frequency || 'daily', // Keep original frequency
          daysOfWeek: medicationData.frequency === 'date_range' && medicationData.days ? 
                      JSON.stringify(medicationData.days) : undefined,
          isActive: true,
          reminderEnabled: true
        };

        const scheduleId = await simpleMedicationService.saveMedicationSchedule(schedule);
      }
      
      // Schedule notifications based on frequency type
      if (medicationData.frequency === 'daily' && medicationData.timeSlot) {
        
        await notificationService.scheduleDailyNotification(
          medicationData.name,
          medicationData.dosage || '1 tablet',
          medicationData.timeSlot
        );
      } else if (medicationData.frequency === 'date_range' && medicationData.startDate && medicationData.endDate && medicationData.timeSlot) {
        
        const startDate = new Date(medicationData.startDate);
        const endDate = new Date(medicationData.endDate);
        
        await notificationService.scheduleDateRangeNotifications(
          startDate,
          endDate,
          medicationData.name,
          medicationData.dosage || '1 tablet',
          medicationData.timeSlot
        );
      } else if (medicationData.frequency === 'as_needed') {
      }
      
      return medicationId;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all medications from database
   */
  async getAllMedications(): Promise<any[]> {
    try {
      const medications = await simpleMedicationService.getMedications();
      
      // Add schedules for each medication
      for (const medication of medications) {
        if (medication.id) {
          (medication as any).schedules = await simpleMedicationService.getMedicationSchedules(medication.id);
        }
      }
      
      return medications as any[];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get medications for a specific date with proper status tracking (optimized)
   * Shows only active medications but includes logs from deleted medications
   */
  async getMedicationsForDate(date: string): Promise<any[]> {
    try {
      
      // Get active medications for display
      const medications = await simpleMedicationService.getDailyMedications(date);
      
      const today = getTodayDateString();
      const selectedDate = new Date(date);
      const todayDate = new Date(today);
      
      // Calculate date properties
      const isToday = date === today;
      const isPast = selectedDate < todayDate;
      const isFuture = selectedDate > todayDate;
      
      // Optimized: Get all medication logs for this date in one query
      // This includes logs from deleted medications to preserve history
      const logsMap = await simpleMedicationService.getAllMedicationLogsForDate(date);
      
      // Process each medication with the pre-fetched logs
      const medicationsWithStatus = medications.map(med => {
        let status = 'pending';
        let takenAt = null;
        let canInteract = false;
        
        // Get status from pre-fetched logs map
        const logStatus = logsMap.get(med.medicationId);
        if (logStatus) {
          status = logStatus.status;
          takenAt = logStatus.actualTime;
        } else if (isPast) {
          // If it's a past date and no log exists, mark as missed
          status = 'missed';
        }
        
        // Determine if user can interact with this medication
        canInteract = isToday || (isPast && (status === 'taken' || status === 'skipped'));
        
        return {
          id: `${med.medicationId}-${date}`,
          medicationId: med.medicationId,
          scheduleId: med.scheduleId || med.medicationId,
          medicationName: med.medicationName || med.name,
          dosage: med.dosage,
          timeSlot: med.timeSlot,
          time: med.timeSlot,
          date: date,
          frequency: med.frequency,
          status,
          takenAt,
          canInteract,
          isToday,
          isPast,
          isFuture
        };
      });

      // IMPORTANT: Also add historical logs from deleted medications for this date
      // This ensures past logs are preserved and visible even after medication deletion
      const deletedMedLogs = await simpleMedicationService.getDeletedMedicationLogsForDate(date);
      
      // Add deleted medication logs as view-only items
      const deletedLogItems = deletedMedLogs.map((log: any, index: number) => ({
        id: `deleted-${log.medicationId}-${date}-${index}`, // Add index to ensure uniqueness
        medicationId: log.medicationId,
        medicationName: log.medicationName,
        dosage: log.dosage || 'Unknown dosage',
        timeSlot: log.scheduledTime.split(' ')[1] || 'Unknown time',
        time: log.scheduledTime.split(' ')[1] || 'Unknown time',
        date: date,
        frequency: 'deleted',
        status: log.status,
        takenAt: log.actualTime,
        canInteract: false, // Cannot interact with deleted medication logs
        isToday,
        isPast,
        isFuture,
        isDeleted: true // Flag to identify deleted medication logs
      }));
      
      // Combine active medications with deleted logs, sorted by time
      const allItems = [...medicationsWithStatus, ...deletedLogItems];
      allItems.sort((a, b) => {
        const timeA = a.timeSlot || '00:00';
        const timeB = b.timeSlot || '00:00';
        return timeA.localeCompare(timeB);
      });
      
      
      return allItems;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get medication log status from database
   */
  private async getMedicationLogStatus(medicationId: number, date: string, timeSlot: string): Promise<{status: string, actualTime: string} | null> {
    try {
      const logs = await simpleMedicationService.getMedicationLog(medicationId, date, timeSlot);
      return logs;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update medication status (taken/skipped) with database persistence
   */
  async updateMedicationStatus(medicationId: number, date: string, status: 'taken' | 'skipped'): Promise<boolean> {
    try {
      
      // Get medication details for logging
      const medications = await simpleMedicationService.getMedications();
      const medication = medications.find(m => m.id === medicationId);
      
      if (!medication) {
        throw new Error('Medication not found');
      }
      
      // Save to medication_logs table
      await simpleMedicationService.logMedicationStatus({
        medicationId,
        medicationName: medication.name,
        dosage: medication.dosage,
        date,
        status,
        actualTime: new Date().toISOString(),
        notes: `Status updated to ${status}`
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

}


export const medicationIntegrationService = MedicationIntegrationService.getInstance();
