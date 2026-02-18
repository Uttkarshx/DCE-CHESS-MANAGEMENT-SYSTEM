import { Tournament, Round, Player } from './types';

/**
 * Generate PDF content as HTML string for printing
 * Can be printed directly or converted to PDF using browser print dialog
 */
export function generatePairingsHTML(tournament: Tournament, round: Round): string {
  const { matches } = round;

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${tournament.name} - Round ${round.roundNumber} Pairings</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          background-color: white;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
        }
        .header h1 {
          margin: 0 0 5px 0;
          font-size: 24px;
        }
        .header p {
          margin: 5px 0;
          font-size: 14px;
          color: #666;
        }
        .round-info {
          font-size: 16px;
          font-weight: bold;
          color: #333;
        }
        .matches-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .match-card {
          border: 1px solid #ccc;
          padding: 15px;
          border-radius: 5px;
          background-color: #f9f9f9;
        }
        .board-number {
          font-weight: bold;
          font-size: 14px;
          color: #0066cc;
          margin-bottom: 10px;
        }
        .match-players {
          font-size: 13px;
          line-height: 1.8;
        }
        .white-player {
          padding: 8px;
          background-color: #f0f0f0;
          border-radius: 3px;
          margin-bottom: 5px;
        }
        .black-player {
          padding: 8px;
          background-color: #e0e0e0;
          border-radius: 3px;
        }
        .bye {
          padding: 8px;
          background-color: #fff3cd;
          border-radius: 3px;
          font-weight: bold;
          text-align: center;
        }
        .player-name {
          font-weight: 500;
        }
        .color-label {
          font-size: 11px;
          color: #666;
          margin-left: 5px;
        }
        .page-break {
          page-break-after: always;
          margin-top: 40px;
        }
        @media print {
          body {
            margin: 0;
          }
          .page-break {
            page-break-after: always;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${escapeHtml(tournament.name)}</h1>
        <p class="round-info">Round ${round.roundNumber} of ${tournament.totalRounds}</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Total Matches: ${matches.length}</p>
      </div>
      <div class="matches-container">
  `;

  const playerMap = new Map(tournament.players.map((p) => [p.id, p]));

  for (const match of matches) {
    if (match.result === 'bye') {
      const player = playerMap.get(match.whiteId);
      html += `
        <div class="match-card">
          <div class="board-number">Board ${match.board}</div>
          <div class="bye">
            <span class="player-name">${player ? escapeHtml(player.name) : 'Unknown'}</span>
            <br>
            BYE
          </div>
        </div>
      `;
    } else {
      const whitePlayer = playerMap.get(match.whiteId);
      const blackPlayer = playerMap.get(match.blackId);

      html += `
        <div class="match-card">
          <div class="board-number">Board ${match.board}</div>
          <div class="match-players">
            <div class="white-player">
              <span class="player-name">${whitePlayer ? escapeHtml(whitePlayer.name) : 'Unknown'}</span>
              <span class="color-label">(White)</span>
            </div>
            <div class="black-player">
              <span class="player-name">${blackPlayer ? escapeHtml(blackPlayer.name) : 'Unknown'}</span>
              <span class="color-label">(Black)</span>
            </div>
          </div>
        </div>
      `;
    }
  }

  html += `
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Generate standings PDF content as HTML string
 */
export function generateStandingsHTML(tournament: Tournament, includeAllRounds: boolean = true): string {
  const sortedPlayers = [...tournament.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
    if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.name.localeCompare(b.name);
  });

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${tournament.name} - Final Standings</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          background-color: white;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
        }
        .header h1 {
          margin: 0 0 5px 0;
          font-size: 24px;
        }
        .header p {
          margin: 5px 0;
          font-size: 14px;
          color: #666;
        }
        .tournament-info {
          font-size: 14px;
          color: #666;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 13px;
        }
        thead {
          background-color: #f0f0f0;
          font-weight: bold;
          border-bottom: 2px solid #333;
        }
        th {
          padding: 10px;
          text-align: left;
          border: 1px solid #ddd;
        }
        td {
          padding: 8px;
          border: 1px solid #ddd;
        }
        tr:nth-child(even) {
          background-color: #fafafa;
        }
        .rank {
          font-weight: bold;
          text-align: center;
          width: 40px;
        }
        .score {
          text-align: center;
          font-weight: bold;
        }
        .number {
          text-align: center;
        }
        @media print {
          body {
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${escapeHtml(tournament.name)}</h1>
        <p class="tournament-info">
          Final Standings - ${tournament.rounds.length} Round${tournament.rounds.length !== 1 ? 's' : ''} Completed
        </p>
        <p>Generated: ${new Date().toLocaleString()}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th class="rank">Rank</th>
            <th>Player Name</th>
            <th class="score">Score</th>
            <th class="number">Wins</th>
            <th class="number">Buchholz</th>
            <th class="number">S-B</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (let i = 0; i < sortedPlayers.length; i++) {
    const player = sortedPlayers[i];
    html += `
      <tr>
        <td class="rank">${i + 1}</td>
        <td>${escapeHtml(player.name)}</td>
        <td class="score">${player.score}</td>
        <td class="number">${player.wins}</td>
        <td class="number">${player.buchholz.toFixed(1)}</td>
        <td class="number">${player.sonnebornBerger.toFixed(1)}</td>
      </tr>
    `;
  }

  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  return html;
}

/**
 * Open print dialog for HTML content
 */
export function printHTML(htmlContent: string, title: string = 'Tournament'): void {
  const printWindow = window.open('', '', 'height=600,width=800');
  if (!printWindow) {
    alert('Print window could not be opened. Please check your popup blocker.');
    return;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.document.title = title;

  // Wait for content to load before printing
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

/**
 * Download HTML as text file
 */
export function downloadHTMLAsText(htmlContent: string, filename: string): void {
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
