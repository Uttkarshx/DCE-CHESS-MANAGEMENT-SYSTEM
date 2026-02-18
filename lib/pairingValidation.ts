/**
 * Pairing and round validation utilities
 * Ensures data integrity and prevents common errors
 */

import { Match, Player, Round, Tournament } from './types';

/**
 * Validates round integrity - ensures no player is paired twice
 * @throws Error if validation fails
 */
export function validateRoundIntegrity(matches: Match[]): void {
  const seen = new Set<string>();

  for (const match of matches) {
    // Skip bye matches
    if (match.result === 'bye') {
      if (seen.has(match.whiteId)) {
        throw new Error(
          `Player paired twice in same round (Bye with other match)`
        );
      }
      seen.add(match.whiteId);
      continue;
    }

    // Check white
    if (seen.has(match.whiteId)) {
      throw new Error(
        `Player ${match.whiteId} paired twice in same round`
      );
    }

    // Check black
    if (seen.has(match.blackId)) {
      throw new Error(
        `Player ${match.blackId} paired twice in same round`
      );
    }

    seen.add(match.whiteId);
    seen.add(match.blackId);
  }
}

/**
 * Checks if all matches in a round have been completed (results recorded)
 */
export function allMatchesCompleted(round: Round): boolean {
  return round.matches.every(m => m.result !== null);
}

/**
 * Checks if all matches and all round information are properly filled
 */
export function isRoundComplete(round: Round): boolean {
  return allMatchesCompleted(round) && round.isComplete;
}

/**
 * Validates that a player pairing is safe (no conflicts)
 */
export function validatePairingAddition(
  player1Id: string,
  player2Id: string,
  currentRound: Round,
  tournament: Tournament,
  allPlayers: Player[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check same player
  if (player1Id === player2Id) {
    errors.push('Cannot pair a player with themselves');
  }

  // Check if players exist
  const p1 = allPlayers.find(p => p.id === player1Id);
  const p2 = allPlayers.find(p => p.id === player2Id);

  if (!p1 || !p2) {
    errors.push('One or both players not found');
  }

  // Check if already paired in this round
  const alreadyPairedInRound = currentRound.matches.some(
    m =>
      (m.whiteId === player1Id || m.blackId === player1Id) &&
      (m.whiteId === player2Id || m.blackId === player2Id)
  );

  if (alreadyPairedInRound) {
    errors.push('Players already paired in this round');
  }

  // Check if already played each other
  const playedBefore = currentRound.matches.some(
    m =>
      (m.whiteId === player1Id && m.blackId === player2Id) ||
      (m.whiteId === player2Id && m.blackId === player1Id)
  );

  if (playedBefore) {
    errors.push('Players already played each other in this round');
  }

  // Check if either player already has a match in this round
  const alreadyMatched1 = currentRound.matches.some(
    m => m.whiteId === player1Id || m.blackId === player1Id
  );

  const alreadyMatched2 = currentRound.matches.some(
    m => m.whiteId === player2Id || m.blackId === player2Id
  );

  if (alreadyMatched1 && alreadyMatched2) {
    errors.push('Both players already have matches in this round');
  } else if (alreadyMatched1) {
    errors.push(`${p1?.name} already has a match in this round`);
  } else if (alreadyMatched2) {
    errors.push(`${p2?.name} already has a match in this round`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if current round can advance to next round
 */
export function canAdvanceToNextRound(
  tournament: Tournament,
  currentRound: Round
): { canAdvance: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check if all matches have results
  if (!allMatchesCompleted(currentRound)) {
    const incomplete = currentRound.matches.filter(m => m.result === null);
    reasons.push(
      `${incomplete.length} match${incomplete.length !== 1 ? 'es' : ''} missing result${incomplete.length !== 1 ? 's' : ''}`
    );
  }

  // Check if we've reached max rounds
  if (tournament.currentRound >= tournament.totalRounds) {
    reasons.push('All rounds completed');
  }

  // Check for duplicate pairings
  try {
    validateRoundIntegrity(currentRound.matches);
  } catch (err) {
    reasons.push(err instanceof Error ? err.message : 'Round validation failed');
  }

  return {
    canAdvance: reasons.length === 0,
    reasons,
  };
}

/**
 * Finds a player in the current round by name (case-insensitive)
 */
export function findPlayerInRound(
  playerName: string,
  round: Round,
  allPlayers: Player[]
): { boardInfo: { batch: number; board: number; opponent: string; color: 'white' | 'black' } | null; playerId: string | null } {
  const normalizedSearch = playerName.toLowerCase().trim();

  // Find player by name
  const player = allPlayers.find(p =>
    p.name.toLowerCase().includes(normalizedSearch)
  );

  if (!player) {
    return { boardInfo: null, playerId: null };
  }

  // Find their match in this round
  const match = round.matches.find(
    m => m.whiteId === player.id || m.blackId === player.id
  );

  if (!match) {
    return { boardInfo: null, playerId: player.id };
  }

  const isWhite = match.whiteId === player.id;
  const opponentId = isWhite ? match.blackId : match.whiteId;
  const opponent = allPlayers.find(p => p.id === opponentId);

  return {
    playerId: player.id,
    boardInfo: {
      batch: match.batch,
      board: match.board,
      opponent: opponent?.name || 'Unknown',
      color: isWhite ? 'white' : 'black',
    },
  };
}

/**
 * Calculates progress of a round
 */
export function getRoundProgress(round: Round): { completed: number; total: number; percentage: number } {
  const completed = round.matches.filter(m => m.result !== null).length;
  const total = round.matches.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage };
}

/**
 * Validates tournament round structure
 */
export function validateTournamentStructure(tournament: Tournament): Array<{type: 'error' | 'warning'; message: string}> {
  const issues: Array<{type: 'error' | 'warning'; message: string}> = [];

  // Check round numbering
  for (let i = 0; i < tournament.rounds.length; i++) {
    if (tournament.rounds[i].roundNumber !== i + 1) {
      issues.push({
        type: 'error',
        message: `Round numbering is incorrect at index ${i}`,
      });
    }
  }

  // Check currentRound consistency
  if (tournament.currentRound > tournament.rounds.length) {
    issues.push({
      type: 'error',
      message: 'currentRound exceeds number of rounds created',
    });
  }

  // Check if we're at completion
  if (tournament.currentRound === tournament.totalRounds) {
    if (!tournament.isComplete) {
      issues.push({
        type: 'warning',
        message: 'Tournament reached final round but isComplete is false',
      });
    }
  }

  return issues;
}

/**
 * Suggests whether a round should be locked
 */
export function shouldLockRound(round: Round): boolean {
  return allMatchesCompleted(round);
}

/**
 * Gets a user-friendly status message for a round
 */
export function getRoundStatusMessage(
  roundNumber: number,
  totalRounds: number,
  round: Round,
  isCurrentRound: boolean,
  isTournamentComplete: boolean
): string {
  if (isTournamentComplete) {
    return '🏆 Tournament Complete';
  }

  if (isCurrentRound) {
    const progress = getRoundProgress(round);
    if (progress.completed === progress.total) {
      return `✓ Round ${roundNumber} Complete - Ready for next round`;
    }
    return `Round ${roundNumber} of ${totalRounds} | ${progress.completed}/${progress.total} matches completed`;
  }

  return `Round ${roundNumber} - Completed`;
}
