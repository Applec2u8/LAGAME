const fs = require('fs');
let lines = fs.readFileSync('src/pages/TopGames/TopGamesPage.tsx', 'utf8').split('\n');
lines[78] = "          <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>";
fs.writeFileSync('src/pages/TopGames/TopGamesPage.tsx', lines.join('\n'), 'utf8');
console.log("Fixed");