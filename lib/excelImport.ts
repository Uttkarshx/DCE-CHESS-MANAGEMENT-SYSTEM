import { Player, ValidationResult } from './types';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

export interface ImportResult {
  players: Player[];
  errors: string[];
  warnings: string[];
  duplicates: {
    names: string[];
    rollNumbers: string[];
  };
}

export interface RawPlayerData {
  name: string;
  rollNumber: string;
  email: string;
}

/**
 * Parse Excel file and extract player data
 * Expected columns from Google Form:
 * - Timestamp
 * - Email Address
 * - Full Name
 * - Roll Number
 * - Email ID
 * - Mobile number
 * - Year of Study
 * - Branch
 * - Preferred Format
 * - Gender
 * - ...any extra columns
 */
export async function parseExcelFile(file: File): Promise<RawPlayerData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Failed to read file');

        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        if (!worksheet) throw new Error('No worksheet found');

        // Read raw data
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];

        if (rawData.length < 2) {
          throw new Error('Excel file has no data rows');
        }

        // Get headers (first row)
        const headers = (rawData[0] || []).map((h) => String(h).trim().toLowerCase());

        // Find column indices
        const fullNameIdx = headers.findIndex((h) => h.includes('full name'));
        const rollNumberIdx = headers.findIndex((h) => h.includes('roll number'));
        const emailIdx = headers.findIndex((h) => h.includes('email address'));

        if (fullNameIdx === -1 || rollNumberIdx === -1 || emailIdx === -1) {
          throw new Error(
            'Required columns not found. Please ensure the Excel file has: "Full Name", "Roll Number", and "Email Address" columns.'
          );
        }

        // Extract player data from remaining rows
        const players: RawPlayerData[] = [];

        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];

          // Skip empty rows
          if (!row || row.length === 0) continue;

          const name = String(row[fullNameIdx] || '').trim();
          const rollNumber = String(row[rollNumberIdx] || '').trim();
          const email = String(row[emailIdx] || '').trim();

          // Skip rows with missing required fields
          if (!name || !rollNumber || !email) continue;

          players.push({
            name,
            rollNumber,
            email,
          });
        }

        resolve(players);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Clean and validate player data
 */
export function cleanPlayerData(rawPlayers: RawPlayerData[]): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenNames = new Set<string>();
  const seenRollNumbers = new Set<string>();
  const duplicateNames: string[] = [];
  const duplicateRollNumbers: string[] = [];
  const cleanedPlayers: Player[] = [];

  // Max 200 players
  if (rawPlayers.length > 200) {
    errors.push(`Too many players (${rawPlayers.length}). Maximum is 200.`);
  }

  for (const raw of rawPlayers) {
    // Clean name: trim and convert to proper case
    const cleanName = toProperCase(raw.name.trim());

    // Check for duplicate names
    if (seenNames.has(cleanName)) {
      if (!duplicateNames.includes(cleanName)) {
        duplicateNames.push(cleanName);
      }
      warnings.push(`Duplicate name found: "${cleanName}" (skipped)`);
      continue;
    }

    // Clean roll number: trim and uppercase
    const cleanRollNumber = raw.rollNumber.trim().toUpperCase();

    // Check for duplicate roll numbers
    if (seenRollNumbers.has(cleanRollNumber)) {
      if (!duplicateRollNumbers.includes(cleanRollNumber)) {
        duplicateRollNumbers.push(cleanRollNumber);
      }
      warnings.push(`Duplicate roll number found: "${cleanRollNumber}" (skipped)`);
      continue;
    }

    seenNames.add(cleanName);
    seenRollNumbers.add(cleanRollNumber);

    // Create player object
    const player: Player = {
      id: uuidv4(),
      name: cleanName,
      rating: 0, // Default rating = 0 for unrated players
      score: 0,
      buchholz: 0,
      sonnebornBerger: 0,
      wins: 0,
      opponents: [],
      colors: [],
      hadBye: false,
    };

    cleanedPlayers.push(player);
  }

  if (cleanedPlayers.length === 0) {
    errors.push('No valid players found after cleaning.');
  }

  return {
    players: cleanedPlayers,
    errors,
    warnings,
    duplicates: {
      names: duplicateNames,
      rollNumbers: duplicateRollNumbers,
    },
  };
}

/**
 * Convert string to proper case (Title Case)
 */
function toProperCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => {
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Validate file type
 */
export function validateFileType(file: File): boolean {
  const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
  return validTypes.includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
}

/**
 * Format import error report for display
 */
export function formatImportReport(result: ImportResult): {
  summary: string;
  details: string[];
} {
  const details: string[] = [];

  if (result.duplicates.names.length > 0) {
    details.push(`Duplicate names (${result.duplicates.names.length}): ${result.duplicates.names.join(', ')}`);
  }

  if (result.duplicates.rollNumbers.length > 0) {
    details.push(
      `Duplicate roll numbers (${result.duplicates.rollNumbers.length}): ${result.duplicates.rollNumbers.join(', ')}`
    );
  }

  details.push(...result.warnings);

  const summary = `Imported ${result.players.length} players${result.errors.length > 0 ? '. Errors: ' + result.errors.join('; ') : ''}`;

  return { summary, details };
}
