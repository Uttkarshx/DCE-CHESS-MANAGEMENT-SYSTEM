/**
 * Multi-Tournament Storage Management
 * Handles creating, loading, updating, and managing multiple tournaments independently
 * Each tournament is stored with a unique ID in LocalStorage
 */

import { Tournament, Round } from './types';

const TOURNAMENTS_KEY = 'tournaments_list'; // Stores array of tournament IDs
const TOURNAMENT_PREFIX = 'tournament_'; // Key prefix for individual tournaments

/**
 * Serialize a tournament to JSON (handles Date objects)
 */
function serializeTournament(tournament: Tournament): string {
  return JSON.stringify(tournament, null, 2);
}

/**
 * Deserialize a tournament from JSON (restores Date objects)
 */
function deserializeTournament(json: string): Tournament {
  const data = JSON.parse(json);

  if (!data.id || !data.name || !Array.isArray(data.players)) {
    throw new Error('Invalid tournament JSON: missing required fields');
  }

  // Parse dates
  data.createdAt = new Date(data.createdAt);
  data.updatedAt = new Date(data.updatedAt);

  if (data.rounds && Array.isArray(data.rounds)) {
    data.rounds = data.rounds.map((round: Round) => ({
      ...round,
      generatedAt: round.generatedAt ? new Date(round.generatedAt) : undefined,
      completedAt: round.completedAt ? new Date(round.completedAt) : undefined,
    }));
  }

  return data as Tournament;
}

/**
 * Get list of all tournament IDs
 */
export function getTournamentIds(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const ids = localStorage.getItem(TOURNAMENTS_KEY);
    return ids ? JSON.parse(ids) : [];
  } catch (error) {
    console.error('Failed to get tournament IDs:', error);
    return [];
  }
}

/**
 * Save a new tournament or update existing tournament
 */
export function saveTournament(tournament: Tournament): void {
  if (typeof window === 'undefined') return;

  try {
    // Update tournament's updatedAt timestamp
    const updated = { ...tournament, updatedAt: new Date() };

    // Serialize and save
    const serialized = serializeTournament(updated);
    localStorage.setItem(`${TOURNAMENT_PREFIX}${tournament.id}`, serialized);

    // Add to tournament list if new
    const ids = getTournamentIds();
    if (!ids.includes(tournament.id)) {
      ids.push(tournament.id);
      localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(ids));
    }
  } catch (error) {
    console.error('Failed to save tournament:', error);
    throw new Error('Failed to save tournament to storage');
  }
}

/**
 * Load a tournament by ID
 */
export function loadTournament(tournamentId: string): Tournament | null {
  if (typeof window === 'undefined') return null;

  try {
    const json = localStorage.getItem(`${TOURNAMENT_PREFIX}${tournamentId}`);
    if (!json) return null;
    return deserializeTournament(json);
  } catch (error) {
    console.error(`Failed to load tournament ${tournamentId}:`, error);
    return null;
  }
}

/**
 * Load all tournaments (for dashboard listing)
 */
export function loadAllTournaments(): Tournament[] {
  const ids = getTournamentIds();
  const tournaments: Tournament[] = [];

  for (const id of ids) {
    const tournament = loadTournament(id);
    if (tournament) {
      tournaments.push(tournament);
    }
  }

  return tournaments;
}

/**
 * Delete a tournament by ID
 */
export function deleteTournament(tournamentId: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(`${TOURNAMENT_PREFIX}${tournamentId}`);

    // Remove from tournament list
    const ids = getTournamentIds();
    const filtered = ids.filter(id => id !== tournamentId);
    localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error(`Failed to delete tournament ${tournamentId}:`, error);
    throw new Error('Failed to delete tournament');
  }
}

/**
 * Duplicate a tournament (creates a copy with new ID)
 */
export function duplicateTournament(tournamentId: string, newName: string): Tournament | null {
  if (typeof window === 'undefined') return null;

  try {
    const original = loadTournament(tournamentId);
    if (!original) return null;

    // Create new tournament with same data but new ID
    const { v4: uuidv4 } = require('uuid');
    const duplicate: Tournament = {
      ...original,
      id: uuidv4(),
      name: newName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    saveTournament(duplicate);
    return duplicate;
  } catch (error) {
    console.error('Failed to duplicate tournament:', error);
    return null;
  }
}

/**
 * Export tournament as JSON file (download to user's device)
 */
export function exportTournamentJSON(tournament: Tournament): void {
  if (typeof window === 'undefined') return;

  try {
    const serialized = serializeTournament(tournament);
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tournament.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export tournament:', error);
    throw new Error('Failed to export tournament');
  }
}

/**
 * Import tournament from JSON file
 */
export function importTournamentJSON(json: string): Tournament {
  try {
    const tournament = deserializeTournament(json);
    saveTournament(tournament);
    return tournament;
  } catch (error) {
    throw new Error(
      `Failed to import tournament: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Export tournament list summary as JSON
 */
export function exportAllTournamentsJSON(): void {
  if (typeof window === 'undefined') return;

  try {
    const tournaments = loadAllTournaments();
    const backup = {
      exportedAt: new Date().toISOString(),
      tournaments,
    };

    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chess_tournaments_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export all tournaments:', error);
    throw new Error('Failed to export tournaments backup');
  }
}

/**
 * Import all tournaments from backup JSON
 */
export function importAllTournamentsJSON(json: string): number {
  try {
    const backup = JSON.parse(json);
    if (!Array.isArray(backup.tournaments)) {
      throw new Error('Invalid backup format');
    }

    let imported = 0;
    for (const tournamentData of backup.tournaments) {
      try {
        const tournament = deserializeTournament(JSON.stringify(tournamentData));
        saveTournament(tournament);
        imported++;
      } catch (err) {
        console.error('Failed to import single tournament:', err);
      }
    }

    return imported;
  } catch (error) {
    throw new Error(
      `Failed to import tournaments: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get tournament statistics for dashboard
 */
export function getTournamentStats(tournament: Tournament): {
  totalPlayers: number;
  totalMatches: number;
  batchesRequired: number;
  matchesPerRound: number;
} {
  const totalPlayers = tournament.players.length;
  const matchesPerRound = Math.floor(totalPlayers / 2);
  const batchesRequired = Math.ceil(matchesPerRound / tournament.totalBoards);

  return {
    totalPlayers,
    totalMatches: matchesPerRound,
    batchesRequired,
    matchesPerRound,
  };
}

/**
 * Clear all tournament data (dangerous operation)
 */
export function clearAllTournaments(): void {
  if (typeof window === 'undefined') return;

  try {
    const ids = getTournamentIds();
    for (const id of ids) {
      localStorage.removeItem(`${TOURNAMENT_PREFIX}${id}`);
    }
    localStorage.removeItem(TOURNAMENTS_KEY);
  } catch (error) {
    console.error('Failed to clear all tournaments:', error);
  }
}
