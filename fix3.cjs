const fs = require('fs');

function fixMojibake(file) {
    let buf = fs.readFileSync(file);
    // Since the file is saved as UTF-8, but contains mojibake,
    // let's just do a plain string replacement of the actual corrupted bytes
    let content = buf.toString('utf8');
    
    // TopGamesPage.tsx
    content = content.replace(/ðŸ †/g, '🏆');
    content = content.replace(/ðŸ¥‡/g, '🥇');
    content = content.replace(/ðŸ¥ˆ/g, '🥈');
    content = content.replace(/ðŸ¥‰/g, '🥉');
    
    // GameDetailPage.tsx
    content = content.replace(/ðŸš€/g, '🚀');
    content = content.replace(/ðŸ’¾/g, '💾');
    
    fs.writeFileSync(file, content, 'utf8');
}

fixMojibake('src/pages/TopGames/TopGamesPage.tsx');
fixMojibake('src/pages/Game/GameDetailPage.tsx');
console.log('Fixed');