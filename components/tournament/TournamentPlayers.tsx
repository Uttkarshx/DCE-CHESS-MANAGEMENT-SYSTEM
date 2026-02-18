'use client';

import { useState, useRef } from 'react';
import { Tournament, Player } from '@/lib/types';
import { saveTournament } from '@/lib/tournamentStorage';
import { parseExcelFile } from '@/lib/excelImport';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Upload, Trash2, Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { v4 as uuidv4 } from 'uuid';

interface TournamentPlayersProps {
  tournament: Tournament;
  onTournamentUpdate: (tournament: Tournament) => void;
}

export function TournamentPlayers({
  tournament,
  onTournamentUpdate,
}: TournamentPlayersProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRating, setNewPlayerRating] = useState('0');

  const canEditPlayers = tournament.currentRound === 0;

  // Import players from Excel
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const rawPlayers = await parseExcelFile(file);

      if (rawPlayers.length === 0) {
        setError('No valid players found in Excel file');
        setIsLoading(false);
        return;
      }

      // Convert to Player objects
      const players: Player[] = rawPlayers.map(rp => ({
        id: uuidv4(),
        name: rp.name,
        rating: 0,
        score: 0,
        buchholz: 0,
        sonnebornBerger: 0,
        wins: 0,
        opponents: [],
        colors: [],
        hadBye: false,
      }));

      const updated = {
        ...tournament,
        players: [...tournament.players, ...players],
      };

      saveTournament(updated);
      onTournamentUpdate(updated);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(`Failed to import players: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Add single player
  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) {
      setError('Player name is required');
      return;
    }

    const newPlayer: Player = {
      id: uuidv4(),
      name: newPlayerName.trim(),
      rating: parseInt(newPlayerRating) || 0,
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
    };

    saveTournament(updated);
    onTournamentUpdate(updated);
    setNewPlayerName('');
    setNewPlayerRating('0');
    setShowAddPlayer(false);
    setError(null);
  };

  // Remove player
  const handleRemovePlayer = (playerId: string) => {
    const updated = {
      ...tournament,
      players: tournament.players.filter(p => p.id !== playerId),
    };

    saveTournament(updated);
    onTournamentUpdate(updated);
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Import Section */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-lg font-semibold mb-4">Import Players</h3>
        {!canEditPlayers && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Players cannot be added or removed after Round 1 has started
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Label>From Excel File</Label>
            <div className="flex gap-2 mt-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportExcel}
                disabled={!canEditPlayers || isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={!canEditPlayers || isLoading}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {isLoading ? 'Importing...' : 'Browse'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Excel should have columns: Full Name, Roll Number, Email Address
            </p>
          </div>

          <div className="border-t pt-4">
            <Button
              onClick={() => setShowAddPlayer(true)}
              disabled={!canEditPlayers}
              className="gap-2"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Add Player Manually
            </Button>
          </div>
        </div>
      </div>

      {/* Players List */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900">
        <div className="p-6 border-b border-zinc-800">
          <h3 className="text-lg font-semibold">
            Players ({tournament.players.length})
          </h3>
        </div>

        {tournament.players.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No players yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournament.players.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">{player.name}</TableCell>
                    <TableCell>{player.rating || 'Unrated'}</TableCell>
                    <TableCell>{player.score.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => handleRemovePlayer(player.id)}
                        variant="ghost"
                        size="sm"
                        disabled={!canEditPlayers}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Player Dialog */}
      <Dialog open={showAddPlayer} onOpenChange={setShowAddPlayer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Player</DialogTitle>
            <DialogDescription>Add a single player to the tournament</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="player-name">Full Name</Label>
              <Input
                id="player-name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Enter player name"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="player-rating">Rating (optional)</Label>
              <Input
                id="player-rating"
                type="number"
                value={newPlayerRating}
                onChange={(e) => setNewPlayerRating(e.target.value)}
                placeholder="0"
                className="mt-2"
                min="0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddPlayer(false);
                setNewPlayerName('');
                setNewPlayerRating('0');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddPlayer} disabled={!newPlayerName.trim()}>
              Add Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
