'use client';

import { useState, useEffect } from 'react';
import { Tournament, Player, TournamentSettings, Match, GameResult } from '@/lib/types';
import { generatePairings } from '@/lib/pairingEngine';
import { recalculateAllStats } from '@/lib/tiebreaks';
import { generatePairingsHTML } from '@/lib/pdfExport';
import {
  saveTournament,
  loadTournament,
  exportTournamentJSON,
  importTournamentJSON,
  exportStandingsCSV,
  exportPairingsCSV,
  exportStandingsToExcel,
  downloadCSV,
  resetAllData,
} from '@/lib/storage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SetupTab } from './SetupTab';
import { ImportTab } from './ImportTab';
import { PlayersTab } from './PlayersTab';
import { PairingsTab } from './PairingsTab';
import { StandingsTab } from './StandingsTab';
import { SettingsTab } from './SettingsTab';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export function TournamentDashboard() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load tournament from storage on mount
  useEffect(() => {
    const saved = loadTournament();
    if (saved) {
      setTournament(saved);
      // Check dark mode preference
      const isDark = localStorage.getItem('theme') === 'dark';
      setIsDarkMode(isDark);
      applyTheme(isDark);
    }
    setIsLoading(false);
  }, []);

  // Apply theme
  const applyTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  };

  // Create a new tournament
  const handleCreateTournament = (
    name: string,
    rounds: number,
    settings: TournamentSettings
  ) => {
    try {
      const newTournament: Tournament = {
        id: uuidv4(),
        name,
        totalRounds: rounds,
        players: [],
        rounds: [],
        settings,
        createdAt: new Date(),
        updatedAt: new Date(),
        currentRound: 0,
        isComplete: false,
      };

      setTournament(newTournament);
      saveTournament(newTournament);
      setError(null);
    } catch (err) {
      setError(`Failed to create tournament: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Add player
  const handleAddPlayer = (name: string, rating: number) => {
    if (!tournament) return;

    try {
      const newPlayer: Player = {
        id: uuidv4(),
        name,
        rating,
        score: 0,
        buchholz: 0,
        sonnebornBerger: 0,
        wins: 0,
        opponents: [],
        colors: [],
        hadBye: false,
      };

      const updated = {
        ...tournament,
        players: [...tournament.players, newPlayer],
        updatedAt: new Date(),
      };

      setTournament(updated);
      saveTournament(updated);
      setError(null);
    } catch (err) {
      setError(`Failed to add player: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Import players from Excel
  const handleImportPlayers = (players: Player[]) => {
    if (!tournament) return;

    try {
      // Can only import before tournament has started (no rounds generated yet)
      if (tournament.rounds.length > 0) {
        setError('Cannot import players after tournament has started.');
        return;
      }

      // Replace existing players or merge with existing
      const updated = {
        ...tournament,
        players: [...tournament.players, ...players],
        updatedAt: new Date(),
      };

      setTournament(updated);
      saveTournament(updated);
      setError(null);
    } catch (err) {
      setError(`Failed to import players: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Remove player
  const handleRemovePlayer = (playerId: string) => {
    if (!tournament) return;

    try {
      const updated = {
        ...tournament,
        players: tournament.players.filter((p) => p.id !== playerId),
        updatedAt: new Date(),
      };

      setTournament(updated);
      saveTournament(updated);
      setError(null);
    } catch (err) {
      setError(`Failed to remove player: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Generate pairings
  const handleGeneratePairings = () => {
    if (!tournament) return;

    try {
      // Check 6-round limit
      if (tournament.currentRound >= 6) {
        setError('Tournament is complete. All 6 rounds have been generated.');
        return;
      }

      // Check if previous round is complete
      if (tournament.currentRound > 0) {
        const prevRound = tournament.rounds[tournament.currentRound - 1];
        if (!prevRound.isComplete) {
          setError('Cannot generate next round until current round is complete');
          return;
        }
      }

      const pairingResult = generatePairings(tournament);

      if (pairingResult.warnings.length > 0) {
        // Pairing warnings are silently logged
      }

      // Check for pairing errors (duplicate players in round)
      if (pairingResult.warnings.some(w => w.includes('multiple times'))) {
        setError(`Pairing error: ${pairingResult.warnings.join('; ')}`);
        return;
      }

      // Create new round with batch tracking
      const roundNumber = tournament.currentRound + 1;
      const newRound = {
        roundNumber,
        matches: pairingResult.matches,
        isComplete: false,
        completedBatches: new Set<number>(),
        generatedAt: new Date(),
      };

      // Update players with bye if applicable
      let updatedPlayers = [...tournament.players];
      if (pairingResult.byePlayerId) {
        updatedPlayers = updatedPlayers.map((p) =>
          p.id === pairingResult.byePlayerId
            ? {
                ...p,
                hadBye: true,
                byeRound: roundNumber,
                score: p.score + tournament.settings.byeValue,
              }
            : p
        );
      }

      // Add colors to matches and update player colors
      const matchesWithColors = newRound.matches.map((match, index) => {
        const whitePlayer = updatedPlayers.find((p) => p.id === match.whiteId);
        const blackPlayer = updatedPlayers.find((p) => p.id === match.blackId);

        if (whitePlayer && blackPlayer) {
          updatedPlayers = updatedPlayers.map((p) => {
            if (p.id === match.whiteId) {
              return {
                ...p,
                colors: [...p.colors, 'white'],
                opponents: [...p.opponents, match.blackId],
              };
            }
            if (p.id === match.blackId) {
              return {
                ...p,
                colors: [...p.colors, 'black'],
                opponents: [...p.opponents, match.whiteId],
              };
            }
            return p;
          });
        }

        return match;
      });

      const updated = {
        ...tournament,
        players: updatedPlayers,
        rounds: [...tournament.rounds, newRound],
        currentRound: roundNumber,
        updatedAt: new Date(),
      };

      setTournament(updated);
      saveTournament(updated);
      setError(null);
    } catch (err) {
      setError(`Failed to generate pairings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Update result
  const handleUpdateResult = (
    roundNumber: number,
    boardNumber: number,
    result: GameResult
  ) => {
    if (!tournament) return;

    try {
      const roundIndex = roundNumber - 1;
      if (roundIndex < 0 || roundIndex >= tournament.rounds.length) return;

      const round = tournament.rounds[roundIndex];
      const matchIndex = round.matches.findIndex((m) => m.board === boardNumber);
      if (matchIndex < 0) return;

      // Update match result
      const newRound = {
        ...round,
        matches: round.matches.map((m, i) =>
          i === matchIndex ? { ...m, result } : m
        ),
      };

      // Check if all matches are now complete
      const allComplete = newRound.matches.every((m) => m.result !== null);

      // Rebuild all matches from all rounds including the updated one
      let allMatches: Match[] = [];
      tournament.rounds.forEach((r, idx) => {
        if (idx === roundIndex) {
          allMatches = allMatches.concat(newRound.matches);
        } else {
          allMatches = allMatches.concat(r.matches);
        }
      });

      // Recalculate all player scores and tiebreaks
      const updatedPlayers = recalculateAllStats(tournament.players, allMatches);

      const updated = {
        ...tournament,
        players: updatedPlayers,
        rounds: tournament.rounds.map((r, i) =>
          i === roundIndex
            ? {
                ...newRound,
                isComplete: allComplete,
                completedAt: allComplete ? new Date() : r.completedAt,
              }
            : r
        ),
        updatedAt: new Date(),
      };

      setTournament(updated);
      saveTournament(updated);
      setError(null);
    } catch (err) {
      setError(`Failed to update result: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Finalize round
  const handleFinalizeRound = () => {
    if (!tournament || tournament.currentRound === 0) return;

    try {
      const roundIndex = tournament.currentRound - 1;
      const updated = {
        ...tournament,
        rounds: tournament.rounds.map((r, i) =>
          i === roundIndex ? { ...r, isComplete: true, completedAt: new Date() } : r
        ),
        updatedAt: new Date(),
      };

      setTournament(updated);
      saveTournament(updated);
      setError(null);
    } catch (err) {
      setError(`Failed to finalize round: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Export handlers
  const handleExportJSON = () => {
    if (!tournament) return;
    try {
      exportTournamentJSON(tournament);
    } catch (err) {
      setError(`Failed to export: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleExportCSV = () => {
    if (!tournament) return;
    try {
      const csv = exportStandingsCSV(tournament);
      downloadCSV(
        csv,
        `${tournament.name.replace(/\s+/g, '_')}_standings_${new Date().toISOString().split('T')[0]}.csv`
      );
    } catch (err) {
      setError(`Failed to export: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleExportExcel = () => {
    if (!tournament) {
      setError('No tournament data to export');
      return;
    }

    try {
      exportStandingsToExcel(tournament, tournament.currentRound);
      setError(null);
    } catch (err) {
      setError(`Failed to export: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleExportPairingsHTML = () => {
    if (!tournament || tournament.currentRound === 0) {
      setError('No pairings generated yet');
      return;
    }

    try {
      const round = tournament.rounds[tournament.currentRound - 1];
      const html = generatePairingsHTML(tournament, round);

      // Open HTML in new window for printing to PDF
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
      }
    } catch (err) {
      setError(`Failed to export: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleImportJSON = (json: string) => {
    try {
      const imported = importTournamentJSON(json);
      setTournament(imported);
      setError(null);
    } catch (err) {
      setError(`Failed to import: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure? This will permanently delete all tournament data.')) {
      resetAllData();
      setTournament(null);
      setError(null);
    }
  };

  const handleToggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    applyTheme(newMode);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 p-4 sm:p-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {tournament?.name || 'Swiss Tournament Manager'}
        </h1>
        {tournament && (
          <p className="mt-1 text-sm text-muted-foreground">
            {tournament.players.length} players • Round {tournament.currentRound} /{' '}
            {tournament.totalRounds}
          </p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-6 overflow-x-auto">
          <TabsTrigger value="setup" className="text-xs sm:text-sm">Setup</TabsTrigger>
          <TabsTrigger value="import" className="text-xs sm:text-sm">Import</TabsTrigger>
          <TabsTrigger value="players" className="text-xs sm:text-sm">Players</TabsTrigger>
          <TabsTrigger value="pairings" className="text-xs sm:text-sm">Pairings</TabsTrigger>
          <TabsTrigger value="standings" className="text-xs sm:text-sm">Standings</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="mt-6">
          <SetupTab
            tournament={tournament}
            onCreateTournament={handleCreateTournament}
          />
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <ImportTab
            onImport={handleImportPlayers}
            isDisabled={tournament ? tournament.rounds.length > 0 : false}
          />
        </TabsContent>

        <TabsContent value="players" className="mt-6">
          <PlayersTab
            tournament={tournament}
            onAddPlayer={handleAddPlayer}
            onRemovePlayer={handleRemovePlayer}
          />
        </TabsContent>

        <TabsContent value="pairings" className="mt-6">
          <PairingsTab
            tournament={tournament}
            onGeneratePairings={handleGeneratePairings}
            onUpdateResult={handleUpdateResult}
            onFinalizeRound={handleFinalizeRound}
          />
        </TabsContent>

        <TabsContent value="standings" className="mt-6">
          <StandingsTab
            tournament={tournament}
            onExportPDF={handleExportPairingsHTML}
            onExportCSV={handleExportCSV}
            onExportExcel={handleExportExcel}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab
            tournament={tournament}
            isDarkMode={isDarkMode}
            onToggleDarkMode={handleToggleDarkMode}
            onExportJSON={handleExportJSON}
            onExportCSV={handleExportCSV}
            onImportJSON={handleImportJSON}
            onReset={handleReset}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
