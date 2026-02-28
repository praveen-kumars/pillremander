import * as SQLite from 'expo-sqlite';

export interface PersonalInfo {
  id?: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  weight: string;
  height: string;
  phoneNumber: string;
  email: string;
  bloodType: string;
  allergies: string;
  medicalConditions: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  primaryDoctorName: string;
  primaryDoctorPhone: string;
  primaryDoctorSpecialty: string;
  preferredLanguage: string;
  timeFormat: string;
  units: string;
  createdAt?: string;
  updatedAt?: string;
}

class PersonalInfoService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initializeDatabase(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('pillRemainder.db');
      await this.createTables();
    } catch (error) {
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const createPersonalInfoTableQuery = `
      CREATE TABLE IF NOT EXISTS personal_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT,
        lastName TEXT,
        dateOfBirth TEXT,
        gender TEXT,
        weight TEXT,
        height TEXT,
        phoneNumber TEXT,
        email TEXT,
        bloodType TEXT,
        allergies TEXT,
        medicalConditions TEXT,
        emergencyContactName TEXT,
        emergencyContactPhone TEXT,
        primaryDoctorName TEXT,
        primaryDoctorPhone TEXT,
        primaryDoctorSpecialty TEXT,
        preferredLanguage TEXT DEFAULT 'English',
        timeFormat TEXT DEFAULT '12',
        units TEXT DEFAULT 'Imperial',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createAppPreferencesTableQuery = `
      CREATE TABLE IF NOT EXISTS app_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE,
        value TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await this.db.execAsync(createPersonalInfoTableQuery);
    await this.db.execAsync(createAppPreferencesTableQuery);
  }

  async savePersonalInfo(personalInfo: Omit<PersonalInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      // Check if personal info already exists (should only be one record)
      const existingInfo = await this.getPersonalInfo();
      
      if (existingInfo) {
        // Update existing record
        await this.updatePersonalInfo(personalInfo);
      } else {
        // Insert new record
        const insertQuery = `
          INSERT INTO personal_info (
            firstName, lastName, dateOfBirth, gender, weight, height,
            phoneNumber, email, bloodType, allergies, medicalConditions,
            emergencyContactName, emergencyContactPhone, primaryDoctorName,
            primaryDoctorPhone, primaryDoctorSpecialty, preferredLanguage,
            timeFormat, units
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;

        await this.db.runAsync(insertQuery, [
          personalInfo.firstName,
          personalInfo.lastName,
          personalInfo.dateOfBirth,
          personalInfo.gender,
          personalInfo.weight,
          personalInfo.height,
          personalInfo.phoneNumber,
          personalInfo.email,
          personalInfo.bloodType,
          personalInfo.allergies,
          personalInfo.medicalConditions,
          personalInfo.emergencyContactName,
          personalInfo.emergencyContactPhone,
          personalInfo.primaryDoctorName,
          personalInfo.primaryDoctorPhone,
          personalInfo.primaryDoctorSpecialty,
          personalInfo.preferredLanguage,
          personalInfo.timeFormat,
          personalInfo.units,
        ]);
      }
    } catch (error) {
      throw error;
    }
  }

  async updatePersonalInfo(personalInfo: Omit<PersonalInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      const updateQuery = `
        UPDATE personal_info SET
          firstName = ?, lastName = ?, dateOfBirth = ?, gender = ?, weight = ?, height = ?,
          phoneNumber = ?, email = ?, bloodType = ?, allergies = ?, medicalConditions = ?,
          emergencyContactName = ?, emergencyContactPhone = ?, primaryDoctorName = ?,
          primaryDoctorPhone = ?, primaryDoctorSpecialty = ?, preferredLanguage = ?,
          timeFormat = ?, units = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = (SELECT MIN(id) FROM personal_info);
      `;

      await this.db.runAsync(updateQuery, [
        personalInfo.firstName,
        personalInfo.lastName,
        personalInfo.dateOfBirth,
        personalInfo.gender,
        personalInfo.weight,
        personalInfo.height,
        personalInfo.phoneNumber,
        personalInfo.email,
        personalInfo.bloodType,
        personalInfo.allergies,
        personalInfo.medicalConditions,
        personalInfo.emergencyContactName,
        personalInfo.emergencyContactPhone,
        personalInfo.primaryDoctorName,
        personalInfo.primaryDoctorPhone,
        personalInfo.primaryDoctorSpecialty,
        personalInfo.preferredLanguage,
        personalInfo.timeFormat,
        personalInfo.units,
      ]);
    } catch (error) {
      throw error;
    }
  }

  async getPersonalInfo(): Promise<PersonalInfo | null> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      const selectQuery = 'SELECT * FROM personal_info LIMIT 1;';
      const result = await this.db.getFirstAsync(selectQuery) as PersonalInfo | null;
      return result;
    } catch (error) {
      throw error;
    }
  }

  async deletePersonalInfo(): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      const deleteQuery = 'DELETE FROM personal_info;';
      await this.db.runAsync(deleteQuery);
    } catch (error) {
      throw error;
    }
  }

  async exportPersonalInfo(): Promise<PersonalInfo | null> {
    // Same as getPersonalInfo but could be extended with additional formatting
    return await this.getPersonalInfo();
  }

  async validatePersonalInfo(personalInfo: Partial<PersonalInfo>): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation rules
    if (personalInfo.email && !this.isValidEmail(personalInfo.email)) {
      errors.push('Please enter a valid email address');
    }

    if (personalInfo.phoneNumber && !this.isValidPhoneNumber(personalInfo.phoneNumber)) {
      errors.push('Please enter a valid phone number');
    }

    if (personalInfo.dateOfBirth && !this.isValidDate(personalInfo.dateOfBirth)) {
      errors.push('Please enter a valid date of birth (MM/DD/YYYY)');
    }

    if (personalInfo.weight && personalInfo.weight.trim() !== '' && !this.isValidWeight(personalInfo.weight)) {
      errors.push('Please enter a valid weight');
    }

    if (personalInfo.height && personalInfo.height.trim() !== '' && !this.isValidHeight(personalInfo.height)) {
      errors.push('Please enter a valid height');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Remove all non-numeric characters
    const cleanPhone = phone.replace(/\D/g, '');
    // Check if it's a valid length (10-15 digits)
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  }

  private isValidDate(date: string): boolean {
    // Basic date format validation (MM/DD/YYYY)
    const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
    if (!dateRegex.test(date)) return false;
    
    // Check if the date is valid
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) && parsedDate <= new Date();
  }

  private isValidWeight(weight: string): boolean {
    // Allow numbers with optional decimal point and unit
    const weightRegex = /^\d+(\.\d+)?\s*(lbs?|kg|pounds?|kilograms?)?$/i;
    return weightRegex.test(weight.trim());
  }

  private isValidHeight(height: string): boolean {
    // Allow formats like: 5'10", 5'10, 170cm, 170 cm, 5.5ft, etc.
    const heightRegex = /^(\d+('|\.|')\d+(")?|\d+\s*(cm|ft|feet|inch|inches)?|\d+'\d+")$/i;
    return heightRegex.test(height.trim());
  }

}



export const personalInfoService = new PersonalInfoService();
