const fs = require('fs');
let content = fs.readFileSync('src/pages/Home/HomePage.tsx', 'utf8');

content = content.replace(
  "const [selectedCat, setSelectedCat] = useState<string | null>(null)",
  "const [selectedCat, setSelectedCat] = useState<string | null>(() => sessionStorage.getItem('hp_cat') || null);\n  useEffect(() => { if (selectedCat) sessionStorage.setItem('hp_cat', selectedCat); else sessionStorage.removeItem('hp_cat'); }, [selectedCat]);"
);

content = content.replace(
  "const [selectedPlatform, setSelectedPlatform] = useState<string>('all')",
  "const [selectedPlatform, setSelectedPlatform] = useState<string>(() => sessionStorage.getItem('hp_platform') || 'all');\n  useEffect(() => { sessionStorage.setItem('hp_platform', selectedPlatform); }, [selectedPlatform]);"
);

content = content.replace(
  "const [sort, setSort] = useState('created_at_desc')",
  "const [sort, setSort] = useState(() => sessionStorage.getItem('hp_sort') || 'created_at_desc');\n  useEffect(() => { sessionStorage.setItem('hp_sort', sort); }, [sort]);"
);

fs.writeFileSync('src/pages/Home/HomePage.tsx', content, 'utf8');
console.log('Fixed HomePage States');