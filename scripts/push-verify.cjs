const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('--- SOVEREIGN PRE-FLIGHT VERIFICATION ---');

try {
  // 1. Build Verification
  console.log('[1/3] Running Production Build Verification...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build Success.');

  // 2. Sovereign Audit
  console.log('[2/3] Running Sovereign Integrity Audit...');
  execSync('node scripts/sovereign-audit.cjs', { stdio: 'inherit' });
  console.log('✅ Integrity Confirmed.');

  // 3. Bundle Size Audit (Optimized for PWA)
  console.log('[3/3] Checking Asset Weight...');
  const distPath = path.join(__dirname, '../dist/assets');
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    files.forEach(file => {
      const stats = fs.statSync(path.join(distPath, file));
      const sizeMB = stats.size / (1024 * 1024);
      if (sizeMB > 1) {
        console.warn(`⚠️ WARNING: Large Asset Detected [${file}]: ${sizeMB.toFixed(2)}MB`);
      }
    });
  }

  console.log('\n🚀 ALL SYSTEMS NOMINAL. READY FOR PRODUCTION PUSH.');
} catch (error) {
  console.error('\n❌ PRE-FLIGHT FAILED. Deployment Aborted.');
  process.exit(1);
}
