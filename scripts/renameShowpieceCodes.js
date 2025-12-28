import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.join(__dirname, '..', 'public', 'Pawana-Furniture', 'showpieces', 'items');

// Style prefix mappings
const stylePrefixes = {
    'modern': 'SM',
    'royal': 'SR',
    'traditional': 'ST'
};

// Subfolder order
const subfolderOrder = ['cabinet', 'console', 'fireplace'];

// Pattern to match existing codes in brackets
const codePattern = /\([A-Z]{2,3}-\d+\)/;

function getFilesFromFolder(folderPath) {
    const files = [];
    try {
        const items = fs.readdirSync(folderPath, { withFileTypes: true });
        for (const item of items) {
            if (!item.isDirectory() && /\.(jpg|jpeg|png|webp)$/i.test(item.name)) {
                files.push({
                    name: item.name,
                    fullPath: path.join(folderPath, item.name)
                });
            }
        }
    } catch (e) {
        // Folder doesn't exist
    }
    // Sort alphabetically
    return files.sort((a, b) => a.name.localeCompare(b.name));
}

console.log('\n==============================================================');
console.log('SHOWPIECE IMAGE CODE RENAMING');
console.log('==============================================================\n');

for (const [style, prefix] of Object.entries(stylePrefixes)) {
    console.log(`\n========================================`);
    console.log(`STYLE: ${style.toUpperCase()} (${prefix})`);
    console.log(`========================================`);

    const styleDir = path.join(baseDir, style);
    let counter = 1;
    let totalRenamed = 0;

    for (const subfolder of subfolderOrder) {
        const subfolderPath = path.join(styleDir, subfolder);
        const files = getFilesFromFolder(subfolderPath);

        if (files.length === 0) {
            console.log(`  ${subfolder}: No files found`);
            continue;
        }

        console.log(`\n  ${subfolder.toUpperCase()} (${files.length} files):`);

        for (const file of files) {
            const newCode = `(${prefix}-${String(counter).padStart(3, '0')})`;
            let newName;

            if (codePattern.test(file.name)) {
                // Replace existing code
                newName = file.name.replace(codePattern, newCode);
            } else {
                // Add code before extension
                const ext = path.extname(file.name);
                const baseName = path.basename(file.name, ext);
                newName = `${baseName} ${newCode}${ext}`;
            }

            const newFullPath = path.join(path.dirname(file.fullPath), newName);

            if (file.name !== newName) {
                console.log(`    ${file.name}`);
                console.log(`    → ${newName}`);

                try {
                    fs.renameSync(file.fullPath, newFullPath);
                    totalRenamed++;
                } catch (err) {
                    console.log(`    ❌ Error: ${err.message}`);
                }
            } else {
                console.log(`    ${file.name} (unchanged)`);
            }

            counter++;
        }
    }

    console.log(`\n  Total files processed: ${counter - 1}`);
    console.log(`  Total files renamed: ${totalRenamed}`);
}

console.log('\n==============================================================');
console.log('DONE!');
console.log('==============================================================\n');
