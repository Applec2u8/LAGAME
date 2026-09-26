const fs = require('fs');
let content = fs.readFileSync('src/pages/Game/GameDetailStyles.ts', 'utf8');

content = content.replace("import { Link } from 'react-router-dom'\n", "");

fs.writeFileSync('src/pages/Game/GameDetailStyles.ts', content, 'utf8');
console.log('Fixed Link unused');