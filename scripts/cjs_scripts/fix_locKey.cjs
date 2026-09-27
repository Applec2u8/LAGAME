const fs = require('fs');
let content = fs.readFileSync('src/hooks/useScrollRestore.ts', 'utf8');

content = content.replace("window.location.locKey", "window.location.pathname");
content = content.replace("window.location.locKey", "window.location.pathname");
content = content.replace("location.locKey", "location.pathname");

fs.writeFileSync('src/hooks/useScrollRestore.ts', content, 'utf8');
console.log('Fixed location.locKey');