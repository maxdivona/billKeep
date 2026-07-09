const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const releaseDir = path.join(projectRoot, 'release');
const bundleDir = path.join(projectRoot, 'src-tauri', 'target', 'release', 'bundle');

console.log('🏁 Avvio script post-build: Copia dei pacchetti di release...');

// 1. Crea la cartella release/ se non esiste
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
  console.log(`Created release directory: ${releaseDir}`);
}

// 2. Cerca ricorsivamente i pacchetti generati da Tauri
if (fs.existsSync(bundleDir)) {
  const copiedFiles = [];
  
  function scanAndCopy(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanAndCopy(fullPath);
      } else {
        // Copia i formati di installazione comuni (deb, appimage, dmg, exe, msi)
        const ext = path.extname(item).toLowerCase();
        if (['.deb', '.appimage', '.dmg', '.exe', '.msi'].includes(ext)) {
          const destPath = path.join(releaseDir, item);
          fs.copyFileSync(fullPath, destPath);
          copiedFiles.push(item);
          console.log(`✅ Copiato: ${item} -> release/`);
        }
      }
    }
  }

  try {
    scanAndCopy(bundleDir);
    if (copiedFiles.length === 0) {
      console.log('⚠️ Nessun pacchetto (deb, appimage, ecc.) trovato in src-tauri/target/release/bundle/.');
    } else {
      console.log(`\n🎉 Successo! ${copiedFiles.length} pacchetti copiati nella cartella release/.`);
    }
  } catch (error) {
    console.error('❌ Errore durante la scansione e copia dei bundle:', error.message);
  }
} else {
  console.log('⚠️ Cartella bundle non trovata. Assicurati che tauri build sia stato completato con successo.');
}
