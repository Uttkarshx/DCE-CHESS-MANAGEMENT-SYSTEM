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
        // Pairing warnings are silently logged
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
        <div className="rounded-2xl border border-green-800/50 bg-gradient-to-r from-green-900/20 to-emerald-900/20 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Trophy className="h-8 w-8 text-green-500 flex-shrink-0" />
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-green-200">🏆 Tournament Complete</h3>
              <p className="text-sm text-green-400/80 mt-1">
                Final standings are shown in the Standings tab
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Round Progress */}
      {currentRoundData && isCurrentRoundActive && !isTournamentComplete && (
        <div className="rounded-2xl border border-blue-800/50 bg-gradient-to-r from-blue-900/20 to-blue-800/20 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="w-full">
              <h3 className="font-semibold text-blue-200">
                Round {selectedRound} of {tournament.totalRounds}
              </h3>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-3 text-sm text-blue-400">
                {(() => {
                  const progress = getRoundProgress(currentRoundData);
                  return (
                    <>
                      <span className="truncate">Progress: {progress.completed} / {progress.total} matches</span>
                      <div className="flex items-center gap-2 flex-1 max-w-xs">
                        <div className="w-full bg-zinc-800 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                        <span className="whitespace-nowrap">{progress.percentage}%</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            <Button
              onClick={() => setShowGenerateConfirm(true)}
              disabled={!allMatchesCompleted(currentRoundData) || isLoading || selectedRound >= tournament.totalRounds}
              className="gap-2 w-full sm:w-auto"
              size="sm"
            >
              <Play className="h-4 w-4" />
              Next Round
            </Button>
          </div>
        </div>
      )}

      {/* Generate Round Section */}
      {tournament.currentRound === 0 || (tournament.currentRound < tournament.totalRounds && !currentRoundData) ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-lg font-semibold mb-4">Generate Pairings</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Round {tournament.currentRound + 1} of {tournament.totalRounds}
              </p>
              <div className="bg-zinc-800/50 p-4 rounded-lg text-sm space-y-2">
                <p>• Players: <strong className="text-white">{stats.totalPlayers}</strong></p>
                <p>• Matches: <strong className="text-white">{stats.matchesPerRound}</strong></p>
                <p>• Batches: <strong className="text-white">{stats.batchesRequired}</strong></p>
                <p>• Boards per batch: <strong className="text-white">{tournament.totalBoards}</strong></p>
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
        </div>
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
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search player name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchQuery && highlightedBatch && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-2 text-sm text-blue-900 dark:text-blue-100">
                    Found on Board {highlightedBatch} - Scroll to view
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
          <div className="space-y-6 px-4 sm:px-6">
            {Array.from({ length: Math.max(...currentRoundData.matches.map(m => m.batch), 0) }).map((_, batchIdx) => {
              const batchNumber = batchIdx + 1;
              const batchMatches = currentRoundData.matches.filter(m => m.batch === batchNumber);
              const isHighlighted = highlightedBatch === batchNumber;

              return (
                <div
                  key={batchNumber}
                  ref={isHighlighted ? batchRef : null}
                  data-batch={batchNumber}
                  className={`transition-all rounded-lg p-4 space-y-3 ${isHighlighted ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'bg-card'}`}
                >
                  <h4 className="font-semibold text-base">Batch {batchNumber}</h4>
                  <div className="space-y-3">
                    {batchMatches.map((match, idx) => {
                      const whitePlayer = tournament.players.find(p => p.id === match.whiteId);
                      const blackPlayer = tournament.players.find(p => p.id === match.blackId);

                      return (
                        <div
                          key={idx}
                          className="bg-muted rounded-md p-3 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3"
                        >
                          <div className="flex-shrink-0">
                            <span className="text-sm font-medium text-muted-foreground">
                              Board {match.board}
                            </span>
                          </div>
                          <div className="flex-1 space-y-2 sm:space-y-0">
                            <div className="space-y-1">
                              <p className="text-sm">
                                <span className="font-medium">{whitePlayer?.name}</span>
                                <span className="text-xs text-muted-foreground ml-1">
                                  (White)
                                </span>
                              </p>
                              <p className="text-xs text-muted-foreground">vs</p>
                              <p className="text-sm">
                                <span className="font-medium">{blackPlayer?.name}</span>
                                <span className="text-xs text-muted-foreground ml-1">
                                  (Black)
                                </span>
                              </p>
                            </div>
                          </div>
                          <Select
                            value={match.result || ''}
                            onValueChange={(val) => handleRecordResult(currentRoundData.matches.indexOf(match), val)}
                            disabled={!isCurrentRoundActive}
                          >
                            <SelectTrigger className="w-full sm:w-28">
                              <SelectValue placeholder="Result" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1-0">White Wins</SelectItem>
                              <SelectItem value="0-1">Black Wins</SelectItem>
                              <SelectItem value="1/2-1/2">Draw</SelectItem>
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
