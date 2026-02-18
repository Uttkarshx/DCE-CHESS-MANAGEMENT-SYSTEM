'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tournament } from '@/lib/types';
import { loadAllTournaments, deleteTournament, duplicateTournament, getTournamentStats, exportAllTournamentsJSON } from '@/lib/tournamentStorage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Copy, Download, AlertCircle } from 'lucide-react';
import { TournamentCreationDialog } from '@/components/TournamentCreationDialog';

export default function TournamentsPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [duplicateDialog, setDuplicateDialog] = useState<{ id: string; name: string } | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [showCreationDialog, setShowCreationDialog] = useState(false);

  // Load tournaments on mount
  useEffect(() => {
    const loadTournaments = () => {
      try {
        const all = loadAllTournaments();
        // Sort by most recently updated
        all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setTournaments(all);
      } catch (err) {
        setError(`Failed to load tournaments: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadTournaments();
  }, []);

  // Open tournament
  const handleOpenTournament = (id: string) => {
    router.push(`/tournaments/${id}`);
  };

  // Delete tournament
  const handleDeleteTournament = () => {
    if (!deleteConfirm) return;

    try {
      deleteTournament(deleteConfirm.id);
      setTournaments(tournaments.filter(t => t.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      setError(null);
    } catch (err) {
      setError(`Failed to delete tournament: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Duplicate tournament
  const handleDuplicateTournament = () => {
    if (!duplicateDialog || !duplicateName.trim()) return;

    try {
      const newTournament = duplicateTournament(duplicateDialog.id, duplicateName);
      if (newTournament) {
        setTournaments([newTournament, ...tournaments]);
        setDuplicateDialog(null);
        setDuplicateName('');
      }
    } catch (err) {
      setError(`Failed to duplicate tournament: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Export all tournaments
  const handleExportAll = () => {
    try {
      exportAllTournamentsJSON();
    } catch (err) {
      setError(`Failed to export tournaments: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading tournaments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Tournament Manager</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Create and manage multiple chess tournaments</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Button
            onClick={() => setShowCreationDialog(true)}
            className="gap-2 w-full sm:w-auto"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            Create Tournament
          </Button>
          {tournaments.length > 0 && (
            <Button
              onClick={handleExportAll}
              variant="outline"
              className="gap-2 w-full sm:w-auto"
              size="lg"
            >
              <Download className="h-5 w-5" />
              Export All
            </Button>
          )}
        </div>

        {/* Tournaments Grid */}
        {tournaments.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 sm:p-12">
            <div className="text-center">
              <p className="text-muted-foreground mb-6">No tournaments yet</p>
              <Button onClick={() => setShowCreationDialog(true)} size="lg">
                Create Your First Tournament
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((tournament) => {
              const stats = getTournamentStats(tournament);
              const createdDate = new Date(tournament.createdAt).toLocaleDateString();

              return (
                <div
                  key={tournament.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 flex flex-col gap-4 hover:scale-[1.01] hover:border-zinc-700 hover:shadow-lg transition-all duration-200"
                >
                  {/* Title */}
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold truncate">{tournament.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">Created {createdDate}</p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 py-4 border-y border-zinc-800">
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold text-white">{stats.totalPlayers}</p>
                      <p className="text-xs text-muted-foreground mt-1">Players</p>
                    </div>
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold text-white">{tournament.totalBoards}</p>
                      <p className="text-xs text-muted-foreground mt-1">Boards</p>
                    </div>
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold text-white">{tournament.currentRound}</p>
                      <p className="text-xs text-muted-foreground mt-1">Round</p>
                    </div>
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold text-white">{tournament.totalRounds}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        tournament.status === 'completed'
                          ? 'bg-green-500'
                          : tournament.status === 'in-progress'
                            ? 'bg-blue-500'
                            : 'bg-zinc-500'
                      }`}
                    />
                    <span className="text-xs sm:text-sm font-medium capitalize text-muted-foreground">{tournament.status}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-3">
                    <Button
                      onClick={() => handleOpenTournament(tournament.id)}
                      className="flex-1 w-full sm:w-auto text-sm"
                      size="sm"
                    >
                      Open
                    </Button>
                    <Button
                      onClick={() => {
                        setDuplicateDialog({ id: tournament.id, name: tournament.name });
                        setDuplicateName(`${tournament.name} (Copy)`);
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto p-2"
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => setDeleteConfirm({ id: tournament.id, name: tournament.name })}
                      variant="outline"
                      size="sm"
                      className="p-2 text-destructive hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tournament Creation Dialog */}
      <TournamentCreationDialog
        open={showCreationDialog}
        onOpenChange={setShowCreationDialog}
        onTournamentCreated={(tournament) => {
          setTournaments([tournament, ...tournaments]);
          setShowCreationDialog(false);
          router.push(`/tournaments/${tournament.id}/setup`);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tournament?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{deleteConfirm?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTournament}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Dialog */}
      <Dialog open={!!duplicateDialog} onOpenChange={(open) => !open && setDuplicateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Tournament</DialogTitle>
            <DialogDescription>
              Create a new copy of "{duplicateDialog?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">New Tournament Name</label>
              <Input
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="Enter tournament name"
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDuplicateDialog(null);
                setDuplicateName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDuplicateTournament}
              disabled={!duplicateName.trim()}
            >
              Create Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
