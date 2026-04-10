import fs from 'fs';
fs.mkdirSync('src/lib', { recursive: true });
fs.copyFileSync('geometry.ts', 'src/lib/geometry.ts');
