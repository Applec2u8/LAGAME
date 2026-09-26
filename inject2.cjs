const fs = require('fs');
let content = fs.readFileSync('src/pages/Game/GameDetailPage.tsx', 'utf8');

content = content.replace(
  "markReturnFromDetail('/top-games');\n  }, []);",
  "markReturnFromDetail('/top-games');\n    markReturnFromDetail('/coming-soon');\n  }, []);"
);

fs.writeFileSync('src/pages/Game/GameDetailPage.tsx', content, 'utf8');
console.log('Added coming-soon');