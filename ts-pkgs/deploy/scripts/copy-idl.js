import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const src = path.join(__dirname, '../../../src/solana/target/idl/verification_v2.json');
const dest = path.join(__dirname, '../guardian/verification_v2.json');

if (fs.existsSync(src)) {
  // Ensure destination directory exists
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  // Copy the file
  fs.copyFileSync(src, dest);
  console.log(`Copied IDL from ${src} to ${dest}`);
} else {
  console.warn(`Warning: IDL file not found at ${src}. Solana build may be required.`);
}
