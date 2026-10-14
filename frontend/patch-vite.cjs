const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js');
if (fs.existsSync(target)) {
  let content = fs.readFileSync(target, 'utf8');
  const targetStr = 'crypto$2.getRandomValues(new Uint8Array(9))';
  const replacementStr = '(crypto$2.getRandomValues ? crypto$2.getRandomValues(new Uint8Array(9)) : crypto$2.webcrypto.getRandomValues(new Uint8Array(9)))';
  if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync(target, content, 'utf8');
    console.log('Successfully patched Vite dep-BK3b2jBa.js for Node 16!');
  } else if (content.includes(replacementStr)) {
    console.log('Already patched!');
  } else {
    console.log('Target string not found!');
  }
} else {
  console.log('Target file not found!');
}
