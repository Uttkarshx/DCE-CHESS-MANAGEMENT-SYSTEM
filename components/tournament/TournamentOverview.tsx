'use client';

import { useState } from 'react';
import { Tournament } from '@/lib/types';
import { saveTournament, getTournamentStats } from '@/lib/tournamentStorage';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Settings, Download } from 'lucide-react';
import { exportStandingsToExcel } from '@/lib/storage';
import { TournamentSettingsDialog } from './TournamentSettingsDialog';

interface TournamentOverviewProps {
  tournament: Tournament;
  onTournamentUpdate: (tournament: Tournament) => void;
}

export function TournamentOverview({ tournament, onTournamentUpdate }: TournamentOverviewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const stats = getTournamentStats(tournament);

  const handleGenerateNextRound = async () => {
    if (tournament.currentRound >= tournament.totalRounds) {
      setError('All rounds completed');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // This will be triggered by pairings component
      // Just mark tournament as updated
      const updated = { ...tournament };
      onTournamentUpdate(updated);
    } catch (err) {
      setError(`Failed to generate round: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportStandings = () => {
    try {
      exportStandingsToExcel(tournament);
    } catch (err) {
      setError(`Failed to export: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

      {/* Tournament Info Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 hover:scale-[1.01] transition-transform duration-200">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2">Players</p>
          <p className="text-3xl sm:text-4xl font-bold text-white">{stats.totalPlayers}</p>
          <p className="text-xs text-muted-foreground mt-3">
            {stats.matchesPerRound} matches per round
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 hover:scale-[1.01] transition-transform duration-200">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2">Boards</p>
          <p className="text-3xl sm:text-4xl font-bold text-white">{tournament.totalBoards}</p>
          <p className="text-xs text-muted-foreground mt-3">
            {stats.batchesRequired} batches needed
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 hover:scale-[1.01] transition-transform duration-200">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2">Current Round</p>
          <p className="text-3xl sm:text-4xl font-bold text-white">
            {tournament.currentRound}/{tournament.totalRounds}
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            {tournament.isComplete ? 'Completed' : 'In Progress'}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 hover:scale-[1.01] transition-transform duration-200">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2">Status</p>
          <div className="flex items-center gap-2 mt-3">
            <div
              className={`h-3 w-3 rounded-full ${
                tournament.status === 'completed'
                  ? 'bg-green-500'
                  : tournament.status === 'in-progress'
                    ? 'bg-blue-500'
                    : 'bg-zinc-500'
              }`}
            />
            <span className="text-xs sm:text-sm font-medium capitalize text-white">{tournament.status}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-lg font-semibold mb-4">Actions</h3>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <Button
            onClick={() => setShowSettings(true)}
            variant="outline"
            className="gap-2 w-full sm:w-auto"
            size="sm"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button
            onClick={handleGenerateNextRound}
            disabled={tournament.currentRound >= tournament.totalRounds || isLoading}
            className="w-full sm:w-auto"
            size="sm"
          >
            {isLoading ? 'Generating...' : 'Generate Next Round'}
          </Button>
          <Button
            onClick={handleExportStandings}
            variant="outline"
            className="gap-2 w-full sm:w-auto"
            size="sm"
          >
            <Download className="h-4 w-4" />
            Export Standings
          </Button>
        </div>
      </div>

      {/* Tournament Details */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-lg font-semibold mb-4">Tournament Details</h3>
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium">
              {new Date(tournament.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="font-medium">
              {new Date(tournament.updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Bye Points</p>
            <p className="font-medium">{tournament.settings.byeValue} point(s)</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Color Balance</p>
            <p className="font-medium">
              {tournament.settings.colorBalanceStrict ? 'Strict' : 'Relaxed'}
            </p>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <TournamentSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        tournament={tournament}
        onSettingsSaved={(updated: Tournament) => {
          saveTournament(updated);
          onTournamentUpdate(updated);
        }}
      />
    </div>
  );
}
