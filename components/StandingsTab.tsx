'use client';

import { useState } from 'react';
import { Tournament, Player } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { rankPlayers } from '@/lib/tiebreaks';
import { Download } from 'lucide-react';

interface StandingsTabProps {
  tournament: Tournament | null;
  onExportPDF?: () => void;
  onExportCSV?: () => void;
  onExportExcel?: () => void;
}

type SortKey = 'rank' | 'score' | 'buchholz' | 'sb' | 'rating';

export function StandingsTab({ tournament, onExportPDF, onExportCSV, onExportExcel }: StandingsTabProps) {
  const [sortBy, setSortBy] = useState<SortKey>('rank');

  if (!tournament) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Create a tournament first</p>
      </div>
    );
  }

  if (tournament.players.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No players in tournament</p>
      </div>
    );
  }

  const { ranked } = rankPlayers(tournament.players);

  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
        <h3 className="text-lg font-semibold">Final Standings</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          {onExportCSV && (
            <Button variant="outline" size="sm" onClick={onExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          )}
          {onExportExcel && (
            <Button variant="outline" size="sm" onClick={onExportExcel}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
          )}
          {onExportPDF && (
            <Button variant="outline" size="sm" onClick={onExportPDF}>
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
          )}
        </div>
      </div>

      {/* Standings Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th
                    className="px-3 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-muted"
                    onClick={() => setSortBy('rank')}
                  >
                    Rank
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Name</th>
                  <th
                    className="px-3 py-3 text-right text-xs font-semibold cursor-pointer hover:bg-muted"
                    onClick={() => setSortBy('score')}
                  >
                    Score
                  </th>
                  <th
                    className="px-3 py-3 text-right text-xs font-semibold cursor-pointer hover:bg-muted"
                    onClick={() => setSortBy('buchholz')}
                    title="Buchholz: Sum of opponents' scores"
                  >
                    BH
                  </th>
                  <th
                    className="px-3 py-3 text-right text-xs font-semibold cursor-pointer hover:bg-muted"
                    onClick={() => setSortBy('sb')}
                    title="Sonneborn-Berger: Sum of beaten scores + 0.5 × drawn"
                  >
                    SB
                  </th>
                  <th
                    className="px-3 py-3 text-right text-xs font-semibold cursor-pointer hover:bg-muted"
                    onClick={() => setSortBy('rating')}
                  >
                    Rating
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((player, index) => (
                  <tr key={player.id} className="border-b hover:bg-muted/50">
                    <td className="px-3 py-3 text-sm font-semibold">{index + 1}</td>
                    <td className="px-3 py-3 text-sm font-medium">{player.name}</td>
                    <td className="px-3 py-3 text-right text-sm font-medium">
                      {formatScore(player.score)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-muted-foreground">
                      {formatScore(player.buchholz)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-muted-foreground">
                      {formatScore(player.sonnebornBerger)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-muted-foreground">
                      {player.rating > 0 ? player.rating : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground mb-2">Tie-Break System:</p>
            <p>
              <span className="font-medium">1. Score:</span> Total points earned (1 for win, ½ for
              draw, 0 for loss)
            </p>
            <p>
              <span className="font-medium">2. Buchholz (BH):</span> Sum of all opponents' scores
            </p>
            <p>
              <span className="font-medium">3. Sonneborn-Berger (SB):</span> Sum of beaten opponents'
              scores + ½ × drawn opponents' scores
            </p>
            <p>
              <span className="font-medium">4. Rating:</span> Original rating (if applicable)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatScore(score: number): string {
  if (Number.isInteger(score)) {
    return score.toString();
  }
  return score.toFixed(1);
}
