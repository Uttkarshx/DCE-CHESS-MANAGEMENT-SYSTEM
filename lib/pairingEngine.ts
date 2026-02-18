/**
 * Swiss System Pairing Engine
 * Handles deterministic, fair pairings for chess tournaments
 * Supports 6-board constraint with batch scheduling
 */

import { Player, Match, Tournament, PairingResult, GameResult } from './types';

// Board and batch constants
const BOARDS_PER_BATCH = 6;
const TOTAL_ROUNDS = 6;

/**
 * Check if two players have already played each other
 */
function hasPlayedBefore(p1: Player, p2: Player): boolean {
  return p1.opponents.includes(p2.id);
}

/**
 * Check if a player is eligible for a bye
 */
function canAssignBye(player: Player): boolean {
  return !player.hadBye;
}

/**
 * Validate that no player appears twice in a round (against duplicate pairing bug)
 */
function validateNoDuplicateInRound(matches: Match[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const playerAppearances = new Map<string, number>();

  for (const match of matches) {
    // Skip bye matches
    if (match.result === 'bye') {
      if (playerAppearances.has(match.whiteId)) {
        errors.push(`Player ${match.whiteId} appears multiple times in round`);
      }
      playerAppearances.set(match.whiteId, (playerAppearances.get(match.whiteId) || 0) + 1);
    } else {
      // Regular match
      if (playerAppearances.has(match.whiteId)) {
        errors.push(`Player ${match.whiteId} appears multiple times in round`);
      }
      if (playerAppearances.has(match.blackId)) {
        errors.push(`Player ${match.blackId} appears multiple times in round`);
      }
      playerAppearances.set(match.whiteId, (playerAppearances.get(match.whiteId) || 0) + 1);
      playerAppearances.set(match.blackId, (playerAppearances.get(match.blackId) || 0) + 1);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Assign batch and board numbers to matches
 * With dynamic board count, batches are created based on tournament.totalBoards
 * Example with 10 boards and 24 matches:
 * Batch 1: Boards 1-10
 * Batch 2: Boards 1-10
 * Batch 3: Boards 1-4 (remaining)
 */
function assignBatchesAndBoards(matches: Match[], boardsPerBatch: number): Match[] {
  return matches.map((match, index) => ({
    ...match,
    batch: Math.floor(index / boardsPerBatch) + 1,
    board: (index % boardsPerBatch) + 1,
  }));
}

/**
 * Get color imbalance (|white games - black games|)
 */
function getColorImbalance(player: Player): number {
  const whiteCount = player.colors.filter(c => c === 'white').length;
  const blackCount = player.colors.filter(c => c === 'black').length;
  return Math.abs(whiteCount - blackCount);
}

/**
 * Check if assigning a color respects balance constraints (|W - B| ≤ 2)
 */
function canAssignColor(
  player: Player,
  color: 'white' | 'black',
  strictMode: boolean = false
): boolean {
  const whiteCount = player.colors.filter(c => c === 'white').length;
  const blackCount = player.colors.filter(c => c === 'black').length;

  if (color === 'white') {
    const newImbalance = Math.abs(whiteCount + 1 - blackCount);
    return strictMode ? newImbalance <= 1 : newImbalance <= 2;
  } else {
    const newImbalance = Math.abs(whiteCount - (blackCount + 1));
    return strictMode ? newImbalance <= 1 : newImbalance <= 2;
  }
}

/**
 * Deterministic shuffle using Fisher-Yates with seed
 */
function deterministicShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let rng = seed;

  // Simple seeded random generator
  const random = () => {
    rng = (rng * 9301 + 49297) % 233280;
    return rng / 233280;
  };

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Generate Round 1 pairings
 * If ratings available: sort by rating and pair top half vs bottom half
 * If no ratings: shuffle and pair sequentially
 */
function generateRound1Pairings(
  players: Player[],
  tournament: Tournament
): PairingResult {
  const warnings: string[] = [];
  let matches: Match[] = [];

  // Check if we have ratings
  const haveRatings = players.some(p => p.rating > 0);

  let sortedPlayers = [...players];
  if (haveRatings) {
    // Sort by rating descending
    sortedPlayers.sort((a, b) => b.rating - a.rating);
  } else {
    // No ratings - use configured method
    const method = tournament.settings.round1PairingMethod || 'random';
    
    if (method === 'alphabetical') {
      // Sort alphabetically by name
      sortedPlayers.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Deterministic shuffle based on player IDs
      const seed = players
        .reduce((sum, p) => sum + p.id.charCodeAt(0), 0) %
        233280;
      sortedPlayers = deterministicShuffle(sortedPlayers, seed);
    }
  }

  // Pair top half vs bottom half
  let byePlayerId: string | undefined;
  if (sortedPlayers.length % 2 === 1) {
    // Odd number of players: bye to lowest rated (or last if unrated)
    const byePlayer = sortedPlayers[sortedPlayers.length - 1];
    byePlayerId = byePlayer.id;
    sortedPlayers = sortedPlayers.slice(0, -1);
  }

  const halfPoint = sortedPlayers.length / 2;
  const topHalf = sortedPlayers.slice(0, halfPoint);
  const bottomHalf = sortedPlayers.slice(halfPoint).reverse();

  for (let i = 0; i < topHalf.length; i++) {
    const whitePlayer = topHalf[i];
    const blackPlayer = bottomHalf[i];

    // Alternate colors for better distribution
    const useAlternate = i % 2 === 1;
    const match: Match = {
      board: 0, // Will be assigned by assignBatchesAndBoards
      batch: 0, // Will be assigned by assignBatchesAndBoards
      whiteId: useAlternate ? blackPlayer.id : whitePlayer.id,
      blackId: useAlternate ? whitePlayer.id : blackPlayer.id,
      result: null,
    };
    matches.push(match);
  }

  // Assign batches and boards using tournament's totalBoards
  matches = assignBatchesAndBoards(matches, tournament.totalBoards);

  // Validate no duplicates
  const validation = validateNoDuplicateInRound(matches);
  if (!validation.isValid) {
    warnings.push(...validation.errors);
  }

  return {
    matches,
    byePlayerId,
    warnings,
  };
}

/**
 * Rank players by score, then tiebreakers
 */
function rankPlayers(
  players: Player[],
  tiebreakOrder: ('buchholz' | 'sb' | 'wins' | 'rating')[] = [
    'buchholz',
    'sb',
    'wins',
    'rating',
  ]
): Player[] {
  return [...players].sort((a, b) => {
    // Primary: score
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

    // Final tiebreaker: array index (deterministic)
    return players.indexOf(a) - players.indexOf(b);
  });
}

/**
 * Generate pairings for Round 2 and beyond
 */
function generateRound2PlusPairings(
  players: Player[],
  roundNumber: number,
  tournament: Tournament
): PairingResult {
  const warnings: string[] = [];
  let matches: Match[] = [];
  const pairedPlayers = new Set<string>(); // Track players already paired in this round

  // Step 1: Group players by score
  const scoreGroups = new Map<number, Player[]>();
  for (const player of players) {
    if (!scoreGroups.has(player.score)) {
      scoreGroups.set(player.score, []);
    }
    scoreGroups.get(player.score)!.push(player);
  }

  // Sort score groups in descending order
  const sortedScores = Array.from(scoreGroups.keys()).sort((a, b) => b - a);

  let byePlayerId: string | undefined;

  // Process each score group
  for (const score of sortedScores) {
    let group = scoreGroups.get(score) || [];

    // Within group: sort by buchholz, SB, rating (deterministic)
    group = rankPlayers(group);

    // Filter out already paired players
    group = group.filter(p => !pairedPlayers.has(p.id));

    // Attempt to pair players within the group
    let i = 0;
    while (i < group.length - 1) {
      const player1 = group[i];
      const player2 = group[i + 1];

      // Check if they can be paired
      if (!hasPlayedBefore(player1, player2)) {
        // Valid pairing
        const match = createMatch(player1, player2, 0, tournament); // Board assigned later
        matches.push(match);
        pairedPlayers.add(player1.id);
        pairedPlayers.add(player2.id);
        i += 2;
      } else {
        // Try transposition: swap with next available player
        let swapped = false;
        for (let j = i + 2; j < group.length; j++) {
          const playerAlt = group[j];
          if (
            !pairedPlayers.has(playerAlt.id) &&
            !hasPlayedBefore(player1, playerAlt)
          ) {
            // Swap and try again
            [group[i + 1], group[j]] = [group[j], group[i + 1]];
            swapped = true;
            break;
          }
        }

        if (!swapped) {
          // Cannot pair within group; float to next lower score group
          i++;
        }
      }
    }

    // Handle remaining unpaired player: might need to float
    if (i < group.length) {
      const unpaired = group[i];
      if (!pairedPlayers.has(unpaired.id)) {
        // Will be picked up in next iteration or floated
      }
    }
  }

  // Step 2: Pair remaining players (floats and byes)
  const remaining = players.filter(p => !pairedPlayers.has(p.id));
  if (remaining.length === 1) {
    // Odd player gets bye
    const byeCandidate = remaining[0];
    if (canAssignBye(byeCandidate)) {
      byePlayerId = byeCandidate.id;
    } else {
      warnings.push(`Cannot assign bye to ${byeCandidate.name}: already has bye`);
    }
  } else if (remaining.length > 1) {
    // Try to pair remaining players
    let i = 0;
    while (i < remaining.length - 1) {
      const player1 = remaining[i];
      const player2 = remaining[i + 1];

      if (!hasPlayedBefore(player1, player2)) {
        const match = createMatch(player1, player2, 0, tournament); // Board assigned later
        matches.push(match);
        pairedPlayers.add(player1.id);
        pairedPlayers.add(player2.id);
        i += 2;
      } else {
        i++;
      }
    }

    // Last unpaired gets bye
    if (i < remaining.length) {
      const lastPlayer = remaining[i];
      if (canAssignBye(lastPlayer)) {
        byePlayerId = lastPlayer.id;
      } else {
        warnings.push(`Cannot assign bye to ${lastPlayer.name}: already has bye`);
      }
    }
  }

  // Validate color balance
  for (const match of matches) {
    validateAndAllocateColors(match, players, tournament, warnings);
  }

  // Assign batches and boards using tournament's totalBoards
  matches = assignBatchesAndBoards(matches, tournament.totalBoards);

  // Validate no duplicates in this round
  const validation = validateNoDuplicateInRound(matches);
  if (!validation.isValid) {
    warnings.push(...validation.errors);
  }

  return {
    matches,
    byePlayerId,
    warnings,
  };
}

/**
 * Create a match with proper color allocation
 */
function createMatch(
  p1: Player,
  p2: Player,
  board: number,
  tournament: Tournament
): Match {
  // Simple color allocation: prefer opposite of last game
  const p1LastColor = p1.colors.length > 0 ? p1.colors[p1.colors.length - 1] : null;
  const p2LastColor = p2.colors.length > 0 ? p2.colors[p2.colors.length - 1] : null;

  // Prefer alternating colors
  let whiteId = p1.id;
  let blackId = p2.id;

  if (
    p1LastColor === 'white' &&
    canAssignColor(p1, 'black', tournament.settings.colorBalanceStrict)
  ) {
    whiteId = p2.id;
    blackId = p1.id;
  }

  return {
    board,
    batch: 0, // Will be assigned by assignBatchesAndBoards
    whiteId,
    blackId,
    result: null,
  };
}

/**
 * Allocate colors to match respecting balance constraints
 */
function validateAndAllocateColors(
  match: Match,
  players: Player[],
  tournament: Tournament,
  warnings: string[]
): void {
  const whitePlayer = players.find(p => p.id === match.whiteId);
  const blackPlayer = players.find(p => p.id === match.blackId);

  if (!whitePlayer || !blackPlayer) return;

  const whiteCanTake = canAssignColor(
    whitePlayer,
    'white',
    tournament.settings.colorBalanceStrict
  );
  const blackCanTake = canAssignColor(
    blackPlayer,
    'black',
    tournament.settings.colorBalanceStrict
  );

  if (!whiteCanTake || !blackCanTake) {
    // Swap colors
    const temp = match.whiteId;
    match.whiteId = match.blackId;
    match.blackId = temp;
  }
}

/**
 * Main entry point: generate pairings for the next round
 */
export function generatePairings(tournament: Tournament): PairingResult {
  const nextRound = tournament.currentRound + 1;

  // Check if we've exceeded 6 rounds
  if (nextRound > TOTAL_ROUNDS) {
    return {
      matches: [],
      warnings: [`Cannot generate more than ${TOTAL_ROUNDS} rounds`],
    };
  }

  if (nextRound === 1) {
    return generateRound1Pairings(tournament.players, tournament);
  } else {
    return generateRound2PlusPairings(tournament.players, nextRound, tournament);
  }
}

/**
 * Validate a complete set of pairings
 */
export function validatePairings(
  matches: Match[],
  players: Player[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const playerAppearances = new Map<string, number>();

  // Check for players appearing multiple times
  for (const match of matches) {
    // Skip byes
    if (match.result === 'bye') {
      playerAppearances.set(match.whiteId, (playerAppearances.get(match.whiteId) || 0) + 1);
    } else {
      playerAppearances.set(match.whiteId, (playerAppearances.get(match.whiteId) || 0) + 1);
      playerAppearances.set(match.blackId, (playerAppearances.get(match.blackId) || 0) + 1);
    }
  }

  // Check if any player appears more than once
  for (const [playerId, count] of playerAppearances.entries()) {
    if (count > 1) {
      const player = players.find(p => p.id === playerId);
      errors.push(`Player ${player?.name || playerId} appears ${count} times in pairings`);
    }
  }

  // Check batch and board assignments
  const batchBoards = new Map<number, Set<number>>();
  for (const match of matches) {
    if (!batchBoards.has(match.batch)) {
      batchBoards.set(match.batch, new Set());
    }
    const boards = batchBoards.get(match.batch)!;
    if (boards.has(match.board)) {
      errors.push(`Duplicate board ${match.board} in batch ${match.batch}`);
    }
    boards.add(match.board);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Export the validation function for use in other parts of the system
 */
export { validateNoDuplicateInRound };
