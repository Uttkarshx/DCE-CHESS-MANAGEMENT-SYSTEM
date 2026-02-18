'use client';

import { useState } from 'react';
import { Player, Tournament } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';

interface PlayersTabProps {
  tournament: Tournament | null;
  onAddPlayer: (name: string, rating: number) => void;
  onRemovePlayer: (playerId: string) => void;
}

export function PlayersTab({
  tournament,
  onAddPlayer,
  onRemovePlayer,
}: PlayersTabProps) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRating, setNewPlayerRating] = useState('');

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) {
      alert('Please enter a player name');
      return;
    }

    const rating = newPlayerRating ? parseInt(newPlayerRating) : 0;
    onAddPlayer(newPlayerName.trim(), rating);
    setNewPlayerName('');
    setNewPlayerRating('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddPlayer();
    }
  };

  const canEdit = !tournament || tournament.currentRound === 0;
  const players = tournament?.players || [];

  return (
    <div className="space-y-6">
      {/* Add Player Form */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Add Player</CardTitle>
            <CardDescription>Add players before starting the tournament</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="player-name">Player Name</Label>
                <Input
                  id="player-name"
                  placeholder="e.g., John Smith"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-rating">Rating (optional)</Label>
                <Input
                  id="player-rating"
                  type="number"
                  placeholder="e.g., 1800"
                  value={newPlayerRating}
                  onChange={(e) => setNewPlayerRating(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
            </div>
            <Button onClick={handleAddPlayer} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Player
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Players List */}
      <Card>
        <CardHeader>
          <CardTitle>Players ({players.length})</CardTitle>
          {!canEdit && (
            <CardDescription className="text-yellow-700 dark:text-yellow-200">
              Tournament in progress - player list is locked
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No players yet. {canEdit ? 'Add players to get started.' : ''}
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <p className="font-medium">{player.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {player.rating > 0 ? `Rating: ${player.rating}` : 'Unrated'}
                    </p>
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemovePlayer(player.id)}
                      className="ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Requirements */}
      {canEdit && players.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ready to Start?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p className="font-medium text-foreground">Tournament will start when you:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Have at least 2 players registered</li>
              <li>Move to Pairings tab</li>
              <li>Click "Generate Round 1 Pairings"</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
