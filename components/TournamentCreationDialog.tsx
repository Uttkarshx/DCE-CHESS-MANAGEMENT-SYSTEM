'use client';

import { useState } from 'react';
import { Tournament, TournamentSettings } from '@/lib/types';
import { saveTournament } from '@/lib/tournamentStorage';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface TournamentCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTournamentCreated: (tournament: Tournament) => void;
}

export function TournamentCreationDialog({
  open,
  onOpenChange,
  onTournamentCreated,
}: TournamentCreationDialogProps) {
  const [step, setStep] = useState<'details' | 'config'>('details');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [totalRounds, setTotalRounds] = useState(6);
  const [totalBoards, setTotalBoards] = useState(6);

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset
      setStep('details');
      setName('');
      setTotalRounds(6);
      setTotalBoards(6);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  // Validate and move to next step
  const handleContinue = () => {
    if (!name.trim()) {
      setError('Tournament name is required');
      return;
    }
    if (name.length > 100) {
      setError('Tournament name must be less than 100 characters');
      return;
    }
    setError(null);
    setStep('config');
  };

  // Create tournament
  const handleCreate = async () => {
    if (totalRounds < 1 || totalRounds > 12) {
      setError('Total rounds must be between 1 and 12');
      return;
    }
    if (totalBoards < 1 || totalBoards > 20) {
      setError('Total boards must be between 1 and 20');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const defaultSettings: TournamentSettings = {
        byeValue: 1,
        colorBalanceStrict: false,
        floatingEnabled: true,
        round1PairingMethod: 'random',
      };

      const tournament: Tournament = {
        id: uuidv4(),
        name: name.trim(),
        totalRounds,
        totalBoards,
        players: [],
        rounds: [],
        settings: defaultSettings,
        createdAt: new Date(),
        updatedAt: new Date(),
        currentRound: 0,
        isComplete: false,
        status: 'setup',
      };

      saveTournament(tournament);
      onTournamentCreated(tournament);
      handleOpenChange(false);
    } catch (err) {
      setError(`Failed to create tournament: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'details' ? 'Create Tournament' : 'Tournament Configuration'}
          </DialogTitle>
          <DialogDescription>
            {step === 'details'
              ? 'Enter the name of your new tournament'
              : 'Configure the number of rounds and boards'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {step === 'details' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="tournament-name">Tournament Name</Label>
                <Input
                  id="tournament-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g., Spring Championship 2026"
                  className="mt-2"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {name.length}/100 characters
                </p>
              </div>
            </div>
          )}

          {step === 'config' && (
            <div className="space-y-4">
              {/* Total Rounds */}
              <div>
                <Label htmlFor="total-rounds">Total Rounds</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTotalRounds(Math.max(1, totalRounds - 1))}
                  >
                    −
                  </Button>
                  <Input
                    id="total-rounds"
                    type="number"
                    value={totalRounds}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setTotalRounds(Math.max(1, Math.min(12, val)));
                    }}
                    className="text-center flex-1"
                    min="1"
                    max="12"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTotalRounds(Math.min(12, totalRounds + 1))}
                  >
                    +
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Swiss tournaments typically use 6-9 rounds
                </p>
              </div>

              {/* Total Boards */}
              <div>
                <Label htmlFor="total-boards">Boards Available Per Batch</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTotalBoards(Math.max(1, totalBoards - 1))}
                  >
                    −
                  </Button>
                  <Input
                    id="total-boards"
                    type="number"
                    value={totalBoards}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setTotalBoards(Math.max(1, Math.min(20, val)));
                    }}
                    className="text-center flex-1"
                    min="1"
                    max="20"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTotalBoards(Math.min(20, totalBoards + 1))}
                  >
                    +
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Physical boards available at your venue
                </p>
              </div>

              {/* Preview */}
              <div className="bg-muted p-4 rounded-md space-y-2">
                <p className="text-sm font-medium">Configuration Summary:</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Tournament: <strong>{name}</strong></li>
                  <li>• Rounds: <strong>{totalRounds}</strong></li>
                  <li>• Boards per batch: <strong>{totalBoards}</strong></li>
                  <li>• Example (48 players): <strong>{Math.ceil((48 / 2) / totalBoards)} batch(es)</strong></li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'details' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleContinue} disabled={!name.trim()}>
                Continue
              </Button>
            </>
          )}

          {step === 'config' && (
            <>
              <Button variant="outline" onClick={() => setStep('details')}>
                Back
              </Button>
              <Button onClick={() => handleOpenChange(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Tournament'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
