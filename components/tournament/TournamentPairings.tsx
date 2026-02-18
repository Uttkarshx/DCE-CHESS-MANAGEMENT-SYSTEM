'use client';

import { useState, useEffect, useRef } from 'react';
import { Tournament, Match, Round, Player } from '@/lib/types';
import { saveTournament, getTournamentStats } from '@/lib/tournamentStorage';
import { generatePairings } from '@/lib/pairingEngine';
import { recalculateAllStats } from '@/lib/tiebreaks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Play, RotateCcw, Search, Plus, Trophy } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  validateRoundIntegrity,
  allMatchesCompleted,
  validatePairingAddition,
  canAdvanceToNextRound,
  findPlayerInRound,
  getRoundProgress,
  getRoundStatusMessage,
} from '@/lib/pairingValidation';

interface TournamentPairingsProps {
  tournament: Tournament;
  onTournamentUpdate: (tournament: Tournament) => void;
}

export function TournamentPairings({
  tournament,
  onTournamentUpdate,
}: TournamentPairingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRound, setSelectedRound] = useState(1);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedBatch, setHighlightedBatch] = useState<number | null>(null);
  const [showManualPairingDialog, setShowManualPairingDialog] = useState(false);
  const [manualPlayer1, setManualPlayer1] = useState<string>('');
  const [manualPlayer2, setManualPlayer2] = useState<string>('');
  const [manualColorAssignment, setManualColorAssignment] = useState<'white' | 'black' | 'auto'>('auto');
  const batchRef = useRef<HTMLDivElement>(null);
  
  const stats = getTournamentStats(tournament);
  const currentRoundData = tournament.rounds.find(r => r.roundNumber === selectedRound);
  const isCurrentRoundActive = selectedRound === tournament.currentRound;
  const isTournamentComplete = tournament.status === 'completed' || tournament.currentRound >= tournament.totalRounds;

  // Generate pairings
  const handleGeneratePairings = async () => {
    if (tournament.players.length < 2) {
      setError('At least 2 players required to generate pairings');
      return;
    }

    if (tournament.currentRound >= tournament.totalRounds) {
      setError('All rounds completed');
      return;
    }

    // If not the first round, check current round is complete
    if (currentRoundData) {
      const canAdvance = canAdvanceToNextRound(tournament, currentRoundData);
      if (!canAdvance.canAdvance) {
        setError(`Cannot advance: ${canAdvance.reasons.join(', ')}`);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = generatePairings(tournament);

      if (result.warnings.length > 0) {
        console.warn('Pairing warnings:', result.warnings);
      }

      // Create new round
      const newRound: Round = {
        roundNumber: tournament.currentRound + 1,
        matches: result.matches,
        isComplete: false,
        completedBatches: new Set<number>(),
        generatedAt: new Date(),
      };

      // Add bye if exists
      if (result.byePlayerId) {
        const byePlayer = tournament.players.find(p => p.id === result.byePlayerId);
        if (byePlayer) {
          const byeMatch: Match = {
            board: 0,
            batch: 0,
            whiteId: result.byePlayerId,
            blackId: result.byePlayerId,
            result: 'bye',
          };
          newRound.matches.push(byeMatch);
          byePlayer.hadBye = true;
          byePlayer.byeRound = newRound.roundNumber;
        }
      }

      // Validate new round integrity
      try {
        validateRoundIntegrity(newRound.matches);
      } catch (validationErr) {
        throw new Error(`Round validation failed: ${validationErr instanceof Error ? validationErr.message : 'Unknown error'}`);
      }

      const updated: Tournament = {
        ...tournament,
        rounds: [...tournament.rounds, newRound],
        currentRound: tournament.currentRound + 1,
        status: tournament.currentRound + 1 >= tournament.totalRounds ? 'completed' : 'in-progress',
        isComplete: tournament.currentRound + 1 >= tournament.totalRounds,
      };

      // Recalculate stats after new round
      const allMatches = updated.rounds.flatMap(r => r.matches);
      const withStats = {
        ...updated,
        players: recalculateAllStats(updated.players, allMatches),
      };

      saveTournament(withStats);
      onTournamentUpdate(withStats);
      setShowGenerateConfirm(false);
      setSelectedRound(withStats.currentRound);
    } catch (err) {
      setError(`Failed to generate pairings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Record match result
  const handleRecordResult = (matchIdx: number, result: string) => {
    if (!currentRoundData) return;

    try {
      const updated = {
        ...tournament,
        rounds: tournament.rounds.map(r => {
          if (r.roundNumber === selectedRound) {
            return {
              ...r,
              matches: r.matches.map((m, idx) =>
                idx === matchIdx ? { ...m, result: result as any } : m
              ),
            };
          }
          return r;
        }),
      };

      // Validate updated round
      try {
        const updatedRound = updated.rounds.find(r => r.roundNumber === selectedRound);
        if (updatedRound) {
          validateRoundIntegrity(updatedRound.matches);
        }
      } catch (validationErr) {
        throw new Error(`Validation failed: ${validationErr instanceof Error ? validationErr.message : 'Unknown error'}`);
      }

      // Recalculate stats
      const allMatches = updated.rounds.flatMap(r => r.matches);
      const withStats = {
        ...updated,
        players: recalculateAllStats(updated.players, allMatches),
      };

      saveTournament(withStats);
      onTournamentUpdate(withStats);
      setError(null);
    } catch (err) {
      setError(`Failed to record result: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Handle player search
  useEffect(() => {
    if (!searchQuery || !currentRoundData) {
      setHighlightedBatch(null);
      return;
    }

    const result = findPlayerInRound(searchQuery, currentRoundData, tournament.players);
    if (result.boardInfo) {
      setHighlightedBatch(result.boardInfo.batch);
      // Scroll into view after a short delay
      setTimeout(() => {
        const element = document.querySelector(`[data-batch="${result.boardInfo?.batch}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else {
      setHighlightedBatch(null);
    }
  }, [searchQuery, currentRoundData, tournament.players]);

  // Handle manual pairing
  const handleAddManualPairing = () => {
    if (!currentRoundData) return;
    if (!manualPlayer1 || !manualPlayer2) {
      setError('Select two players');
      return;
    }

    // Validate the pairing
    const validation = validatePairingAddition(
      manualPlayer1,
      manualPlayer2,
      currentRoundData,
      tournament,
      tournament.players
    );

    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    try {
      // Determine colors
      let whiteId = manualPlayer1;
      let blackId = manualPlayer2;

      if (manualColorAssignment === 'black') {
        [whiteId, blackId] = [blackId, whiteId];
      } else if (manualColorAssignment === 'auto') {
        // Auto-assign based on current color counts
        const p1ColorCount = tournament.players.find(p => p.id === manualPlayer1)?.colors.length || 0;
        const p2ColorCount = tournament.players.find(p => p.id === manualPlayer2)?.colors.length || 0;
        if (p1ColorCount > p2ColorCount) {
          [whiteId, blackId] = [blackId, whiteId];
        }
      }

      // Find next batch and board
      let maxBatch = Math.max(...currentRoundData.matches.map(m => m.batch), 0);
      let maxBoardInLastBatch = Math.max(
        ...currentRoundData.matches.filter(m => m.batch === maxBatch).map(m => m.board),
        0
      );

      let batch = maxBatch;
      let board = maxBoardInLastBatch + 1;

      // If board exceeds totalBoards, create new batch
      if (board > tournament.totalBoards) {
        batch = maxBatch + 1;
        board = 1;
      }

      const newMatch: Match = {
        board,
        batch,
        whiteId,
        blackId,
        result: null,
      };

      const updated = {
        ...tournament,
        rounds: tournament.rounds.map(r => {
          if (r.roundNumber === selectedRound) {
            // Add match and validate
            const newMatches = [...r.matches, newMatch];
            validateRoundIntegrity(newMatches);
            return {
              ...r,
              matches: newMatches,
            };
          }
          return r;
        }),
      };

      saveTournament(updated);
      onTournamentUpdate(updated);
      setShowManualPairingDialog(false);
      setManualPlayer1('');
      setManualPlayer2('');
      setManualColorAssignment('auto');
      setError(null);
    } catch (err) {
      setError(`Failed to add pairing: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tournament Completion State */}
      {isTournamentComplete && (
        <Card className="p-8 bg-linear-to-r from-amber-50 to-yellow-50 border-amber-200">
          <div className="flex items-center gap-4">
            <Trophy className="h-8 w-8 text-amber-600" />
            <div>
              <h3 className="text-2xl font-bold text-amber-900">🏆 Tournament Complete</h3>
              <p className="text-sm text-amber-700 mt-1">
                Final standings are shown in the Standings tab
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Round Progress */}
      {currentRoundData && isCurrentRoundActive && !isTournamentComplete && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">
                Round {selectedRound} of {tournament.totalRounds}
              </h3>
              <div className="flex gap-4 mt-2 text-sm text-blue-700">
                {(() => {
                  const progress = getRoundProgress(currentRoundData);
                  return (
                    <>
                      <span>Progress: {progress.completed} / {progress.total} matches completed</span>
                      <div className="w-48 bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                      <span>{progress.percentage}%</span>
                    </>
                  );
                })()}
              </div>
            </div>
            <Button
              onClick={() => setShowGenerateConfirm(true)}
              disabled={!allMatchesCompleted(currentRoundData) || isLoading || selectedRound >= tournament.totalRounds}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Next Round
            </Button>
          </div>
        </Card>
      )}

      {/* Generate Round Section */}
      {tournament.currentRound === 0 || (tournament.currentRound < tournament.totalRounds && !currentRoundData) ? (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Generate Pairings</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Round {tournament.currentRound + 1} of {tournament.totalRounds}
              </p>
              <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                <p>• Players: <strong>{stats.totalPlayers}</strong></p>
                <p>• Matches: <strong>{stats.matchesPerRound}</strong></p>
                <p>• Batches: <strong>{stats.batchesRequired}</strong></p>
                <p>• Boards per batch: <strong>{tournament.totalBoards}</strong></p>
              </div>
            </div>

            <Button
              onClick={() => setShowGenerateConfirm(true)}
              disabled={tournament.players.length < 2 || isLoading}
              size="lg"
              className="gap-2 w-full"
            >
              <Play className="h-4 w-4" />
              {isLoading ? 'Generating...' : 'Generate Round Pairings'}
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Pairings Display */}
      {currentRoundData && !isTournamentComplete && (
        <Card>
          <div className="p-6 border-b space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  Round {selectedRound} Pairings
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentRoundData.matches.length} matches
                </p>
              </div>
              <Select value={selectedRound.toString()} onValueChange={(val) => setSelectedRound(parseInt(val))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tournament.rounds.map(r => (
                    <SelectItem key={r.roundNumber} value={r.roundNumber.toString()}>
                      Round {r.roundNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Bar */}
            {isCurrentRoundActive && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search player name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && highlightedBatch && (
                  <div className="absolute top-full left-0 mt-2 bg-blue-50 border border-blue-200 rounded-md p-2 text-sm text-blue-900 whitespace-nowrap">
                    Found on Board {highlightedBatch}
                  </div>
                )}
              </div>
            )}

            {/* Manual Pairing Button */}
            {isCurrentRoundActive && (
              <Button
                onClick={() => setShowManualPairingDialog(true)}
                variant="outline"
                className="gap-2 w-full"
              >
                <Plus className="h-4 w-4" />
                Add Manual Pairing (Admin Override)
              </Button>
            )}
          </div>

          {/* Matches by Batch */}
          <div className="p-6 space-y-6">
            {Array.from({ length: Math.max(...currentRoundData.matches.map(m => m.batch), 0) }).map((_, batchIdx) => {
              const batchNumber = batchIdx + 1;
              const batchMatches = currentRoundData.matches.filter(m => m.batch === batchNumber);
              const isHighlighted = highlightedBatch === batchNumber;

              return (
                <div
                  key={batchNumber}
                  ref={isHighlighted ? batchRef : null}
                  data-batch={batchNumber}
                  className={`transition-all ${isHighlighted ? 'ring-2 ring-blue-500 rounded-lg p-4 bg-blue-50' : ''}`}
                >
                  <h4 className="font-semibold mb-3">Batch {batchNumber}</h4>
                  <div className="space-y-2">
                    {batchMatches.map((match, idx) => {
                      const whitePlayer = tournament.players.find(p => p.id === match.whiteId);
                      const blackPlayer = tournament.players.find(p => p.id === match.blackId);

                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-muted rounded-md"
                        >
                          <span className="text-sm font-medium min-w-12">
                            B{match.batch}
                          </span>
                          <div className="flex-1 flex items-center gap-4">
                            <div className="flex-1">
                              <p className="text-sm">
                                <span className="font-medium">{whitePlayer?.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  (W)
                                </span>
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">vs</span>
                            <div className="flex-1">
                              <p className="text-sm">
                                <span className="font-medium">{blackPlayer?.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  (B)
                                </span>
                              </p>
                            </div>
                          </div>
                          <Select
                            value={match.result || ''}
                            onValueChange={(val) => handleRecordResult(currentRoundData.matches.indexOf(match), val)}
                            disabled={!isCurrentRoundActive}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="Result" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1-0">1-0</SelectItem>
                              <SelectItem value="0-1">0-1</SelectItem>
                              <SelectItem value="1/2-1/2">½-½</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Generate Confirmation Dialog */}
      <Dialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Round {tournament.currentRound + 1} Pairings?</DialogTitle>
            <DialogDescription>
              This will generate pairings for the next round based on current standings.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted p-4 rounded-md space-y-2">
            <p className="text-sm font-medium">Round Configuration:</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Players: {stats.totalPlayers}</li>
              <li>• Matches: {stats.matchesPerRound}</li>
              <li>• Batches: {stats.batchesRequired}</li>
              <li>• Boards: {tournament.totalBoards}</li>
            </ul>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowGenerateConfirm(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleGeneratePairings} disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Pairing Dialog */}
      <Dialog open={showManualPairingDialog} onOpenChange={setShowManualPairingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Manual Pairing</DialogTitle>
            <DialogDescription>
              Override pairing rules to manually assign players (admin only)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="player1">Player 1</Label>
              <Select value={manualPlayer1} onValueChange={setManualPlayer1}>
                <SelectTrigger id="player1">
                  <SelectValue placeholder="Select player..." />
                </SelectTrigger>
                <SelectContent>
                  {tournament.players.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.rating})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="player2">Player 2</Label>
              <Select value={manualPlayer2} onValueChange={setManualPlayer2}>
                <SelectTrigger id="player2">
                  <SelectValue placeholder="Select player..." />
                </SelectTrigger>
                <SelectContent>
                  {tournament.players.map(p => (
                    <SelectItem key={p.id} value={p.id} disabled={p.id === manualPlayer1}>
                      {p.name} ({p.rating})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color Assignment</Label>
              <Select value={manualColorAssignment} onValueChange={(v: any) => setManualColorAssignment(v)}>
                <SelectTrigger id="color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (balanced)</SelectItem>
                  <SelectItem value="white">Player 1 = White</SelectItem>
                  <SelectItem value="black">Player 1 = Black</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowManualPairingDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddManualPairing}>Add Pairing</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
