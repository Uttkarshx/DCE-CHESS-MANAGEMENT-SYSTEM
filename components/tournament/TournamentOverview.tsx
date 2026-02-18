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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Players</p>
          <p className="text-3xl font-bold">{stats.totalPlayers}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.matchesPerRound} matches per round
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Boards</p>
          <p className="text-3xl font-bold">{tournament.totalBoards}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.batchesRequired} batches needed
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Current Round</p>
          <p className="text-3xl font-bold">
            {tournament.currentRound}/{tournament.totalRounds}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {tournament.isComplete ? 'Completed' : 'In Progress'}
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Status</p>
          <div className="flex items-center gap-2 mt-2">
            <div
              className={`h-3 w-3 rounded-full ${
                tournament.status === 'completed'
                  ? 'bg-green-500'
                  : tournament.status === 'in-progress'
                    ? 'bg-blue-500'
                    : 'bg-gray-400'
              }`}
            />
            <span className="text-sm font-medium capitalize">{tournament.status}</span>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setShowSettings(true)}
            variant="outline"
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button
            onClick={handleGenerateNextRound}
            disabled={tournament.currentRound >= tournament.totalRounds || isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate Next Round'}
          </Button>
          <Button
            onClick={handleExportStandings}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export Standings
          </Button>
        </div>
      </Card>

      {/* Tournament Details */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Tournament Details</h3>
        <div className="grid gap-4 md:grid-cols-2">
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
      </Card>

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
