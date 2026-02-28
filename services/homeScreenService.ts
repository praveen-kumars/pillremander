import { isDateFuture, isDatePast, isDateToday } from '../utils/dateUtils';
import { healthLogsService } from './healthLogsService';
import { medicationIntegrationService } from './medicationIntegrationService';

// Temporary interface for compatibility - simplified version
export interface DailyMedicationView {
  medicationId: number;
  medicationName: string;
  dosage: string;
  strength?: string;
  form?: string;
  timeSlot: string;
  instructions?: string;
  frequency: string;
  // Simplified - we'll add status tracking later
  status?: 'pending' | 'taken' | 'skipped' | 'missed';
  scheduledDateTime?: string;
  canInteract?: boolean;
  isDeleted?: boolean; // Flag to identify deleted medication logs
}

export interface HomeScreenData {
  selectedDate: string;
  medications: DailyMedicationView[];
  summary: {
    total: number;
    taken: number;
    pending: number;
    skipped: number;
    missed: number;
  };
  canInteractWithDate: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}

class HomeScreenService {
  
  /**
   * Initialize the home screen service (lightweight - no heavy processing)
   * Call this when the app starts - only basic setup
   */
  async initialize(): Promise<void> {
    try {
      // Only basic initialization - no heavy processing at startup
    } catch (error) {
      // Don't throw error to prevent app startup failure
    }
  }

  /**
   * Process missed medications for a specific past date
   * Call this when user selects a past date to ensure missed medications are properly tracked
   */
  async processMissedMedicationsForDate(dateString: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Only process if the selected date is in the past
      if (dateString >= today) {
        return; // Not a past date, nothing to process
      }


      // Get all medications that should have been taken on this date
      const { medicationIntegrationService } = await import('./medicationIntegrationService');
      const medicationsForDate = await medicationIntegrationService.getMedicationsForDate(dateString);

      // Check each medication to see if it needs to be marked as missed
      for (const medication of medicationsForDate) {
        if (medication.status === 'pending') {
          // This medication was scheduled but never taken/skipped - mark as missed
          await this.markMedicationAsMissed(
            dateString,
            medication.medicationId,
            `Missed on ${dateString} - automatically marked when viewing past date`
          );
        }
      }

    } catch (error) {
    }
  }
  
  /**
   * Get all data needed for home screen for a specific date
   */
  async getHomeScreenData(selectedDate: string): Promise<HomeScreenData> {
    try {
      // For past dates, process missed medications on-demand (performance improvement)
      await this.processMissedMedicationsForDate(selectedDate);

      // Get medications for the selected date with enhanced error handling
      let medications: DailyMedicationView[] = [];
      
      try {
        // Use medication integration service to get medications for the date
        medications = await medicationIntegrationService.getMedicationsForDate(selectedDate);
        
      } catch (medicationError) {
        // If it's a database initialization error, provide user-friendly message
        if (medicationError instanceof Error && 
            (medicationError.message.includes('Database initialization failed') ||
             medicationError.message.includes('NullPointerException'))) {
          throw new Error('Database initialization failed: ' + medicationError.message);
        }
        
        // For other errors, return empty medications
        medications = [];
      }
      
      // Calculate summary statistics
      const summary = this.calculateSummary(medications);
      
      // Determine date properties using utility functions
      const isToday = isDateToday(selectedDate);
      const isPast = isDatePast(selectedDate);
      const isFuture = isDateFuture(selectedDate);
      const canInteractWithDate = isToday || isPast; // Can't interact with future dates
      
      return {
        selectedDate,
        medications,
        summary,
        canInteractWithDate,
        isToday,
        isPast,
        isFuture
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculate summary statistics for medications
   */
  private calculateSummary(medications: DailyMedicationView[]) {
    const total = medications.length;
    const taken = medications.filter(m => m.status === 'taken').length;
    const pending = medications.filter(m => m.status === 'pending').length;
    const skipped = medications.filter(m => m.status === 'skipped').length;
    const missed = medications.filter(m => m.status === 'missed').length;

    return { total, taken, pending, skipped, missed };
  }

  /**
   * Handle medication action (take, skip, reschedule)
   */
  async handleMedicationAction(
    medication: DailyMedicationView,
    action: 'take' | 'skip' | 'reschedule',
    notes?: string,
    newTime?: string
  ): Promise<boolean> {
    try {
      // Check if action is allowed
      if (!medication.canInteract) {
        throw new Error('Cannot interact with future date medications');
      }

      const currentTime = new Date().toISOString();
      
      // Log the medication action
      await healthLogsService.logMedicationTaken({
        medicationId: medication.medicationId,
        medicationName: medication.medicationName,
        dosage: medication.dosage,
        scheduledTime: medication.scheduledDateTime || '',
        actualTime: action === 'take' ? currentTime : undefined,
        status: action === 'take' ? 'taken' : 
                action === 'skip' ? 'skipped' : 'rescheduled',
        notes: notes || '',
        location: 'Home' // Default location
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get medication adherence for date range
   */
  async getAdherenceForDateRange(startDate: string, endDate: string): Promise<{
    adherencePercentage: number;
    totalDoses: number;
    takenDoses: number;
    details: any;
  }> {
    try {
      const stats = await healthLogsService.getAdherenceStats(startDate, endDate);
      return {
        adherencePercentage: stats.adherencePercentage,
        totalDoses: stats.totalDoses,
        takenDoses: stats.takenDoses,
        details: stats
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get upcoming medications for today
   */
  async getUpcomingMedicationsToday(): Promise<DailyMedicationView[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().substring(0, 5); // HH:MM
      
      const todayMedications = await medicationIntegrationService.getMedicationsForDate(today);
      
      // Filter for upcoming medications (not taken yet and scheduled for later)
      return todayMedications.filter((med: any) => 
        med.status === 'pending' && 
        med.timeSlot >= currentTime
      ).sort((a: any, b: any) => a.timeSlot.localeCompare(b.timeSlot));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get overdue medications for today
   */
  async getOverdueMedicationsToday(): Promise<DailyMedicationView[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().substring(0, 5); // HH:MM
      
      const todayMedications = await medicationIntegrationService.getMedicationsForDate(today);
      
      // Filter for overdue medications (not taken and scheduled time has passed)
      return todayMedications.filter((med) => 
        med.status === 'pending' && 
        med.timeSlot < currentTime
      ).sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
    } catch (error) {
      throw error;
    }
  }

  /**
   * DEPRECATED: Process all past dates and mark pending medications as missed
   * This method is no longer used as it causes slow app startup.
   * Replaced with on-demand processing in getMedicationsForDate()
   * @deprecated Use on-demand processing instead
   */
  async processPastMissedMedications(): Promise<void> {
    // DEPRECATED - This method caused slow app startup
    // Missed medications are now processed on-demand when user views past dates
    return;
  }

  /**
   * Mark a specific medication as missed for a given date
   */
  async markMedicationAsMissed(date: string, medicationId: number, reason: string): Promise<void> {
    try {
      // Get the medication details for this date
      const medications = await medicationIntegrationService.getMedicationsForDate(date);
      const medication = medications.find((med: any) => med.medicationId === medicationId);
      
      if (!medication) {
        return;
      }
      
      // Only mark as missed if it's currently pending
      if (medication.status !== 'pending') {
        return; // Already processed
      }
      
      // Create proper scheduled time by combining date and timeSlot
      const scheduledDateTime = `${date}T${medication.timeSlot}:00.000Z`;
      
      // Log the medication as missed
      await healthLogsService.logMedicationTaken({
        medicationId,
        medicationName: medication.medicationName,
        scheduledTime: scheduledDateTime,
        actualTime: new Date().toISOString(),
        dosage: medication.dosage,
        status: 'missed',
        notes: reason,
        location: 'System'
      });
      
    } catch (error) {
    }
  }

  /**
   * Mark overdue medications as missed
   */
  async markOverdueMedicationsAsMissed(): Promise<void> {
    try {
      const overdueMeds = await this.getOverdueMedicationsToday();
      
      for (const med of overdueMeds) {
        // Check if it's been more than 2 hours past scheduled time
        const scheduledTime = new Date(`${med.scheduledDateTime}`);
        const now = new Date();
        const hoursPast = (now.getTime() - scheduledTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursPast >= 2) {
          await this.handleMedicationAction(med, 'skip', 'Automatically marked as missed - overdue by more than 2 hours');
        }
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate if a date is selectable
   */
  validateDateSelection(date: string): {
    isValid: boolean;
    canInteract: boolean;
    message?: string;
  } {
    const today = new Date().toISOString().split('T')[0];
    const selectedDate = new Date(date);
    const todayDate = new Date(today);
    
    const isToday = date === today;
    const isPast = selectedDate < todayDate;
    const isFuture = selectedDate > todayDate;
    
    // Check if date is too far in the future (more than 30 days)
    const daysDifference = Math.ceil((selectedDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference > 30) {
      return {
        isValid: false,
        canInteract: false,
        message: 'Cannot view dates more than 30 days in the future'
      };
    }
    
    // Check if date is too far in the past (more than 90 days)
    if (daysDifference < -90) {
      return {
        isValid: false,
        canInteract: false,
        message: 'Cannot view dates more than 90 days in the past'
      };
    }
    
    return {
      isValid: true,
      canInteract: isToday || isPast,
      message: isFuture ? 'Future date - view only, no interactions allowed' : undefined
    };
  }

  /**
   * Mark a medication as taken
   */
  async takeMedication(selectedDate: string, medicationId: number): Promise<void> {
    try {
      // First validate the date
      const today = new Date().toISOString().split('T')[0];
      const selectedDateObj = new Date(selectedDate);
      const todayDateObj = new Date(today);
      
      const isToday = selectedDate === today;
      const isPast = selectedDateObj < todayDateObj;
      const canInteract = isToday || isPast;

      if (!canInteract) {
        throw new Error('Cannot interact with medications on future dates');
      }

      const medications = await medicationIntegrationService.getMedicationsForDate(selectedDate);
      const medication = medications.find((med: any) => med.medicationId === medicationId);
      
      if (!medication) {
        throw new Error('Medication not found for this date');
      }

      // Log the medication as taken
      const { healthLogsService } = await import('./healthLogsService');
      
      // Create proper scheduled time by combining date and timeSlot
      const scheduledDateTime = `${selectedDate}T${medication.timeSlot}:00.000Z`;
      
      await healthLogsService.logMedicationTaken({
        medicationId,
        medicationName: medication.medicationName,
        scheduledTime: scheduledDateTime,
        actualTime: new Date().toISOString(),
        dosage: medication.dosage,
        status: 'taken',
        notes: 'Marked as taken from home screen'
      });

    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark a medication as skipped
   */
  async skipMedication(selectedDate: string, medicationId: number): Promise<void> {
    try {
      // First validate the date
      const today = new Date().toISOString().split('T')[0];
      const selectedDateObj = new Date(selectedDate);
      const todayDateObj = new Date(today);
      
      const isToday = selectedDate === today;
      const isPast = selectedDateObj < todayDateObj;
      const canInteract = isToday || isPast;

      if (!canInteract) {
        throw new Error('Cannot interact with medications on future dates');
      }

      const medications = await medicationIntegrationService.getMedicationsForDate(selectedDate);
      const medication = medications.find((med: any) => med.medicationId === medicationId);
      
      if (!medication) {
        throw new Error('Medication not found for this date');
      }

      // Log the medication as skipped
      const { healthLogsService } = await import('./healthLogsService');
      
      // Create proper scheduled time by combining date and timeSlot
      const scheduledDateTime = `${selectedDate}T${medication.timeSlot}:00.000Z`;
      
      await healthLogsService.logMedicationTaken({
        medicationId,
        medicationName: medication.medicationName,
        scheduledTime: scheduledDateTime,
        actualTime: new Date().toISOString(),
        dosage: medication.dosage,
        status: 'skipped',
        notes: 'Marked as skipped from home screen'
      });

    } catch (error) {
      throw error;
    }
  }

  /**
   * Update medication status (change from taken to skipped or vice versa)
   */
  async updateMedicationStatus(
    selectedDate: string, 
    medicationId: number, 
    newStatus: 'taken' | 'skipped'
  ): Promise<void> {
    try {
      // First validate the date
      const today = new Date().toISOString().split('T')[0];
      const selectedDateObj = new Date(selectedDate);
      const todayDateObj = new Date(today);
      
      const isToday = selectedDate === today;
      const isPast = selectedDateObj < todayDateObj;
      const canInteract = isToday || isPast;

      if (!canInteract) {
        throw new Error('Cannot interact with medications on future dates');
      }

      const medications = await medicationIntegrationService.getMedicationsForDate(selectedDate);
      const medication = medications.find((med: any) => med.medicationId === medicationId);
      
      if (!medication) {
        throw new Error('Medication not found for this date');
      }

      // Check if the medication already has this status (only check if not pending)
      if (medication.status !== 'pending' && medication.status === newStatus) {
        return;
      }

      // Update the medication status
      const { healthLogsService } = await import('./healthLogsService');
      
      // Create proper scheduled time by combining date and timeSlot
      const scheduledDateTime = `${selectedDate}T${medication.timeSlot}:00.000Z`;
      
      await healthLogsService.updateMedicationStatus(
        medicationId,
        scheduledDateTime,
        newStatus,
        `Status changed from ${medication.status} to ${newStatus}`
      );

    } catch (error) {
      throw error;
    }
  }
}

export const homeScreenService = new HomeScreenService();
