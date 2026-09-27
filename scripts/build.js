const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building high-performance bundle for Neeta Maa Birthday Surprise...');

try {
  // 1. Bundle src/app.jsx -> app.js
  execSync(
    'npx esbuild src/app.jsx --bundle --outfile=app.js --format=esm --external:react --external:react-dom --external:react-dom/client --external:framer-motion',
    { stdio: 'inherit' }
  );

  // 2. Mirror files to public/
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const filesToCopy = ['app.js', 'index.html', 'neeta.jpg', 'voice-note.mp3', 'voice-note.ogg'];
  for (const file of filesToCopy) {
    const srcPath = path.join(__dirname, '..', file);
    const destPath = path.join(publicDir, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✓ Copied ${file} to public/`);
    }
  }

  console.log('✨ Build completed successfully with 0 runtime Babel overhead!');
} catch (err) {
  console.error('Build failed:', err);
  process.exit(1);
}
