const fs = require('fs');

function findMojibake(file) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    console.log(`\n--- Checking ${file} ---`);
    let found = false;
    lines.forEach((line, index) => {
        // Look for common Latin-1 misinterpreted bytes
        if (line.includes('ðŸ') || line.includes('à') || line.match(/[\xC0-\xD6\xD8-\xF6\xF8-\xFF]{2,}/)) {
            console.log(`Line ${index + 1}: ${line.trim()}`);
            found = true;
        }
    });
    if (!found) console.log("No mojibake found.");
}

findMojibake('src/pages/ComingSoon/ComingSoonPage.tsx');
findMojibake('src/pages/Game/GameDetailPage.tsx');