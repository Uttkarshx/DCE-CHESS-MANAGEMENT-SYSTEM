'use client';

import { useState } from 'react';
import { Tournament, TournamentSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SetupTabProps {
  tournament: Tournament | null;
  onCreateTournament: (name: string, rounds: number, settings: TournamentSettings) => void;
}

export function SetupTab({ tournament, onCreateTournament }: SetupTabProps) {
  const [name, setName] = useState(tournament?.name || '');
  const [byeValue, setByeValue] = useState<0.5 | 1>(tournament?.settings.byeValue || 1);
  const [round1PairingMethod, setRound1PairingMethod] = useState<'random' | 'alphabetical'>(
    tournament?.settings.round1PairingMethod || 'random'
  );

  const FIXED_ROUNDS = 6; // Fixed 6 rounds for this tournament system
  const FIXED_BOARDS = 6; // Fixed 6 boards available

  const handleCreate = () => {
    if (!name.trim()) {
      alert('Please enter a tournament name');
      return;
    }

    const settings: TournamentSettings = {
      byeValue,
      colorBalanceStrict: false,
      floatingEnabled: true,
      round1PairingMethod,
    };

    onCreateTournament(name, FIXED_ROUNDS, settings);
  };

  const isDisabled = tournament && tournament.currentRound > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tournament Settings</CardTitle>
          <CardDescription>
            Configure your Swiss system tournament parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tournament Name */}
          <div className="space-y-2">
            <Label htmlFor="tournament-name">Tournament Name</Label>
            <Input
              id="tournament-name"
              placeholder="e.g., March Open Chess Tournament"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isDisabled}
            />
          </div>

          {/* Fixed Rounds */}
          <div className="space-y-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 border border-blue-200 dark:border-blue-900">
            <Label>Tournament Format</Label>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Rounds: <span className="text-blue-600 dark:text-blue-400">6 Swiss Rounds (Fixed)</span></p>
              <p className="text-sm font-medium">Boards: <span className="text-blue-600 dark:text-blue-400">6 Physical Boards</span></p>
              <p className="text-xs text-muted-foreground mt-2">
                The tournament will run exactly 6 rounds of Swiss system pairing. With 6 boards available, multiple batches will be scheduled per round as needed.
              </p>
            </div>
          </div>

          {/* Bye Value */}
          <div className="space-y-2">
            <Label htmlFor="bye-value">Points for Bye</Label>
            <Select
              value={byeValue.toString()}
              onValueChange={(value) => setByeValue(parseFloat(value) as 0.5 | 1)}
              disabled={isDisabled}
            >
              <SelectTrigger id="bye-value">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5 point (draw)</SelectItem>
                <SelectItem value="1">1 point (win)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Round 1 Pairing Method */}
          <div className="space-y-2">
            <Label htmlFor="pairing-method">Round 1 Pairing Method</Label>
            <Select
              value={round1PairingMethod}
              onValueChange={(value) => setRound1PairingMethod(value as 'random' | 'alphabetical')}
              disabled={isDisabled}
            >
              <SelectTrigger id="pairing-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">Random Shuffle</SelectItem>
                <SelectItem value="alphabetical">Alphabetical Order</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Since players have no ratings, first round pairings are determined by shuffle or alphabetical sorting.
            </p>
          </div>

          {/* Current Status */}
          {tournament && (
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Tournament Active
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-200">
                Players: {tournament.players.length} | Rounds: {tournament.totalRounds} |
                Current Round: {tournament.currentRound}
              </p>
              <p className="mt-2 text-xs text-blue-600 dark:text-blue-300">
                Note: Settings are locked while tournament is in progress
              </p>
            </div>
          )}

          {/* Create/Start Button */}
          <Button
            onClick={handleCreate}
            size="lg"
            className="w-full"
            disabled={!name.trim()}
          >
            {tournament ? 'Update Tournament' : 'Create Tournament'}
          </Button>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Swiss System</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>
            Swiss system tournaments pair players based on performance, not just a bracket.
          </p>
          <p>
            Players with similar scores play each other, ensuring competitive fairness and
            multiple rounds for all participants.
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>No elimination - everyone plays all rounds</li>
            <li>Fair pairings - similar-strength opponents</li>
            <li>Ranking determined by score + tie-breaks</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
