const fs = require('fs');

function fixFile(file) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/ðŸ †/g, '🏆');
    content = content.replace(/ðŸ’¾/g, '💾');
    content = content.replace(/ðŸš€/g, '🚀');
    content = content.replace(/€กม™ี‰กำลั‡ˆะ€›ิ”ƒห‰”าว™Œ‚หล”€ร‡ว† ™ี‰/g, 'เกมนี้กำลังจะเปิดให้ดาวน์โหลดเร็วๆ นี้');
    content = content.replace(/‚›ร”•ิ”•ามและรอ„”‰€ลย!/g, 'โปรดติดตามและรอได้เลย!');
    // Some lines might be in Latin-1 representation in JS if they weren't matched
    content = content.replace(/\u00f0\u0178\u008f\u0086/g, '🏆'); // trophy in latin1
    fs.writeFileSync(file, content, 'utf8');
}

fixFile('src/pages/TopGames/TopGamesPage.tsx');
fixFile('src/pages/Game/GameDetailPage.tsx');
console.log("Fixed");