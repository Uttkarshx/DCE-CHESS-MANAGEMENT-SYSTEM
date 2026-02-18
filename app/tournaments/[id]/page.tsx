'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tournament } from '@/lib/types';
import { loadTournament } from '@/lib/tournamentStorage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { TournamentOverview } from '@/components/tournament/TournamentOverview';
import { TournamentPlayers } from '@/components/tournament/TournamentPlayers';
import { TournamentPairings } from '@/components/tournament/TournamentPairings';
import { TournamentStandings } from '@/components/tournament/TournamentStandings';

export default function TournamentPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Load tournament
  useEffect(() => {
    if (!tournamentId) {
      setError('Tournament ID is missing');
      setIsLoading(false);
      return;
    }

    try {
      const loaded = loadTournament(tournamentId);
      if (!loaded) {
        setError('Tournament not found');
      } else {
        setTournament(loaded);
      }
    } catch (err) {
      setError(`Failed to load tournament: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
          <Button
            variant="outline"
            onClick={() => router.push('/tournaments')}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tournaments
          </Button>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || 'Tournament not found'}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/tournaments')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{tournament.name}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Round {tournament.currentRound} of {tournament.totalRounds}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 w-full grid grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="players" className="text-xs sm:text-sm">Players</TabsTrigger>
            <TabsTrigger value="pairings" className="text-xs sm:text-sm">Pairings</TabsTrigger>
            <TabsTrigger value="standings" className="text-xs sm:text-sm">Standings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <TournamentOverview
              tournament={tournament}
              onTournamentUpdate={setTournament}
            />
          </TabsContent>

          <TabsContent value="players">
            <TournamentPlayers
              tournament={tournament}
              onTournamentUpdate={setTournament}
            />
          </TabsContent>

          <TabsContent value="pairings">
            <TournamentPairings
              tournament={tournament}
              onTournamentUpdate={setTournament}
            />
          </TabsContent>

          <TabsContent value="standings">
            <TournamentStandings tournament={tournament} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
