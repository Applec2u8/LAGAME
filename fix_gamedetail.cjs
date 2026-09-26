const fs = require('fs');
let content = fs.readFileSync('src/pages/Game/GameDetailPage.tsx', 'utf8');

content = content.replace(
  "<Back to=\"/\"><ArrowLeft size={15} /> {t('game.back')}</Back>",
  "<Back onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/')}><ArrowLeft size={15} /> {t('game.back')}</Back>"
);

fs.writeFileSync('src/pages/Game/GameDetailPage.tsx', content, 'utf8');
console.log('Fixed GameDetailPage');