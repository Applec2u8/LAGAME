const fs = require('fs');
let content = fs.readFileSync('src/pages/Game/GameDetailStyles.ts', 'utf8');

content = content.replace(
  "export const Back = styled(Link)`",
  "export const Back = styled.button`\n  background: none; border: none; cursor: pointer; padding: 0;"
);

fs.writeFileSync('src/pages/Game/GameDetailStyles.ts', content, 'utf8');
console.log('Fixed GameDetailStyles');