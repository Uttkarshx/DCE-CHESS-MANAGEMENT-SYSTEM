'use client';

import { useState } from 'react';
import { Tournament } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TournamentSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: Tournament;
  onSettingsSaved: (tournament: Tournament) => void;
}

export function TournamentSettingsDialog({
  open,
  onOpenChange,
  tournament,
  onSettingsSaved,
}: TournamentSettingsDialogProps) {
  const [byeValue, setByeValue] = useState(tournament.settings.byeValue);
  const [colorBalanceStrict, setColorBalanceStrict] = useState(
    tournament.settings.colorBalanceStrict
  );
  const [floatingEnabled, setFloatingEnabled] = useState(tournament.settings.floatingEnabled);
  const [round1Method, setRound1Method] = useState(
    tournament.settings.round1PairingMethod
  );

  const handleSave = () => {
    const updated: Tournament = {
      ...tournament,
      settings: {
        byeValue: byeValue as 0.5 | 1,
        colorBalanceStrict,
        floatingEnabled,
        round1PairingMethod: round1Method as 'random' | 'alphabetical',
      },
    };

    onSettingsSaved(updated);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tournament Settings</DialogTitle>
          <DialogDescription>
            Configure tournament pairing and scoring rules
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bye Value */}
          <div>
            <Label htmlFor="bye-value">Points for Bye</Label>
            <Select value={byeValue.toString()} onValueChange={(val) => setByeValue(parseFloat(val) as 0.5 | 1)}>
              <SelectTrigger id="bye-value" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5 points</SelectItem>
                <SelectItem value="1">1 point</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Points awarded when a player receives a bye
            </p>
          </div>

          {/* Color Balance */}
          <div>
            <Label htmlFor="color-balance" className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                id="color-balance"
                checked={colorBalanceStrict}
                onCheckedChange={(checked) =>
                  setColorBalanceStrict(checked as boolean)
                }
              />
              <span>Strict Color Balance</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-2 ml-6">
              Enforce color imbalance &le;1 (Strict) or &le;2 (Relaxed)
            </p>
          </div>

          {/* Floating */}
          <div>
            <Label htmlFor="floating" className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                id="floating"
                checked={floatingEnabled}
                onCheckedChange={(checked) =>
                  setFloatingEnabled(checked as boolean)
                }
              />
              <span>Allow Score Group Floating</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-2 ml-6">
              Allow players to float between score groups if needed
            </p>
          </div>

          {/* Round 1 Pairing Method */}
          <div>
            <Label htmlFor="round1-method">Round 1 Pairing Method</Label>
            <Select value={round1Method} onValueChange={(val) => setRound1Method(val as 'random' | 'alphabetical')}>
              <SelectTrigger id="round1-method" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">Random (if unrated)</SelectItem>
                <SelectItem value="alphabetical">Alphabetical (if unrated)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Method for pairing unrated players in Round 1
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
