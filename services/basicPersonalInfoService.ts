import * as SQLite from 'expo-sqlite';

export interface BasicPersonalInfo {
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

class BasicPersonalInfoService {
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

    const createBasicPersonalInfoTableQuery = `
      CREATE TABLE IF NOT EXISTS basic_personal_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT,
        lastName TEXT,
        dateOfBirth TEXT,
        gender TEXT,
        weight TEXT,
        height TEXT,
        phoneNumber TEXT,
        email TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await this.db.execAsync(createBasicPersonalInfoTableQuery);
  }

  async saveBasicPersonalInfo(personalInfo: Omit<BasicPersonalInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      // Check if personal info already exists (should only be one record)
      const existingInfo = await this.getBasicPersonalInfo();
      
      if (existingInfo) {
        // Update existing record
        await this.updateBasicPersonalInfo(personalInfo);
      } else {
        // Insert new record
        const insertQuery = `
          INSERT INTO basic_personal_info (
            firstName, lastName, dateOfBirth, gender, weight, height,
            phoneNumber, email
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
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
        ]);
      }
    } catch (error) {
      throw error;
    }
  }

  async updateBasicPersonalInfo(personalInfo: Omit<BasicPersonalInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      const updateQuery = `
        UPDATE basic_personal_info SET
          firstName = ?, lastName = ?, dateOfBirth = ?, gender = ?, weight = ?, height = ?,
          phoneNumber = ?, email = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = (SELECT MIN(id) FROM basic_personal_info);
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
      ]);
    } catch (error) {
      throw error;
    }
  }

  async getBasicPersonalInfo(): Promise<BasicPersonalInfo | null> {
    if (!this.db) await this.initializeDatabase();
    if (!this.db) throw new Error('Database initialization failed');

    try {
      const selectQuery = 'SELECT * FROM basic_personal_info LIMIT 1;';
      const result = await this.db.getFirstAsync(selectQuery) as BasicPersonalInfo | null;
      return result;
    } catch (error) {
      throw error;
    }
  }

  async validateBasicPersonalInfo(personalInfo: Partial<BasicPersonalInfo>): Promise<{ isValid: boolean; errors: string[] }> {
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
}

export const basicPersonalInfoService = new BasicPersonalInfoService();
