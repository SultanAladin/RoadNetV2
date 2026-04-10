const https = require('https');
https.get('https://raw.githubusercontent.com/SultanAladin/Roadnet/main/src/App.tsx', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => { console.log(data.substring(0, 2000)); });
});
