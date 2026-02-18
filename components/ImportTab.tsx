'use client';

import { useState, useRef } from 'react';
import { Player } from '@/lib/types';
import { parseExcelFile, cleanPlayerData, validateFileType, formatImportReport } from '@/lib/excelImport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, FileUp, Trash2 } from 'lucide-react';

interface ImportTabProps {
  onImport: (players: Player[]) => void;
  isDisabled?: boolean;
}

export function ImportTab({ onImport, isDisabled = false }: ImportTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string[] | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setSuccess(null);
    setImportSummary(null);

    // Validate file type
    if (!validateFileType(file)) {
      setError('Invalid file type. Please upload an .xlsx file (Excel format).');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large. Maximum size is 5MB.');
      return;
    }

    setIsLoading(true);

    try {
      // Parse Excel file
      const rawPlayers = await parseExcelFile(file);

      if (rawPlayers.length === 0) {
        setError('No data found in the Excel file.');
        setIsLoading(false);
        return;
      }

      // Clean and validate data
      const result = cleanPlayerData(rawPlayers);

      if (result.players.length === 0) {
        const errorMsg = result.errors.length > 0 ? result.errors[0] : 'No valid players found.';
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      // Show import report
      const report = formatImportReport(result);
      setImportSummary([report.summary, ...report.details]);

      // Call import handler
      onImport(result.players);
      setSuccess(`Successfully imported ${result.players.length} players!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import file';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (isDisabled || isLoading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDisabled || isLoading) return;

    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }

    // Reset input value to allow re-selecting the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearImport = () => {
    setError(null);
    setSuccess(null);
    setImportSummary(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Import Players from Google Form</CardTitle>
          <CardDescription>
            Upload an Excel (.xlsx) file exported from Google Form with player data. The file must contain columns:
            "Full Name", "Roll Number", and "Email Address".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag & Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !isDisabled && !isLoading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isDisabled || isLoading}
              className="hidden"
            />

            {isLoading ? (
              <div className="space-y-2">
                <div className="inline-block animate-spin">
                  <FileUp className="w-12 h-12 text-blue-500" />
                </div>
                <p className="text-sm font-medium">Processing file...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <FileUp className="w-12 h-12 text-gray-400 mx-auto" />
                <p className="text-sm font-medium">
                  {isDisabled ? 'Import is disabled' : 'Drag and drop Excel file here or click to select'}
                </p>
                <p className="text-xs text-gray-500">
                  Supported format: .xlsx (Google Form export) • Max 5MB • Max 200 players
                </p>
              </div>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Import Summary */}
          {importSummary && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Import Summary</h4>
              <ul className="space-y-1">
                {importSummary.map((line, idx) => (
                  <li key={idx} className="text-sm text-blue-800">
                    {line}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearImport}
                className="mt-3"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Import
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expected Excel Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="font-medium">Required columns (case-insensitive):</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>
                <span className="font-medium">Full Name</span> - Player's full name
              </li>
              <li>
                <span className="font-medium">Roll Number</span> - Student roll number or ID
              </li>
              <li>
                <span className="font-medium">Email Address</span> - Player's email
              </li>
            </ul>
            <p className="mt-3 font-medium">Data processing:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Names are trimmed and converted to proper case</li>
              <li>Duplicate names and roll numbers are automatically removed</li>
              <li>All players start with a rating of 0 (unrated)</li>
              <li>Round 1 pairings use random shuffle or alphabetical order (configurable)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
