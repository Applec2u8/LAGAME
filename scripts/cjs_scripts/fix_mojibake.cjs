const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const diff = execSync('git diff -U0 HEAD', { encoding: 'utf-8' });
const lines = diff.split('\n');

let currentFile = null;
let currentChanges = [];

for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('+++ b/')) {
    currentFile = lines[i].substring(6);
  } else if (lines[i].startsWith('@@')) {
    // Collect all - and + lines
    let oldText = '';
    let newText = '';
    i++;
    while (i < lines.length && !lines[i].startsWith('@@') && !lines[i].startsWith('diff --git')) {
      if (lines[i].startsWith('-')) oldText += lines[i].substring(1) + '\n';
      if (lines[i].startsWith('+')) newText += lines[i].substring(1) + '\n';
      i++;
    }
    i--;
    
    // Only process lines that have mojibake
    if (newText.includes('à¹€') || newText.includes('ðŸ') || newText.includes('') || newText.includes('à¸') || oldText.includes('🚀') || oldText.includes('เกม')) {
        console.log(`Potential mojibake in ${currentFile}`);
        // Read file, replace newText with oldText
        try {
            let content = fs.readFileSync(currentFile, 'utf8');
            // Try to find the exact newText in content and replace it with oldText
            // It might not match exactly if there are other changes, but we try line by line
            let oldLines = oldText.split('\n').filter(l => l.trim().length > 0);
            let newLines = newText.split('\n').filter(l => l.trim().length > 0);
            
            for (let j=0; j<Math.min(oldLines.length, newLines.length); j++) {
                if (oldLines[j] !== newLines[j] && (oldLines[j].includes('🚀') || oldLines[j].match(/[\u0E00-\u0E7F]/))) {
                    console.log("Replacing: " + newLines[j].trim() + " -> " + oldLines[j].trim());
                    content = content.replace(newLines[j], oldLines[j]);
                }
            }
            fs.writeFileSync(currentFile, content, 'utf8');
        } catch(e) {
            console.error(e);
        }
    }
  }
}
console.log('Auto-fix complete.');