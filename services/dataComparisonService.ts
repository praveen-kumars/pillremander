/**
 * DATA COMPARISON SERVICE
 * 
 * This service compares data between home screen and analytics to identify mismatches
 */

import { getTodayDateString } from '../utils/dateUtils';
import { analyticsService } from './analyticsService';
import { medicationIntegrationService } from './medicationIntegrationService';

interface ComparisonResult {
  date: string;
  homeScreenData: {
    total: number;
    pending: number;
    taken: number;
    skipped: number;
    missed: number;
    medications: any[];
  };
  analyticsData: {
    total: number;
    pending: number;
    taken: number;
    skipped: number;
    missed: number;
    adherenceRate: number;
  };
  mismatches: string[];
}

export class DataComparisonService {
  private static instance: DataComparisonService;

  static getInstance(): DataComparisonService {
    if (!DataComparisonService.instance) {
      DataComparisonService.instance = new DataComparisonService();
    }
    return DataComparisonService.instance;
  }

  /**
   * Compare home screen data with analytics data for a specific date
   */
  async compareDataForDate(date: string = getTodayDateString()): Promise<ComparisonResult> {
    console.log(`🔍 [DataComparison] Starting comparison for date: ${date}`);
    
    // Get home screen data
    const homeScreenMeds = await medicationIntegrationService.getMedicationsForDate(date);
    const homeScreenSummary = this.calculateHomeScreenSummary(homeScreenMeds);
    
    // Get analytics data  
    const analyticsData = await analyticsService.getTodayAnalytics();
    
    // Compare and identify mismatches
    const mismatches: string[] = [];
    
    if (homeScreenSummary.total !== analyticsData.total) {
      mismatches.push(`Total count mismatch: Home=${homeScreenSummary.total}, Analytics=${analyticsData.total}`);
    }
    
    if (homeScreenSummary.pending !== analyticsData.pending) {
      mismatches.push(`Pending count mismatch: Home=${homeScreenSummary.pending}, Analytics=${analyticsData.pending}`);
    }
    
    if (homeScreenSummary.taken !== analyticsData.taken) {
      mismatches.push(`Taken count mismatch: Home=${homeScreenSummary.taken}, Analytics=${analyticsData.taken}`);
    }
    
    if (homeScreenSummary.skipped !== analyticsData.skipped) {
      mismatches.push(`Skipped count mismatch: Home=${homeScreenSummary.skipped}, Analytics=${analyticsData.skipped}`);
    }
    
    if (homeScreenSummary.missed !== analyticsData.missed) {
      mismatches.push(`Missed count mismatch: Home=${homeScreenSummary.missed}, Analytics=${analyticsData.missed}`);
    }

    const result: ComparisonResult = {
      date,
      homeScreenData: {
        ...homeScreenSummary,
        medications: homeScreenMeds
      },
      analyticsData,
      mismatches
    };

    // Log detailed comparison
    this.logDetailedComparison(result);
    
    return result;
  }

  /**
   * Calculate summary from home screen medications
   */
  private calculateHomeScreenSummary(medications: any[]) {
    const summary = {
      total: medications.length,
      pending: 0,
      taken: 0,
      skipped: 0,
      missed: 0
    };

    medications.forEach(med => {
      switch (med.status) {
        case 'pending':
          summary.pending++;
          break;
        case 'taken':
          summary.taken++;
          break;
        case 'skipped':
          summary.skipped++;
          break;
        case 'missed':
          summary.missed++;
          break;
      }
    });

    return summary;
  }

  /**
   * Log detailed comparison results
   */
  private logDetailedComparison(result: ComparisonResult) {
    console.log(`🔍 [DataComparison] =================== COMPARISON REPORT ===================`);
    console.log(`📅 Date: ${result.date}`);
    console.log(`🏠 Home Screen Data:`, result.homeScreenData);
    console.log(`📊 Analytics Data:`, result.analyticsData);
    
    if (result.mismatches.length > 0) {
      console.log(`❌ MISMATCHES FOUND (${result.mismatches.length}):`);
      result.mismatches.forEach((mismatch, index) => {
        console.log(`   ${index + 1}. ${mismatch}`);
      });
    } else {
      console.log(`✅ NO MISMATCHES - Data is consistent!`);
    }
    
    console.log(`🏠 Home Screen Medications (${result.homeScreenData.medications.length}):`);
    result.homeScreenData.medications.forEach((med, index) => {
      console.log(`   ${index + 1}. ${med.medicationName} (${med.timeSlot}) - Status: ${med.status} - ID: ${med.medicationId}`);
    });
    
    console.log(`🔍 [DataComparison] ===================== END REPORT =====================`);
  }

  /**
   * Compare data sources at the service level
   */
  async compareDataSources(date: string = getTodayDateString()) {
    console.log(`🔍 [DataComparison] ============ DATA SOURCE COMPARISON ============`);
    
    try {
      // Home screen uses: medicationIntegrationService.getMedicationsForDate()
      // Which calls: simpleMedicationService.getDailyMedications()
      console.log(`🏠 [DataComparison] Home Screen Data Source Analysis:`);
      const homeScreenMeds = await medicationIntegrationService.getMedicationsForDate(date);
      console.log(`   📝 Source: medicationIntegrationService.getMedicationsForDate()`);
      console.log(`   📝 Uses: simpleMedicationService.getDailyMedications()`);
      console.log(`   📝 Database: medications + medication_schedules tables`);
      console.log(`   📝 Filters: isActive = 1 AND startDate <= date AND (endDate >= date OR endDate IS NULL)`);
      console.log(`   📝 Results: ${homeScreenMeds.length} medications`);
      
      // Analytics uses: analyticsService.getTodayAnalytics()  
      // Which queries: medications table WITHOUT isActive filter + medication_logs table
      console.log(`📊 [DataComparison] Analytics Data Source Analysis:`);
      const analyticsData = await analyticsService.getTodayAnalytics();
      console.log(`   📝 Source: analyticsService.getTodayAnalytics()`);
      console.log(`   📝 Uses: medications + medication_schedules + medication_logs tables`);
      console.log(`   📝 Database: medications (NO isActive filter) + health logs`);
      console.log(`   📝 Filters: startDate <= date AND (endDate >= date OR endDate IS NULL)`);
      console.log(`   📝 Results: Total=${analyticsData.total}, Expected calculations based on date logic`);
      
      console.log(`🔍 [DataComparison] ============ KEY DIFFERENCES ============`);
      console.log(`❌ MAIN ISSUE: Home screen filters by isActive=1, Analytics does NOT`);
      console.log(`❌ Analytics includes deleted/inactive medications in calculations`);
      console.log(`❌ Different database query logic between services`);
      
    } catch (error) {
      console.error(`❌ [DataComparison] Error during data source comparison:`, error);
    }
  }
}

export const dataComparisonService = DataComparisonService.getInstance();
