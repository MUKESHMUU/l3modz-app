const fs = require('fs');
const files = ['src/components/Header.tsx', 'src/components/Footer.tsx', 'src/components/WhatsAppFloat.tsx', 'src/components/StickyBuyBox.tsx', 'src/components/Button.tsx'];
files.forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/import Link from 'next\/link';/g, "import { Link } from 'react-router-dom';");
    c = c.replace(/import { useRouter } from 'next\/navigation';/g, "import { useNavigate } from 'react-router-dom';");
    c = c.replace(/useRouter\(\)/g, "useNavigate()");
    c = c.replace(/router\.push\(/g, "navigate(");
    c = c.replace(/const router =/g, "const navigate =");
    c = c.replace(/<Link([^>]*?)href=/g, '<Link$1to=');
    fs.writeFileSync(f, c);
  }
});
