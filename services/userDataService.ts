import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// Interfaces for all user data types
export interface UserProfile {
  id?: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  weight: string;
  height: string;
  phoneNumber: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicalProfile {
  id?: number;
  userId?: number;
  bloodType: string;
  allergies: string;
  medicalConditions: string;
  medications: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmergencyContact {
  id?: number;
  userId?: number;
  name: string;
  phoneNumber: string;
  relationship: string;
  email?: string;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HealthcareProvider {
  id?: number;
  userId?: number;
  name: string;
  specialty: string;
  phoneNumber: string;
  email?: string;
  clinicName?: string;
  clinicAddress?: string;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppPreferences {
  id?: number;
  userId?: number;
  language: string;
  timeFormat: string;
  units: string;
  theme: string;
  dateFormat: string;
  createdAt?: string;
  updatedAt?: string;
}

class UserDataService {
  private db: SQLite.SQLiteDatabase | null = null;
  private currentUserId: number = 1; // For single-user app

  async initializeDatabase(): Promise<void> {
    try {
      
      // Simple database initialization
      this.db = await SQLite.openDatabaseAsync('pillRemainderUserData.db');
      await this.createTables();
      
    } catch (error) {
      throw error;
    }
  }

  private async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      try {
        await this.initializeDatabase();
      } catch (initError) {
        
        // If it's a null pointer exception, try a different approach
        if (initError instanceof Error && 
            (initError.message.includes('NullPointerException') || 
             initError.message.includes('Call to function \'NativeDatabase') ||
             initError.message.includes('has been rejected'))) {
          
          // Wait a bit and try once more
          await new Promise(resolve => setTimeout(resolve, 1000));
          await this.initializeDatabase();
        } else {
          throw initError;
        }
      }
    }
    
    if (!this.db) {
      throw new Error('Failed to initialize user data database - database instance is null');
    }
    
    // Test database connection with enhanced error handling
    if (this.db) {
      try {
        await this.db.getFirstAsync('SELECT 1 as test');
        return this.db;
      } catch (testError) {
        
        // Set db to null to force reinitialization
        this.db = null;
        
        try {
          await this.initializeDatabase();
          if (!this.db) {
            throw new Error('User data database reinitialization failed - null instance');
          }
          
          // Test the connection again with proper type checking
          const db = this.db as SQLite.SQLiteDatabase;
          await db.getFirstAsync('SELECT 1 as test');
          return db;
        } catch (recoveryError) {
          throw new Error(`User data database connection failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`);
        }
      }
    }
    
    throw new Error('Database instance is null after initialization');
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      // User Profile Table
      {
        name: 'user_profiles',
        query: `CREATE TABLE IF NOT EXISTS user_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          dateOfBirth TEXT,
          gender TEXT,
          weight TEXT,
          height TEXT,
          phoneNumber TEXT,
          email TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      },

      // Medical Profile Table
      {
        name: 'medical_profiles',
        query: `CREATE TABLE IF NOT EXISTS medical_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          bloodType TEXT,
          allergies TEXT,
          medicalConditions TEXT,
          medications TEXT,
          insuranceProvider TEXT,
          insurancePolicyNumber TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      },

      // Emergency Contacts Table
      {
        name: 'emergency_contacts',
        query: `CREATE TABLE IF NOT EXISTS emergency_contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          name TEXT NOT NULL,
          phoneNumber TEXT NOT NULL,
          relationship TEXT NOT NULL,
          email TEXT,
          isPrimary INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      },

      // Healthcare Providers Table
      {
        name: 'healthcare_providers',
        query: `CREATE TABLE IF NOT EXISTS healthcare_providers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          name TEXT NOT NULL,
          specialty TEXT,
          phoneNumber TEXT,
          email TEXT,
          clinicName TEXT,
          clinicAddress TEXT,
          isPrimary INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      },

      // App Preferences Table
      {
        name: 'app_preferences',
        query: `CREATE TABLE IF NOT EXISTS app_preferences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          language TEXT DEFAULT 'English',
          timeFormat TEXT DEFAULT '12',
          units TEXT DEFAULT 'Imperial',
          theme TEXT DEFAULT 'System',
          dateFormat TEXT DEFAULT 'MM/DD/YYYY',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      }
    ];

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_medical_user ON medical_profiles(userId)',
      'CREATE INDEX IF NOT EXISTS idx_emergency_user ON emergency_contacts(userId)',
      'CREATE INDEX IF NOT EXISTS idx_healthcare_user ON healthcare_providers(userId)',
      'CREATE INDEX IF NOT EXISTS idx_preferences_user ON app_preferences(userId)'
    ];

    // Create tables first, one by one with delays for Android
    for (const table of tables) {
      try {
        await this.db.execAsync(table.query);
        
        // Android-specific delay between operations
        if (Platform.OS === 'android') {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        throw new Error(`Failed to create user data table '${table.name}': ${error}`);
      }
    }

    // Create indexes after tables, with delays for Android
    for (const [index, indexQuery] of indexes.entries()) {
      try {
        await this.db.execAsync(indexQuery);
        
        // Android-specific delay between operations
        if (Platform.OS === 'android') {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        // Don't throw for index errors - they're not critical
      }
    }
  }

  // USER PROFILE METHODS
  async saveUserProfile(profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = await this.getDatabase();

    try {
      const existingProfile = await this.getUserProfile();
      
      if (existingProfile) {
        await this.updateUserProfile(profile);
        return existingProfile.id!;
      } else {
        const result = await db.runAsync(`
          INSERT INTO user_profiles (firstName, lastName, dateOfBirth, gender, weight, height, phoneNumber, email)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [profile.firstName, profile.lastName, profile.dateOfBirth, profile.gender, profile.weight, profile.height, profile.phoneNumber, profile.email]);
        
        this.currentUserId = result.lastInsertRowId;
        return this.currentUserId;
      }
    } catch (error) {
      throw error;
    }
  }

  async updateUserProfile(profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const db = await this.getDatabase();

    try {
      await db.runAsync(`
        UPDATE user_profiles SET
          firstName = ?, lastName = ?, dateOfBirth = ?, gender = ?, weight = ?, height = ?,
          phoneNumber = ?, email = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [profile.firstName, profile.lastName, profile.dateOfBirth, profile.gender, profile.weight, profile.height, profile.phoneNumber, profile.email, this.currentUserId]);
    } catch (error) {
      throw error;
    }
  }

  async getUserProfile(): Promise<UserProfile | null> {
    const db = await this.getDatabase();

    try {
      const result = await db.getFirstAsync('SELECT * FROM user_profiles LIMIT 1') as UserProfile | null;
      if (result) {
        this.currentUserId = result.id!;
      }
      return result;
    } catch (error) {
      throw error;
    }
  }

  // MEDICAL PROFILE METHODS
  async saveMedicalProfile(medical: Omit<MedicalProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const db = await this.getDatabase();

    try {
      const existing = await this.getMedicalProfile();
      
      if (existing) {
        await db.runAsync(`
          UPDATE medical_profiles SET
            bloodType = ?, allergies = ?, medicalConditions = ?, medications = ?,
            insuranceProvider = ?, insurancePolicyNumber = ?, updatedAt = CURRENT_TIMESTAMP
          WHERE userId = ?
        `, [medical.bloodType, medical.allergies, medical.medicalConditions, medical.medications, medical.insuranceProvider || '', medical.insurancePolicyNumber || '', this.currentUserId]);
      } else {
        await db.runAsync(`
          INSERT INTO medical_profiles (userId, bloodType, allergies, medicalConditions, medications, insuranceProvider, insurancePolicyNumber)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [this.currentUserId, medical.bloodType, medical.allergies, medical.medicalConditions, medical.medications, medical.insuranceProvider || '', medical.insurancePolicyNumber || '']);
      }
    } catch (error) {
      throw error;
    }
  }

  async getMedicalProfile(): Promise<MedicalProfile | null> {
    const db = await this.getDatabase();

    try {
      const result = await db.getFirstAsync('SELECT * FROM medical_profiles WHERE userId = ?', [this.currentUserId]) as MedicalProfile | null;
      return result;
    } catch (error) {
      throw error;
    }
  }

  // EMERGENCY CONTACTS METHODS
  async saveEmergencyContact(contact: Omit<EmergencyContact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const db = await this.getDatabase();

    try {
      // If this is primary, unset other primary contacts
      if (contact.isPrimary) {
        await db.runAsync('UPDATE emergency_contacts SET isPrimary = 0 WHERE userId = ?', [this.currentUserId]);
      }

      await db.runAsync(`
        INSERT OR REPLACE INTO emergency_contacts (userId, name, phoneNumber, relationship, email, isPrimary)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [this.currentUserId, contact.name, contact.phoneNumber, contact.relationship, contact.email || '', contact.isPrimary ? 1 : 0]);
    } catch (error) {
      throw error;
    }
  }

  async getEmergencyContacts(): Promise<EmergencyContact[]> {
    const db = await this.getDatabase();

    try {
      const results = await db.getAllAsync('SELECT * FROM emergency_contacts WHERE userId = ? ORDER BY isPrimary DESC, name ASC', [this.currentUserId]) as EmergencyContact[];
      return results || [];
    } catch (error) {
      throw error;
    }
  }

  async getPrimaryEmergencyContact(): Promise<EmergencyContact | null> {
    const db = await this.getDatabase();

    try {
      const result = await db.getFirstAsync('SELECT * FROM emergency_contacts WHERE userId = ? AND isPrimary = 1', [this.currentUserId]) as EmergencyContact | null;
      return result;
    } catch (error) {
      throw error;
    }
  }

  // HEALTHCARE PROVIDERS METHODS
  async saveHealthcareProvider(provider: Omit<HealthcareProvider, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const db = await this.getDatabase();

    try {
      // If this is primary, unset other primary providers
      if (provider.isPrimary) {
        await db.runAsync('UPDATE healthcare_providers SET isPrimary = 0 WHERE userId = ?', [this.currentUserId]);
      }

      await db.runAsync(`
        INSERT OR REPLACE INTO healthcare_providers (userId, name, specialty, phoneNumber, email, clinicName, clinicAddress, isPrimary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [this.currentUserId, provider.name, provider.specialty, provider.phoneNumber, provider.email || '', provider.clinicName || '', provider.clinicAddress || '', provider.isPrimary ? 1 : 0]);
    } catch (error) {
      throw error;
    }
  }

  async getHealthcareProviders(): Promise<HealthcareProvider[]> {
    const db = await this.getDatabase();

    try {
      const results = await db.getAllAsync('SELECT * FROM healthcare_providers WHERE userId = ? ORDER BY isPrimary DESC, name ASC', [this.currentUserId]) as HealthcareProvider[];
      return results || [];
    } catch (error) {
      throw error;
    }
  }

  async getPrimaryHealthcareProvider(): Promise<HealthcareProvider | null> {
    const db = await this.getDatabase();

    try {
      const result = await db.getFirstAsync('SELECT * FROM healthcare_providers WHERE userId = ? AND isPrimary = 1', [this.currentUserId]) as HealthcareProvider | null;
      return result;
    } catch (error) {
      throw error;
    }
  }

  // APP PREFERENCES METHODS
  async saveAppPreferences(preferences: Omit<AppPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const db = await this.getDatabase();

    try {
      const existing = await this.getAppPreferences();
      
      if (existing) {
        await db.runAsync(`
          UPDATE app_preferences SET
            language = ?, timeFormat = ?, units = ?, theme = ?, dateFormat = ?,
            updatedAt = CURRENT_TIMESTAMP
          WHERE userId = ?
        `, [preferences.language, preferences.timeFormat, preferences.units, preferences.theme, preferences.dateFormat, this.currentUserId]);
      } else {
        await db.runAsync(`
          INSERT INTO app_preferences (userId, language, timeFormat, units, theme, dateFormat)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [this.currentUserId, preferences.language, preferences.timeFormat, preferences.units, preferences.theme, preferences.dateFormat]);
      }
    } catch (error) {
      throw error;
    }
  }

  async getAppPreferences(): Promise<AppPreferences | null> {
    const db = await this.getDatabase();

    try {
      const result = await db.getFirstAsync('SELECT * FROM app_preferences WHERE userId = ?', [this.currentUserId]) as AppPreferences | null;
      return result;
    } catch (error) {
      throw error;
    }
  }

  // UTILITY METHODS
  async exportAllUserData(): Promise<{
    profile: UserProfile | null;
    medical: MedicalProfile | null;
    emergencyContacts: EmergencyContact[];
    healthcareProviders: HealthcareProvider[];
    preferences: AppPreferences | null;
  }> {
    return {
      profile: await this.getUserProfile(),
      medical: await this.getMedicalProfile(),
      emergencyContacts: await this.getEmergencyContacts(),
      healthcareProviders: await this.getHealthcareProviders(),
      preferences: await this.getAppPreferences(),
    };
  }

  async deleteAllUserData(): Promise<void> {
    const db = await this.getDatabase();

    try {
      const tables = ['app_preferences', 'healthcare_providers', 'emergency_contacts', 'medical_profiles', 'user_profiles'];
      
      for (const table of tables) {
        await db.runAsync(`DELETE FROM ${table} WHERE userId = ?`, [this.currentUserId]);
      }
    } catch (error) {
      throw error;
    }
  }

  // Data validation methods
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePhoneNumber(phone: string): boolean {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  }

  validateRequired(value: string, fieldName: string): string | null {
    if (!value || value.trim().length === 0) {
      return `${fieldName} is required`;
    }
    return null;
  }
}

export const userDataService = new UserDataService();
