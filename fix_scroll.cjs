const fs = require('fs');
let content = fs.readFileSync('src/hooks/useScrollRestore.ts', 'utf8');

// Replace pathname with location.key for full history-based scroll isolation!
content = content.replace(
  "const pathname = location.pathname",
  "const locKey = location.key !== 'default' ? location.key : location.pathname"
);

content = content.replace(/pathname/g, "locKey");
content = content.replace("const getScrollKey = (locKey: string) => `scroll_pos_${locKey}`", "const getScrollKey = (key: string) => `scroll_pos_${key}`");

fs.writeFileSync('src/hooks/useScrollRestore.ts', content, 'utf8');
console.log('Fixed useScrollRestore');