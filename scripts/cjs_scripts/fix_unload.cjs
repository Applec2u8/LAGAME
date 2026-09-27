const fs = require('fs');
let content = fs.readFileSync('src/hooks/useScrollRestore.ts', 'utf8');

content = content.replace(
  "const path = window.location.pathname",
  "const state = window.history.state; const key = (state && state.key && state.key !== 'default') ? state.key : window.location.pathname;"
);
content = content.replace(
  "sessionStorage.setItem(getScrollKey(path), window.scrollY.toString())",
  "sessionStorage.setItem(getScrollKey(key), window.scrollY.toString())"
);

fs.writeFileSync('src/hooks/useScrollRestore.ts', content, 'utf8');
console.log('Fixed saveScrollBeforeUnload');