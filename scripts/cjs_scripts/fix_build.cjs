const fs = require('fs');
let content = fs.readFileSync('src/pages/Home/HomePage.tsx', 'utf8');

// Fix Loader2 import
content = content.replace('ChevronRight, Loader2, X', 'ChevronRight, X');

// Fix LoadingOverlay import
content = content.replace(', LoadingOverlay', '');

// Fix hook order
const match = content.match(/\/\/ Universal scroll restore\s+useScrollRestore\(!loading && games\.length > 0\);\s+const \[total, setTotal\] = useState\(0\)\s+const \[loading, setLoading\] = useState\(true\)/);

if (match) {
  content = content.replace(
    match[0],
    "const [total, setTotal] = useState(0)\n  const [loading, setLoading] = useState(true)\n\n  // Universal scroll restore\n  useScrollRestore(!loading && games.length > 0);"
  );
}

fs.writeFileSync('src/pages/Home/HomePage.tsx', content, 'utf8');
console.log('Fixed build issues');