const fs = require('fs');
let content = fs.readFileSync('src/pages/Home/HomePage.tsx', 'utf8');

// Replace page state
content = content.replace(
  "const [page, setPage] = useState(1)",
  "const [page, setPage] = useState(() => {\n    const saved = sessionStorage.getItem('home_page_index');\n    return saved ? Number(saved) : 1;\n  })\n\n  useEffect(() => {\n    sessionStorage.setItem('home_page_index', page.toString());\n  }, [page]);\n\n  // Universal scroll restore\n  useScrollRestore(!loading && games.length > 0);"
);

fs.writeFileSync('src/pages/Home/HomePage.tsx', content, 'utf8');
console.log('Fixed HomePage');