/**
 * Global Database Manager - Singleton Pattern
 * Initializes all databases once at app startup and provides global access
 * Prevents multiple connections, retries, and Android compatibility issues
 */

import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// Database connection state
interface DatabaseState {
  userDataDb: SQLite.SQLiteDatabase | null;
  medicationsDb: SQLite.SQLiteDatabase | null;
  healthLogsDb: SQLite.SQLiteDatabase | null;
  isInitialized: boolean;
  isInitializing: boolean;
  initializationError: Error | null;
  initializationPromise: Promise<void> | null;
}

// Database configuration
interface DatabaseConfig {
  name: string;
  tables: {
    name: string;
    schema: string;
  }[];
}

// Operation locking to prevent concurrent database operations
interface DatabaseLocks {
  medications: boolean;
  userData: boolean;
  healthLogs: boolean;
}

class GlobalDatabaseManager {
  private static instance: GlobalDatabaseManager | null = null;
  private locks: DatabaseLocks = {
    medications: false,
    userData: false,
    healthLogs: false,
  };
  private state: DatabaseState = {
    userDataDb: null,
    medicationsDb: null,
    healthLogsDb: null,
    isInitialized: false,
    isInitializing: false,
    initializationError: null,
    initializationPromise: null,
  };

  private readonly configs: Record<string, DatabaseConfig> = {
    userData: {
      name: 'pillRemainderUserData.db',
      tables: [
        {
          name: 'user_profiles',
          schema: `CREATE TABLE IF NOT EXISTS user_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstName TEXT NOT NULL,
            lastName TEXT NOT NULL,
            dateOfBirth TEXT NOT NULL,
            gender TEXT NOT NULL,
            weight TEXT,
            height TEXT,
            email TEXT,
            phoneNumber TEXT,
            createdAt TEXT,
            updatedAt TEXT
          )`
        },
        {
          name: 'medical_information',
          schema: `CREATE TABLE IF NOT EXISTS medical_information (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            allergies TEXT,
            chronicConditions TEXT,
            bloodType TEXT,
            insuranceInfo TEXT,
            emergencyContactName TEXT,
            emergencyContactPhone TEXT,
            primaryPhysician TEXT,
            notes TEXT,
            createdAt TEXT,
            updatedAt TEXT
          )`
        },
        {
          name: 'app_preferences',
          schema: `CREATE TABLE IF NOT EXISTS app_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            darkMode INTEGER,
            language TEXT,
            fontSize TEXT,
            createdAt TEXT,
            updatedAt TEXT
          )`
        }
      ]
    },
    medications: {
      name: 'pillRemainderMedications.db',
      tables: [
        {
          name: 'medications',
          schema: `CREATE TABLE IF NOT EXISTS medications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            name TEXT NOT NULL,
            dosage TEXT NOT NULL,
            strength TEXT NOT NULL,
            form TEXT NOT NULL,
            color TEXT,
            shape TEXT,
            manufacturer TEXT,
            prescribedBy TEXT,
            startDate TEXT NOT NULL,
            endDate TEXT,
            instructions TEXT,
            sideEffects TEXT,
            isActive INTEGER,
            createdAt TEXT,
            updatedAt TEXT
          )`
        },
        {
          name: 'medication_schedules',
          schema: `CREATE TABLE IF NOT EXISTS medication_schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            medicationId INTEGER,
            timeSlot TEXT NOT NULL,
            frequency TEXT NOT NULL,
            daysOfWeek TEXT,
            isActive INTEGER,
            reminderEnabled INTEGER,
            createdAt TEXT,
            updatedAt TEXT
          )`
        }
      ]
    },
    healthLogs: {
      name: 'pillRemainderLogs.db',
      tables: [
        {
          name: 'medication_logs',
          schema: `CREATE TABLE IF NOT EXISTS medication_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            medicationId INTEGER,
            medicationName TEXT,
            dosage TEXT,
            scheduledTime TEXT,
            actualTime TEXT,
            status TEXT,
            notes TEXT,
            location TEXT,
            createdAt TEXT,
            updatedAt TEXT
          )`
        },
        {
          name: 'side_effect_logs',
          schema: `CREATE TABLE IF NOT EXISTS side_effect_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            medicationId INTEGER,
            medicationName TEXT,
            symptom TEXT,
            severity TEXT,
            description TEXT,
            duration TEXT,
            startTime TEXT,
            endTime TEXT,
            reportedTime TEXT,
            actionTaken TEXT,
            contactedDoctor INTEGER,
            createdAt TEXT,
            updatedAt TEXT
          )`
        },
        {
          name: 'daily_health_summaries',
          schema: `CREATE TABLE IF NOT EXISTS daily_health_summaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            date TEXT,
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
        }
      ]
    }
  };

  // Singleton pattern - ensure only one instance exists
  public static getInstance(): GlobalDatabaseManager {
    if (!GlobalDatabaseManager.instance) {
      GlobalDatabaseManager.instance = new GlobalDatabaseManager();
    }
    return GlobalDatabaseManager.instance;
  }

  // Initialize all databases once at app startup
  public async initialize(): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.state.isInitialized) {
      return;
    }

    if (this.state.isInitializing && this.state.initializationPromise) {
      return this.state.initializationPromise;
    }

    // Create a single initialization promise
    this.state.initializationPromise = this.performInitialization();
    return this.state.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      this.state.isInitializing = true;
      this.state.initializationError = null;

      // Reduced Android-specific setup - only 100ms instead of 500ms
      if (Platform.OS === 'android') {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Initialize databases sequentially to avoid connection conflicts
      await this.initializeDatabase('userData');
      await this.initializeDatabase('medications');
      await this.initializeDatabase('healthLogs');

      this.state.isInitialized = true;
      this.state.isInitializing = false;
      
    } catch (error) {
      this.state.isInitializing = false;
      this.state.initializationError = error instanceof Error ? error : new Error(String(error));
      throw this.state.initializationError;
    }
  }

  private async initializeDatabase(type: 'userData' | 'medications' | 'healthLogs'): Promise<void> {
    const config = this.configs[type];
    
    try {
      // Open database with proper error handling
      const db = await this.openDatabaseSafely(config.name);
      
      // Store the database reference
      switch (type) {
        case 'userData':
          this.state.userDataDb = db;
          break;
        case 'medications':
          this.state.medicationsDb = db;
          break;
        case 'healthLogs':
          this.state.healthLogsDb = db;
          break;
      }

      // Create tables sequentially
      await this.createTables(db, config.tables);
      
      // Reduced Android-specific delay - only 50ms instead of 300ms
      if (Platform.OS === 'android') {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
    } catch (error) {
      throw new Error(`${type} database initialization failed: ${error}`);
    }
  }

  private async openDatabaseSafely(dbName: string): Promise<SQLite.SQLiteDatabase> {
    let attempt = 0;
    const maxAttempts = 3;
    
    while (attempt < maxAttempts) {
      try {
        attempt++;
        
        const db = await SQLite.openDatabaseAsync(dbName);
        
        // Test the connection immediately
        await db.getFirstAsync('SELECT 1 as test');
        
        return db;
        
      } catch (error) {
        if (attempt >= maxAttempts) {
          throw new Error(`Failed to open database ${dbName} after ${maxAttempts} attempts: ${error}`);
        }
        
        // Wait before retry, longer delays for Android
        const delay = Platform.OS === 'android' ? 1000 * attempt : 500 * attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error(`Failed to open database ${dbName}`);
  }

  private async createTables(db: SQLite.SQLiteDatabase, tables: { name: string; schema: string }[]): Promise<void> {
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      try {
        await db.execAsync(table.schema);
        
        // Small delay between table creations for Android
        if (Platform.OS === 'android' && i < tables.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        throw new Error(`Table creation failed for ${table.name}: ${error}`);
      }
    }
  }

  // Public getters for database instances
  public getUserDataDb(): SQLite.SQLiteDatabase {
    if (!this.state.isInitialized || !this.state.userDataDb) {
      throw new Error('User data database not initialized. Call initialize() first.');
    }
    return this.state.userDataDb;
  }

  public getMedicationsDb(): SQLite.SQLiteDatabase {
    if (!this.state.isInitialized || !this.state.medicationsDb) {
      throw new Error('Medications database not initialized. Call initialize() first.');
    }
    return this.state.medicationsDb;
  }

  public getHealthLogsDb(): SQLite.SQLiteDatabase {
    if (!this.state.isInitialized || !this.state.healthLogsDb) {
      throw new Error('Health logs database not initialized. Call initialize() first.');
    }
    return this.state.healthLogsDb;
  }

  // Status getters
  public isInitialized(): boolean {
    return this.state.isInitialized;
  }

  public isInitializing(): boolean {
    return this.state.isInitializing;
  }

  public getInitializationError(): Error | null {
    return this.state.initializationError;
  }

  // For debugging - get current state
  public getState(): DatabaseState {
    return { ...this.state };
  }

  // Cleanup method (for app termination)
  public async cleanup(): Promise<void> {
    try {
      
      const promises: Promise<void>[] = [];
      
      if (this.state.userDataDb) {
        promises.push(this.state.userDataDb.closeAsync());
      }
      if (this.state.medicationsDb) {
        promises.push(this.state.medicationsDb.closeAsync());
      }
      if (this.state.healthLogsDb) {
        promises.push(this.state.healthLogsDb.closeAsync());
      }
      
      await Promise.all(promises);
      
      // Reset state
      this.state = {
        userDataDb: null,
        medicationsDb: null,
        healthLogsDb: null,
        isInitialized: false,
        isInitializing: false,
        initializationError: null,
        initializationPromise: null,
      };
      
      // Reset locks
      this.locks = {
        medications: false,
        userData: false,
        healthLogs: false,
      };
      
    } catch {
      // Silent cleanup failure
    }
  }

  // Database operation locking methods to prevent concurrent access issues
  public async acquireLock(database: keyof DatabaseLocks, timeout: number = 5000): Promise<void> {
    const startTime = Date.now();
    
    while (this.locks[database]) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Failed to acquire ${database} database lock within ${timeout}ms`);
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    this.locks[database] = true;
  }

  public releaseLock(database: keyof DatabaseLocks): void {
    this.locks[database] = false;
  }

  public async withLock<T>(database: keyof DatabaseLocks, operation: () => Promise<T>): Promise<T> {
    await this.acquireLock(database);
    try {
      return await operation();
    } finally {
      this.releaseLock(database);
    }
  }
}

// Export singleton instance
export const globalDatabaseManager = GlobalDatabaseManager.getInstance();

// Export the class for type definitions
export { GlobalDatabaseManager };
