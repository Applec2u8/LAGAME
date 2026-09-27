const fs = require('fs');
let content = fs.readFileSync('src/pages/Game/GameDetailPage.tsx', 'utf8');

// Replace import
content = content.replace(
  "import Seo from '../../components/Seo'",
  "import { markReturnFromDetail } from '../../hooks/useScrollRestore';\nimport Seo from '../../components/Seo'"
);

// Replace state
content = content.replace(
  "const [lightbox, setLightbox] = useState<number | null>(null)",
  "const [lightbox, setLightbox] = useState<number | null>(null);\n\n  // Mark all possible listing pages so that if the user goes back to any of them, it restores their specific scroll.\n  useEffect(() => {\n    markReturnFromDetail('/');\n    markReturnFromDetail('/az-filter');\n    markReturnFromDetail('/top-games');\n  }, []);\n"
);

fs.writeFileSync('src/pages/Game/GameDetailPage.tsx', content, 'utf8');
console.log('Injected');