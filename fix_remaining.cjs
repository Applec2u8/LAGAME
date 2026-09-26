const fs = require('fs');

function fixMojibake(file) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/ðŸŽ®/g, '🎮');
    content = content.replace(/ðŸ“¸/g, '📸');
    fs.writeFileSync(file, content, 'utf8');
}

fixMojibake('src/pages/ComingSoon/ComingSoonPage.tsx');
fixMojibake('src/pages/Game/GameDetailPage.tsx');
console.log('Fixed remaining emojis');