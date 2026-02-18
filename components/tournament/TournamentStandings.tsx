'use client';

import { Tournament } from '@/lib/types';
import { rankPlayers } from '@/lib/tiebreaks';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TournamentStandingsProps {
  tournament: Tournament;
}

export function TournamentStandings({ tournament }: TournamentStandingsProps) {
  const { ranked } = rankPlayers(tournament.players);

  return (
    <Card>
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">Tournament Standings</h3>
        <p className="text-sm text-muted-foreground mt-1">
          After Round {tournament.currentRound}
        </p>
      </div>

      {ranked.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-muted-foreground">No players yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Rating</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Buchholz</TableHead>
                <TableHead className="text-right">Sonneborn-Berger</TableHead>
                <TableHead className="text-right">Wins</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((player, index) => (
                <TableRow key={player.id}>
                  <TableCell className="font-semibold text-center">{index + 1}</TableCell>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell className="text-right">
                    {player.rating || '—'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {player.score.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right">
                    {player.buchholz.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {player.sonnebornBerger.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {player.wins}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tiebreak Legend */}
      {ranked.length > 0 && (
        <div className="p-6 border-t bg-muted/50 text-sm space-y-2">
          <p className="font-medium">Tiebreak Rules:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>
              <strong>Score:</strong> Points earned (1 = win, 0.5 = draw, 0 = loss)
            </li>
            <li>
              <strong>Buchholz:</strong> Sum of all opponents' scores
            </li>
            <li>
              <strong>Sonneborn-Berger:</strong> Sum of beaten opponents' scores + 0.5 × drawn opponents
            </li>
          </ul>
        </div>
      )}
    </Card>
  );
}
