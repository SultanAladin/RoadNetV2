import https from 'https';
import fs from 'fs';
https.get('https://raw.githubusercontent.com/SultanAladin/Roadnet/main/src/lib/geometry.ts', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => { fs.writeFileSync('geometry.ts', data); console.log("Done"); });
});
