/**
 * Storage utilities for Tournament Manager
 * Handles LocalStorage persistence, JSON import/export
 */

import { Tournament, Player, Round } from './types';
import { rankPlayers } from './tiebreaks';

const STORAGE_KEY = 'swiss_tournament_current';
const BACKUPS_KEY = 'swiss_tournament_backups';

/**
 * Serialize a tournament to JSON
 */
function serializeTournament(tournament: Tournament): string {
  return JSON.stringify(tournament, null, 2);
}

/**
 * Deserialize a tournament from JSON
 */
function deserializeTournament(json: string): Tournament {
  const data = JSON.parse(json);

  // Validate basic structure
  if (
    !data.id ||
    !data.name ||
    !data.players ||
    !Array.isArray(data.players)
  ) {
    throw new Error('Invalid tournament JSON: missing required fields');
  }

  // Ensure dates are parsed
  data.createdAt = new Date(data.createdAt);
  data.updatedAt = new Date(data.updatedAt);

  if (data.rounds) {
    data.rounds = data.rounds.map((round: Round) => ({
      ...round,
      generatedAt: round.generatedAt ? new Date(round.generatedAt) : undefined,
      completedAt: round.completedAt ? new Date(round.completedAt) : undefined,
    }));
  }

  return data as Tournament;
}

/**
 * Save tournament to LocalStorage
 */
export function saveTournament(tournament: Tournament): void {
  // Guard against SSR/server environment
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const serialized = serializeTournament(tournament);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    throw new Error('Failed to save tournament to storage');
  }
}

/**
 * Load tournament from LocalStorage
 */
export function loadTournament(): Tournament | null {
  // Guard against SSR/server environment
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;

    return deserializeTournament(json);
  } catch (error) {
    return null;
  }
}

/**
 * Export tournament as JSON file
 */
export function exportTournamentJSON(tournament: Tournament): string {
  const serialized = serializeTournament(tournament);

  // Guard against SSR/server environment
  if (typeof window === 'undefined') {
    return serialized;
  }

  try {
    // Create download link
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tournament.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    // Silent fail on download
  }

  return serialized;
}

/**
 * Import tournament from JSON
 */
export function importTournamentJSON(json: string): Tournament {
  try {
    const tournament = deserializeTournament(json);
    saveTournament(tournament);
    return tournament;
  } catch (error) {
    throw new Error(`Failed to import tournament: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Export tournament as CSV (standings)
 */
export function exportStandingsCSV(tournament: Tournament): string {
  const { ranked } = rankPlayers(tournament.players);

  let csv = 'Rank,Name,Rating,Score,Buchholz,Sonneborn-Berger,Wins\n';

  for (let i = 0; i < ranked.length; i++) {
    const player = ranked[i];
    csv += `${i + 1},"${player.name}",${player.rating},${player.score.toFixed(1)},${player.buchholz.toFixed(2)},${player.sonnebornBerger.toFixed(2)},${player.wins}\n`;
  }

  return csv;
}

/**
 * Export pairings as CSV
 */
export function exportPairingsCSV(tournament: Tournament): string {
  let csv = 'Round,Board,White,White Rating,Black,Black Rating,Result\n';

  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      const whitePlayer = tournament.players.find(p => p.id === match.whiteId);
      const blackPlayer = tournament.players.find(p => p.id === match.blackId);

      if (!whitePlayer || !blackPlayer) continue;

      csv += `${round.roundNumber},${match.board},"${whitePlayer.name}",${whitePlayer.rating},"${blackPlayer.name}",${blackPlayer.rating},"${match.result || 'pending'}"\n`;
    }
  }

  return csv;
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  // Guard against SSR/server environment
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    // Silent fail on CSV download
  }
}

/**
 * Create and save a backup of the current tournament
 */
export function createBackup(tournament: Tournament): void {
  // Guard against SSR/server environment
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const backups = JSON.parse(localStorage.getItem(BACKUPS_KEY) || '[]');
    backups.push({
      timestamp: new Date().toISOString(),
      tournament: tournament,
    });

    // Keep only last 10 backups
    if (backups.length > 10) {
      backups.shift();
    }

    localStorage.setItem(BACKUPS_KEY, JSON.stringify(backups));
  } catch (error) {
    // Silent fail on backup creation
  }
}

/**
 * Export standingsas Excel (.xlsx)
 */
export function exportStandingsToExcel(tournament: Tournament, roundNumber?: number): void {
  // Guard against SSR/server environment
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const XLSX = require('xlsx');
    const { ranked } = rankPlayers(tournament.players);

    // Prepare data for Excel
    const data: (string | number)[][] = [
      ['Rank', 'Name', 'Rating', 'Score', 'Buchholz', 'Sonneborn-Berger', 'Wins'],
    ];

    ranked.forEach((player, index) => {
      data.push([
        index + 1,
        player.name,
        player.rating || 0,
        player.score,
        Number(player.buchholz.toFixed(2)),
        Number(player.sonnebornBerger.toFixed(2)),
        player.wins,
      ]);
    });

    // Create workbook
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Standings');

    // Style columns
    worksheet['!cols'] = [
      { wch: 6 },  // Rank
      { wch: 25 }, // Name
      { wch: 8 },  // Rating
      { wch: 8 },  // Score
      { wch: 12 }, // Buchholz
      { wch: 14 }, // Sonneborn-Berger
      { wch: 6 },  // Wins
    ];

    // Generate filename
    const roundSuffix = roundNumber ? `_Round_${roundNumber}` : '';
    const filename = `${tournament.name.replace(/\s+/g, '_')}${roundSuffix}_Standings_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Trigger download
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    throw new Error('Failed to export standings to Excel');
  }
}

/**
 * Reset all tournament data from localStorage
 * Called when user confirms permanent data deletion
 */
export function resetAllData(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BACKUPS_KEY);
    localStorage.removeItem('theme');
  } catch (error) {
    // Silent fail on data reset
  }
}
