/**
 * Core TypeScript interfaces for Swiss System Chess Tournament Manager
 */

export type GameResult = '1-0' | '0-1' | '1/2-1/2' | 'bye' | null;

export interface Player {
  id: string;
  name: string;
  rating: number; // 0 if unrated
  score: number; // Points earned (1, 0.5, or 0)
  buchholz: number; // Sum of opponents' scores
  sonnebornBerger: number; // Sum of beaten scores + 0.5 × drawn
  wins: number; // Count of wins
  opponents: string[]; // IDs of all opponents faced
  colors: ('white' | 'black')[]; // Colors played in each round
  hadBye: boolean; // Whether player received a bye
  byeRound?: number; // Which round the bye was assigned
}

export interface Match {
  board: number; // 1-6 (resets per batch)
  batch: number; // Batch number (1, 2, 3, etc.)
  whiteId: string;
  blackId: string;
  result: GameResult; // '1-0' (white won), '0-1' (black won), '1/2-1/2' (draw), 'bye' (bye), null (pending)
  whiteColor?: 'white' | 'black'; // Track which player had white
  blackColor?: 'white' | 'black'; // Track which player had black
}

export interface Round {
  roundNumber: number;
  matches: Match[];
  isComplete: boolean;
  completedBatches: Set<number>; // Track which batches are complete
  generatedAt?: Date;
  completedAt?: Date;
}

export interface TournamentSettings {
  byeValue: 0.5 | 1; // Points awarded for a bye
  colorBalanceStrict: boolean; // Enforce strict color balance
  floatingEnabled: boolean; // Allow score group floating
  round1PairingMethod: 'random' | 'alphabetical'; // Round 1 pairing strategy for unrated players
}

export interface Tournament {
  id: string;
  name: string;
  totalRounds: number; // Player-configured (default 6)
  totalBoards: number; // Player-configured (dynamic board count)
  players: Player[];
  rounds: Round[];
  settings: TournamentSettings;
  createdAt: Date;
  updatedAt: Date;
  currentRound: number; // 0-indexed (0 = not started, 1 = round 1 in progress)
  isComplete: boolean;
  status: 'setup' | 'ready' | 'in-progress' | 'completed'; // Tournament lifecycle
}

/**
 * Utility type for immutable tournament operations
 */
export type TournamentUpdate = (tournament: Tournament) => Tournament;

/**
 * Pairing result type
 */
export interface PairingResult {
  matches: Match[];
  byePlayerId?: string;
  warnings: string[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
