import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());
const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/generate-alpha-catalog.mjs /absolute/path/to/GharPayy_MASTER.csv');
  process.exit(1);
}

const alphaPath = path.join(repoRoot, 'src', 'data', 'alphaGgProperties.ts');
const outPath = path.join(repoRoot, 'src', 'data', 'alphaGgCatalogDetails.ts');

const alphaFile = fs.readFileSync(alphaPath, 'utf8');
const alphaNames = [...alphaFile.matchAll(/'([^']+)'/g)]
  .map((m) => m[1])
  .filter((s) => s.startsWith('GG ') || s.startsWith('GQ ') || s.startsWith('HOMELY '));

function splitCsvText(text) {
  const rows = [];
  let curRow = [];
  let curCell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i+1];
    
    if (ch === '"') {
      if (inQuotes && next === '"') {
        curCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      curRow.push(curCell.trim());
      curCell = '';
    } else if ((ch === '\r' || ch === '\n') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      curRow.push(curCell.trim());
      if (curRow.some(cell => cell.length > 0)) {
        rows.push(curRow);
      }
      curRow = [];
      curCell = '';
    } else {
      curCell += ch;
    }
  }
  if (curCell || curRow.length > 0) {
    curRow.push(curCell.trim());
    rows.push(curRow);
  }
  return rows;
}

function tokens(s) {
  return (s || '')
    .toLowerCase()
    .replace(/^gg\s+/, '')
    .split(/[^a-z0-9]+/g)
    .filter(Boolean)
    .filter((p) => !new Set(['k', 'ks', 'b', 'w', 'c', 'm', 'd', 's', 'rk']).has(p));
}

const csvText = fs.readFileSync(csvPath, 'utf8');
const allRows = splitCsvText(csvText);
const header = allRows[0];
const idx = (name) => header.findIndex((h) => (h || '').trim().toLowerCase() === name.toLowerCase());
const col = {
  names: idx('NAMES'),
  area: idx('AREA'),
  locality: idx('LOCALITY'),
  lows: idx('LOWS - DONT DISCLOSE'),
  url: idx('url'),
  drive: idx('Drive Link'),
  pics: idx('Pics'),
  price: idx('PRICE'), // Often contains descriptions with links
};

const rows = allRows.slice(1).map(cols => {
  const get = (j) => (j >= 0 ? (cols[j] || '').trim() : '');
  return {
    NAMES: get(col.names),
    AREA: get(col.area),
    LOCALITY: get(col.locality),
    LOWS: get(col.lows),
    URL: get(col.url),
    DRIVE: get(col.drive),
    PICS: get(col.pics),
    PRICE: get(col.price),
  };
});

const csvCandidates = rows.map((r) => ({ name: r.NAMES, t: tokens(r.NAMES), r }));

const details = {};
for (const name of alphaNames) {
  const want = tokens(name);
  if (!want.length) continue;
  let best = null;
  let bestScore = 0;
  for (const c of csvCandidates) {
    if (!c.t.length) continue;
    const wantSet = new Set(want);
    const inter = c.t.filter((x) => wantSet.has(x)).length;
    const score = inter / wantSet.size;
    if (score > bestScore && inter > 0) {
      bestScore = score;
      best = c.r;
    }
  }
  if (!best || bestScore < 0.6) continue; // Lowered threshold slightly for better matching

  const entry = {};
  if (best.AREA) entry.area = best.AREA;
  if (best.LOCALITY) entry.locality = best.LOCALITY;
  if (best.LOWS) entry.rentHint = best.LOWS;
  if (best.URL) entry.mapsUrl = best.URL;
  if (best.DRIVE) entry.driveLink = best.DRIVE;
  
  // Try to find a preview link
  let link = null;
  if (best.PICS) {
    const m = best.PICS.match(/https?:\/\/[^\s)\]]+/);
    if (m) link = m[0];
  }
  if (!link && best.PRICE) {
    // Look for pdf or image links in descriptions
    const m = best.PRICE.match(/https?:\/\/stays\.gharpayy\.in\/view\?file=[^\s"']+/);
    if (m) link = m[0];
  }
  
  if (link) entry.previewLink = link;
  
  details[name] = entry;
}

const ts = `export type AlphaGgCatalogDetails = {
  area?: string;
  locality?: string;
  rentHint?: string;
  mapsUrl?: string;
  driveLink?: string;
  previewLink?: string;
};

export const alphaGgCatalogDetailsByName: Record<string, AlphaGgCatalogDetails> = ${JSON.stringify(details, null, 2)} as const;
`;

fs.writeFileSync(outPath, ts, 'utf8');
console.log(`Wrote ${Object.keys(details).length} entries to ${outPath}`);
