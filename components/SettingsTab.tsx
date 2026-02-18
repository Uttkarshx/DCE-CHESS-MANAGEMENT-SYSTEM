'use client';

import { useState } from 'react';
import { Tournament } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, Upload, Trash2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SettingsTabProps {
  tournament: Tournament | null;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onImportJSON: (json: string) => void;
  onReset: () => void;
}

export function SettingsTab({
  tournament,
  isDarkMode,
  onToggleDarkMode,
  onExportJSON,
  onExportCSV,
  onImportJSON,
  onReset,
}: SettingsTabProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleImportJSON = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        setIsLoading(true);
        const content = await file.text();
        onImportJSON(content);
      } catch (error) {
        alert(`Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    input.click();
  };

  return (
    <div className="space-y-6">
      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the tournament manager looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-muted-foreground">
                {isDarkMode ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <Button variant="outline" onClick={onToggleDarkMode}>
              {isDarkMode ? 'Light' : 'Dark'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Tournament</CardTitle>
          <CardDescription>Save your tournament data in various formats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={onExportJSON}
            disabled={!tournament}
          >
            <Download className="mr-2 h-4 w-4" />
            Export as JSON
          </Button>
          <p className="text-xs text-muted-foreground">
            Complete tournament data including all players, rounds, and results. Use this to back
            up or share the tournament.
          </p>

          <div className="my-3 border-t" />

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={onExportCSV}
            disabled={!tournament}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Standings as CSV
          </Button>
          <p className="text-xs text-muted-foreground">
            Final standings and rankings in CSV format. Perfect for printing or importing into
            spreadsheets.
          </p>
        </CardContent>
      </Card>

      {/* Import Options */}
      <Card>
        <CardHeader>
          <CardTitle>Import Tournament</CardTitle>
          <CardDescription>Load a previously saved tournament</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleImportJSON}
            disabled={isLoading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {isLoading ? 'Loading...' : 'Import from JSON'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Load a tournament file that was previously exported as JSON. This will replace the
            current tournament.
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full justify-start">
                <Trash2 className="mr-2 h-4 w-4" />
                Reset All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Reset All Data?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all tournament data, including:
                  <ul className="mt-2 ml-4 list-disc space-y-1 text-foreground">
                    <li>Current tournament</li>
                    <li>All players and results</li>
                    <li>All rounds and pairings</li>
                    <li>All backups</li>
                  </ul>
                  <p className="mt-3 font-semibold">This action cannot be undone.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogAction
                onClick={onReset}
                className="bg-red-600 hover:bg-red-700"
              >
                Reset Everything
              </AlertDialogAction>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogContent>
          </AlertDialog>

          <p className="mt-3 text-xs text-muted-foreground">
            Make sure to export your tournament before resetting if you want to keep the data.
          </p>
        </CardContent>
      </Card>

      {/* Information */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
        <CardContent className="pt-4">
          <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
            About This Tournament Manager
          </p>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-disc">
            <li>All data is stored locally in your browser</li>
            <li>No data is sent to any server</li>
            <li>Export your tournament to back it up or share it</li>
            <li>Supports up to 200 players</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
