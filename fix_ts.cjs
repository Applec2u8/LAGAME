const fs = require('fs');
let content = fs.readFileSync('src/hooks/useScrollRestore.ts', 'utf8');

content = content.replace("const prevPathRef = useRef<string>(location.pathname)\n", "");

fs.writeFileSync('src/hooks/useScrollRestore.ts', content, 'utf8');
console.log('Fixed TS error');