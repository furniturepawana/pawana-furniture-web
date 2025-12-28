import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.join(__dirname, '..', 'public', 'Pawana-Furniture');

// Rooms to process (excluding living-room which already has the correct format)
const roomsToProcess = ['bedroom', 'dining-room', 'office', 'showpieces'];

// Pattern to extract code from filename like "Name (XX-01).jpg" -> "XX-01"
const codePattern = /\(([A-Z]{2,3}-\d+)\)/;

function processDirectory(dirPath, stats) {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        processDirectory(fullPath, stats);
      } else if (/\.(jpg|jpeg|png|webp)$/i.test(item.name)) {
        const match = item.name.match(codePattern);

        if (match) {
          const code = match[1];
          const ext = path.extname(item.name).toLowerCase();
          const newName = `${code}${ext}`;
          const newPath = path.join(dirPath, newName);

          // Check if already renamed
          if (item.name === newName) {
            stats.skipped++;
            continue;
          }

          // Check if target file already exists
          if (fs.existsSync(newPath)) {
            console.log(`  ⚠️  Target exists, skipping: ${item.name}`);
            stats.errors++;
            continue;
          }

          console.log(`  ${item.name}`);
          console.log(`  → ${newName}`);

          fs.renameSync(fullPath, newPath);
          stats.renamed++;
        } else {
          console.log(`  ⚠️  No code found: ${item.name}`);
          stats.noCode++;
        }
      }
    }
  } catch (err) {
    console.log(`  ❌ Error processing directory: ${err.message}`);
    stats.errors++;
  }
}

console.log('\n==============================================================');
console.log('RENAME IMAGE FILES TO CODE-ONLY FORMAT');
console.log('==============================================================');
console.log('Example: "Classic Mocha Bed (BM-07).jpg" → "BM-07.jpg"\n');

let totalStats = { renamed: 0, skipped: 0, noCode: 0, errors: 0 };

for (const room of roomsToProcess) {
  console.log(`\n========================================`);
  console.log(`ROOM: ${room.toUpperCase()}`);
  console.log(`========================================`);

  const roomPath = path.join(baseDir, room);

  if (!fs.existsSync(roomPath)) {
    console.log(`  Directory not found: ${roomPath}`);
    continue;
  }

  const roomStats = { renamed: 0, skipped: 0, noCode: 0, errors: 0 };
  processDirectory(roomPath, roomStats);

  console.log(`\n  Summary: ${roomStats.renamed} renamed, ${roomStats.skipped} already done, ${roomStats.noCode} no code found, ${roomStats.errors} errors`);

  totalStats.renamed += roomStats.renamed;
  totalStats.skipped += roomStats.skipped;
  totalStats.noCode += roomStats.noCode;
  totalStats.errors += roomStats.errors;
}

console.log('\n==============================================================');
console.log('FINAL SUMMARY');
console.log('==============================================================');
console.log(`✔ Files renamed: ${totalStats.renamed}`);
console.log(`⏭️  Already correct: ${totalStats.skipped}`);
console.log(`⚠️  No code found: ${totalStats.noCode}`);
console.log(`❌ Errors: ${totalStats.errors}`);
console.log('');
