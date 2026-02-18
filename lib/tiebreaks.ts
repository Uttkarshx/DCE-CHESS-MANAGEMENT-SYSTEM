/**
 * Tie-Break Calculations for Swiss System
 * Implements Buchholz and Sonneborn-Berger calculations
 */

import { Player, Match, GameResult } from './types';

/**
 * Calculate Buchholz score: sum of all opponents' scores
 */
export function calculateBuchholz(player: Player, allPlayers: Player[]): number {
  let buchholz = 0;

  for (const opponentId of player.opponents) {
    const opponent = allPlayers.find(p => p.id === opponentId);
    if (opponent) {
      buchholz += opponent.score;
    }
  }

  return Math.round(buchholz * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate Sonneborn-Berger score: sum of beaten opponents' scores + 0.5 × score of drawn opponents
 */
export function calculateSonnebornBerger(
  player: Player,
  allPlayers: Player[],
  matches: Match[]
): number {
  let sb = 0;

  // Find all matches involving this player
  for (const match of matches) {
    if (match.result === null) continue; // Skip incomplete matches

    const isWhite = match.whiteId === player.id;
    const isBlack = match.blackId === player.id;

    if (!isWhite && !isBlack) continue;

    const opponentId = isWhite ? match.blackId : match.whiteId;
    const opponent = allPlayers.find(p => p.id === opponentId);
    if (!opponent) continue;

    const playerWon =
      (isWhite && match.result === '1-0') ||
      (isBlack && match.result === '0-1');
    const draw = match.result === '1/2-1/2';

    if (playerWon) {
      sb += opponent.score;
    } else if (draw) {
      sb += opponent.score * 0.5;
    }
    // If player lost, add nothing
  }

  return Math.round(sb * 100) / 100; // Round to 2 decimals
}

/**
 * Get the points value of a result for a player
 */
export function getResultPoints(
  result: GameResult,
  isWhitePlayer: boolean
): number {
  if (result === null) return 0;
  if (result === 'bye') return 0; // Handled separately

  if (result === '1/2-1/2') return 0.5;
  if (isWhitePlayer && result === '1-0') return 1;
  if (!isWhitePlayer && result === '0-1') return 1;
  return 0;
}

/**
 * Update a player's statistics after a match result is entered
 */
export function updatePlayerStats(
  player: Player,
  allPlayers: Player[],
  allMatches: Match[]
): Player {
  // Recalculate score
  let score = 0;
  let wins = 0;

  for (const match of allMatches) {
    if (match.result === null) continue;

    const isWhite = match.whiteId === player.id;
    const isBlack = match.blackId === player.id;

    if (!isWhite && !isBlack) continue;

    if (match.result === 'bye') {
      // Bye is handled separately in tournament logic
      continue;
    }

    const points = getResultPoints(match.result, isWhite);
    score += points;

    if (points === 1) {
      wins++;
    }
  }

  // Recalculate tiebreaks
  const buchholz = calculateBuchholz(player, allPlayers);
  const sonnebornBerger = calculateSonnebornBerger(player, allPlayers, allMatches);

  return {
    ...player,
    score,
    wins,
    buchholz,
    sonnebornBerger,
  };
}

/**
 * Rank players by score and tiebreakers
 */
export function rankPlayers(
  players: Player[],
  tiebreakOrder: ('buchholz' | 'sb' | 'wins' | 'rating')[] = [
    'buchholz',
    'sb',
    'wins',
    'rating',
  ]
): { ranked: Player[]; rankings: Map<string, number> } {
  const ranked = [...players].sort((a, b) => {
    // Primary: score (descending)
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    // Tiebreakers
    for (const tiebreak of tiebreakOrder) {
      let aVal = 0;
      let bVal = 0;

      switch (tiebreak) {
        case 'buchholz':
          aVal = a.buchholz;
          bVal = b.buchholz;
          break;
        case 'sb':
          aVal = a.sonnebornBerger;
          bVal = b.sonnebornBerger;
          break;
        case 'wins':
          aVal = a.wins;
          bVal = b.wins;
          break;
        case 'rating':
          aVal = a.rating;
          bVal = b.rating;
          break;
      }

      if (aVal !== bVal) {
        return bVal - aVal;
      }
    }

    // Final tiebreaker: array index
    return players.indexOf(a) - players.indexOf(b);
  });

  // Create rankings map
  const rankings = new Map<string, number>();
  for (let i = 0; i < ranked.length; i++) {
    rankings.set(ranked[i].id, i + 1);
  }

  return { ranked, rankings };
}

/**
 * Format score for display
 */
export function formatScore(score: number): string {
  if (Number.isInteger(score)) {
    return score.toString();
  }
  return score.toFixed(1);
}

/**
 * Get all matches involving a player
 */
export function getPlayerMatches(
  playerId: string,
  matches: Match[]
): Match[] {
  return matches.filter(
    m => m.whiteId === playerId || m.blackId === playerId
  );
}

/**
 * Get opponent information for a player
 */
export function getOpponentInfo(
  playerId: string,
  opponentId: string,
  matches: Match[]
): { result: GameResult; color: 'white' | 'black' } | null {
  const match = matches.find(
    m =>
      (m.whiteId === playerId && m.blackId === opponentId) ||
      (m.blackId === playerId && m.whiteId === opponentId)
  );

  if (!match) return null;

  const color = match.whiteId === playerId ? 'white' : 'black';
  return { result: match.result, color };
}

/**
 * Recalculate all player statistics from scratch based on all matches
 */
export function recalculateAllStats(
  players: Player[],
  allMatches: Match[]
): Player[] {
  return players.map((player) => {
    let score = 0;
    let wins = 0;

    // Calculate score from all completed matches
    for (const match of allMatches) {
      if (match.result === null || match.result === 'bye') continue;

      const isWhite = match.whiteId === player.id;
      const isBlack = match.blackId === player.id;
      if (!isWhite && !isBlack) continue;

      if (match.result === '1-0') {
        score += isWhite ? 1 : 0;
        if (isWhite) wins++;
      } else if (match.result === '0-1') {
        score += isBlack ? 1 : 0;
        if (isBlack) wins++;
      } else if (match.result === '1/2-1/2') {
        score += 0.5;
      }
    }

    // Recalculate tiebreaks
    const buchholz = calculateBuchholz(player, players);
    const sonnebornBerger = calculateSonnebornBerger(player, players, allMatches);

    return {
      ...player,
      score: Math.round(score * 100) / 100,
      wins,
      buchholz,
      sonnebornBerger,
    };
  });
}
