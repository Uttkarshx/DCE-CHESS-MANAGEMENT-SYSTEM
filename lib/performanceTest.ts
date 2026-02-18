/**
 * Performance Test: Swiss Pairing Engine
 * Tests 200 players, 7 rounds
 */

import { Tournament, Player, TournamentSettings } from './types';
import { generatePairings } from './pairingEngine';
import { recalculateAllStats } from './tiebreaks';
import { v4 as uuidv4 } from 'uuid';

function createTestTournament(playerCount: number): Tournament {
  const players: Player[] = [];
  
  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: uuidv4(),
      name: `Player ${String(i + 1).padStart(3, '0')}`,
      rating: 1200 + Math.floor(Math.random() * 1000),
      score: 0,
      buchholz: 0,
      sonnebornBerger: 0,
      wins: 0,
      opponents: [],
      colors: [],
      hadBye: false,
    });
  }

  const tournament: Tournament = {
    id: uuidv4(),
    name: `Performance Test - ${playerCount} Players`,
    totalRounds: 7,
    totalBoards: 6,
    players,
    rounds: [],
    settings: {
      byeValue: 0.5,
      colorBalanceStrict: false,
      floatingEnabled: true,
      round1PairingMethod: 'random',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    currentRound: 0,
    isComplete: false,
    status: 'setup',
  };

  return tournament;
}

function testPairingPerformance() {
  console.log('🚀 Swiss Pairing Engine Performance Test\n');
  
  const testCases = [50, 100, 200];
  
  for (const playerCount of testCases) {
    const tournament = createTestTournament(playerCount);
    
    console.log(`\nTesting with ${playerCount} players:`);
    
    for (let round = 1; round <= 7; round++) {
      const startTime = performance.now();
      
      // Simulate a pairing generation
      // tournament.currentRound would be incremented before this in real scenario
      const pairingResult = generatePairings(tournament);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`  Round ${round}: ${duration.toFixed(2)}ms - ${pairingResult.matches.length} matches`);
      
      // Simulate match results to update player stats
      for (const match of pairingResult.matches) {
        const results = ['1-0', '0-1', '1/2-1/2'];
        match.result = results[Math.floor(Math.random() * 3)] as any;
      }
      
      // Recalculate stats
      tournament.players = recalculateAllStats(tournament.players, pairingResult.matches);
      
      // Move to next round
      tournament.rounds.push({
        roundNumber: round,
        matches: pairingResult.matches,
        isComplete: true,
        completedBatches: new Set(),
        generatedAt: new Date(),
        completedAt: new Date(),
      });
      tournament.currentRound = round;
    }
  }
  
  console.log('\n✅ Performance test complete!\n');
}

// Run test
if (require.main === module) {
  testPairingPerformance();
}

export { testPairingPerformance, createTestTournament };
