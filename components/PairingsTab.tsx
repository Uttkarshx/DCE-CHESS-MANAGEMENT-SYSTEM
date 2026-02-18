'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Tournament, Match, GameResult, Player } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Zap, Check, Clock, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface PairingsTabProps {
  tournament: Tournament | null;
  onGeneratePairings: () => void;
  onUpdateResult: (roundNumber: number, boardNumber: number, result: GameResult) => void;
  onFinalizeRound: () => void;
}

export function PairingsTab({
  tournament,
  onGeneratePairings,
  onUpdateResult,
  onFinalizeRound,
}: PairingsTabProps) {
  const [expandedBoard, setExpandedBoard] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const boardRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  if (!tournament) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Create a tournament first</p>
      </div>
    );
  }

  if (tournament.players.length < 2) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You need at least 2 players to generate pairings
        </AlertDescription>
      </Alert>
    );
  }

  const currentRound = tournament.currentRound;
  const roundData =
    currentRound > 0 && tournament.rounds[currentRound - 1]
      ? tournament.rounds[currentRound - 1]
      : null;

  const isRoundComplete = roundData?.isComplete;
  const completedMatches = roundData?.matches.filter((m) => m.result !== null).length || 0;
  const totalMatches = roundData?.matches.length || 0;
  const progressPercent = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

  // Filter boards by search
  const filteredMatches = useMemo(() => {
    if (!roundData) return [];
    if (!searchQuery.trim()) return roundData.matches;

    const query = searchQuery.toLowerCase();
    return roundData.matches.filter((match) => {
      const whitePlayer = tournament.players.find((p) => p.id === match.whiteId);
      const blackPlayer = tournament.players.find((p) => p.id === match.blackId);

      return (
        whitePlayer?.name.toLowerCase().includes(query) ||
        blackPlayer?.name.toLowerCase().includes(query)
      );
    });
  }, [roundData, searchQuery, tournament.players]);

  // Auto-scroll to matching board
  useEffect(() => {
    if (filteredMatches.length > 0 && searchQuery.trim()) {
      const firstBoard = filteredMatches[0].board;
      const element = boardRefs.current[firstBoard];
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    }
  }, [filteredMatches, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Round Status */}
      {tournament.currentRound > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Round {tournament.currentRound} / 6</CardTitle>
            <CardDescription>
              {isRoundComplete ? 'Round completed - ready for next round' : 'Round in progress'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">Round Progress</p>
                  <p className="text-sm text-muted-foreground">
                    {completedMatches}/{totalMatches} matches completed
                  </p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {!isRoundComplete && (
                  <Button
                    onClick={onFinalizeRound}
                    disabled={completedMatches < totalMatches}
                    className="w-full sm:w-auto"
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Finalize Round
                  </Button>
                )}
                {isRoundComplete && tournament.currentRound < tournament.totalRounds && (
                  <Button onClick={onGeneratePairings} className="w-full sm:w-auto">
                    <Zap className="mr-2 h-4 w-4" />
                    Generate Next Round
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Generate Pairings</CardTitle>
            <CardDescription>Start Round 1</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onGeneratePairings} size="lg" className="w-full">
              Generate Round 1 Pairings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Matches Display */}
      {roundData && roundData.matches.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold">Matches ({filteredMatches.length})</h3>
            <Input
              placeholder="Search player name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sm:max-w-xs"
            />
          </div>

          {filteredMatches.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed p-8 text-center">
              <p className="text-muted-foreground">No matches found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Group matches by batch */}
              {Array.from(
                new Map(
                  filteredMatches.map(m => [m.batch, m])
                ).entries()
              ).map(([batchNum, _]) => {
                const batchMatches = filteredMatches.filter(m => m.batch === batchNum);
                return (
                  <div key={batchNum} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1 flex-1 bg-gradient-to-r from-primary/60 to-primary/20 rounded" />
                      <h4 className="text-sm font-semibold text-muted-foreground whitespace-nowrap">
                        Batch {batchNum}
                      </h4>
                      <div className="h-1 flex-1 bg-gradient-to-l from-primary/60 to-primary/20 rounded" />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {batchMatches.map((match) => (
                        <div
                          key={`${match.batch}-${match.board}`}
                          ref={(el) => {
                            if (el) boardRefs.current[`${match.batch}-${match.board}`] = el;
                          }}
                        >
                          <MatchCard
                            match={match}
                            tournament={tournament}
                            isExpanded={expandedBoard === `${match.batch}-${match.board}`}
                            onExpand={() =>
                              setExpandedBoard(
                                expandedBoard === `${match.batch}-${match.board}`
                                  ? null
                                  : `${match.batch}-${match.board}`
                              )
                            }
                            onUpdateResult={(result) =>
                              onUpdateResult(tournament.currentRound, match.board, result)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : tournament.currentRound === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-8 text-center">
          <p className="text-muted-foreground">Pairings will appear here after generation</p>
        </div>
      ) : null}
    </div>
  );
}

interface MatchCardProps {
  match: Match;
  tournament: Tournament;
  isExpanded: boolean;
  onExpand: () => void;
  onUpdateResult: (result: GameResult) => void;
}

function MatchCard({
  match,
  tournament,
  isExpanded,
  onExpand,
  onUpdateResult,
}: MatchCardProps) {
  const whitePlayer = tournament.players.find((p) => p.id === match.whiteId);
  const blackPlayer = tournament.players.find((p) => p.id === match.blackId);

  if (!whitePlayer || !blackPlayer) return null;

  const isBye = match.result === 'bye';
  const isComplete = match.result !== null;

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isComplete ? 'bg-green-50 dark:bg-green-950/20' : ''
      }`}
      onClick={onExpand}
    >
      <CardContent className="pt-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-muted-foreground">Board {match.board}</p>
            {isComplete && (
              <Badge variant="default" className="gap-1">
                <Check className="h-3 w-3" />
                Done
              </Badge>
            )}
            {!isComplete && !isBye && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                Pending
              </Badge>
            )}
          </div>

          {isBye ? (
            <div className="text-center py-2">
              <p className="font-medium text-sm">{whitePlayer.name}</p>
              <Badge className="mt-1">BYE</Badge>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{whitePlayer.name}</p>
                  <p className="text-xs text-muted-foreground">White</p>
                </div>
                {match.result && (
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
                    {getResultDisplay(match.result, true)}
                  </div>
                )}
              </div>

              <div className="my-1 border-t" />

              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{blackPlayer.name}</p>
                  <p className="text-xs text-muted-foreground">Black</p>
                </div>
                {match.result && (
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-secondary text-xs font-bold text-secondary-foreground">
                    {getResultDisplay(match.result, false)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Result Buttons */}
        {isExpanded && !match.result && !isBye && (
          <div className="mt-4 space-y-2 border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground">Enter Result:</p>
            <div className="grid grid-cols-3 gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateResult('1-0');
                }}
                className="flex-col text-xs h-auto py-2"
              >
                <span className="font-bold">✅</span>
                <span className="text-xs">{whitePlayer.name.split(' ')[0]} Wins</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateResult('1/2-1/2');
                }}
                className="flex-col text-xs h-auto py-2"
              >
                <span className="font-bold">🤝</span>
                <span className="text-xs">Draw</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateResult('0-1');
                }}
                className="flex-col text-xs h-auto py-2"
              >
                <span className="font-bold">✅</span>
                <span className="text-xs">{blackPlayer.name.split(' ')[0]} Wins</span>
              </Button>
            </div>
          </div>
        )}

        {match.result && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateResult(null);
            }}
            className="mt-2 w-full text-xs text-destructive hover:text-destructive"
          >
            Clear Result
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function getResultDisplay(result: GameResult, isWhite: boolean): string {
  if (result === '1-0') return isWhite ? '1' : '0';
  if (result === '0-1') return isWhite ? '0' : '1';
  if (result === '1/2-1/2') return '½';
  return '';
}
