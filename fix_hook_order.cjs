const fs = require('fs');
let content = fs.readFileSync('src/pages/Home/HomePage.tsx', 'utf8');

content = content.replace(
  "  // Universal scroll restore\n  useScrollRestore(!loading && games.length > 0);\n  const [total, setTotal] = useState(0)\n  const [loading, setLoading] = useState(true)",
  "  const [total, setTotal] = useState(0)\n  const [loading, setLoading] = useState(true)\n\n  // Universal scroll restore\n  useScrollRestore(!loading && games.length > 0);"
);

fs.writeFileSync('src/pages/Home/HomePage.tsx', content, 'utf8');
console.log('Fixed hook order');