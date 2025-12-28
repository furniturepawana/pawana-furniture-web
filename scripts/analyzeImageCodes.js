import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAllFiles(dir) {
    const files = [];
    try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                files.push(...getAllFiles(fullPath));
            } else if (/\.(jpg|jpeg|png|webp)$/i.test(item.name)) {
                files.push({ path: fullPath, name: item.name });
            }
        }
    } catch (e) { }
    return files;
}

const baseDir = path.join(__dirname, '..', 'public', 'Pawana-Furniture');
const rooms = ['bedroom', 'dining-room', 'living-room', 'office', 'showpieces'];

console.log('\n==============================================================');
console.log('IMAGE CODE ANALYSIS REPORT');
console.log('==============================================================');

let totalIssues = 0;

for (const room of rooms) {
    console.log('\n========================================');
    console.log('ROOM: ' + room.toUpperCase());
    console.log('========================================');

    const roomDir = path.join(baseDir, room);
    if (!fs.existsSync(roomDir)) {
        console.log('  Directory not found!');
        continue;
    }

    const files = getAllFiles(roomDir);
    const codePattern = /\(([A-Z]{2,3}-\d+)\)/;
    const codesByPrefix = {};
    const allCodes = {};
    const noCodeFiles = [];

    for (const f of files) {
        const match = f.name.match(codePattern);
        if (match) {
            const code = match[1];
            const parts = code.split('-');
            const prefix = parts[0];
            const num = parseInt(parts[1]);

            if (codesByPrefix[prefix] === undefined) {
                codesByPrefix[prefix] = [];
            }

            // Track duplicates
            if (allCodes[code]) {
                allCodes[code].push(f.name);
            } else {
                allCodes[code] = [f.name];
            }

            codesByPrefix[prefix].push({ num: num, code: code, file: f.name });
        } else {
            noCodeFiles.push(f.name);
        }
    }

    if (noCodeFiles.length > 0) {
        console.log('\n  FILES WITHOUT CODES:');
        for (const f of noCodeFiles) {
            console.log('    - ' + f);
        }
        totalIssues += noCodeFiles.length;
    }

    const prefixes = Object.keys(codesByPrefix).sort();

    for (const prefix of prefixes) {
        const codes = codesByPrefix[prefix].sort((a, b) => a.num - b.num);
        const nums = codes.map(c => c.num);
        const uniqueNums = [...new Set(nums)];
        const maxNum = Math.max(...uniqueNums);
        const minNum = Math.min(...uniqueNums);
        const missing = [];

        for (let i = 1; i <= maxNum; i++) {
            if (uniqueNums.indexOf(i) === -1) {
                missing.push(i);
            }
        }

        console.log('\n  Prefix: ' + prefix);
        console.log('    Count: ' + codes.length + ' files');
        console.log('    Range: ' + prefix + '-' + String(minNum).padStart(2, '0') + ' to ' + prefix + '-' + String(maxNum).padStart(2, '0'));

        if (missing.length > 0) {
            console.log('    ❌ MISSING CODES: ' + missing.map(n => prefix + '-' + String(n).padStart(2, '0')).join(', '));
            totalIssues += missing.length;
        } else {
            console.log('    ✓ All codes sequential (no gaps)');
        }

        // Find duplicates for this prefix
        const dups = [];
        for (const [code, arr] of Object.entries(allCodes)) {
            if (code.startsWith(prefix + '-') && arr.length > 1) {
                dups.push([code, arr]);
            }
        }

        if (dups.length > 0) {
            console.log('    ❌ DUPLICATE CODES:');
            for (const [code, arr] of dups) {
                console.log('      ' + code + ':');
                for (const f of arr) {
                    console.log('        - ' + f);
                }
            }
            totalIssues += dups.length;
        } else {
            console.log('    ✓ All codes unique');
        }
    }
}

console.log('\n==============================================================');
console.log('SUMMARY');
console.log('==============================================================');
if (totalIssues === 0) {
    console.log('✓ All image codes are unique and sequential!');
} else {
    console.log('❌ Found ' + totalIssues + ' issue(s) to review');
}
console.log('');
