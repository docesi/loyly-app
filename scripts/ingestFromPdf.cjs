// CommonJS wrapper to run the TypeScript ingestion logic in an ESM project.
// This avoids `require` issues when running via ts-node in type:module projects.
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const process = require('process');
const { PDFParse } = require('pdf-parse');

const SOURCE_DIR = path.resolve(process.cwd(), 'data/source');
const INTERMEDIATE_DIR = path.resolve(process.cwd(), 'data/intermediate');
const GENERATED_DIR = path.resolve(process.cwd(), 'data/generated');
const PUBLIC_SAUNAS_PATH = path.resolve(process.cwd(), 'public/saunas.json');

/**
 * Very lightweight Sauna shape; we don't type-check here, TS does that in the app.
 */
function createSaunaPlaceholder(rank, name, descriptionLines) {
  return {
    id: rank,
    sijoitus: rank,
    nimi: name,
    sijainti: {
      kunta: 'Tuntematon',
      osoite: '',
    },
    hinta: '',
    aukioloajat: [],
    ominaisuudet: [],
    pisteet: 0,
    arvioinnit: {
      loylyt: '',
      miljoo: '',
      ilmapiiri: '',
      saunavaihtoehdot: '',
      oheispalvelut: '',
      aukioloajat: '',
      hinta: '',
      saavutettavuus: '',
    },
    kuvaus: descriptionLines.join(' ').trim(),
    huomioita: '',
  };
}

async function extractTextFromPdf(pdfPath) {
  const buffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text;
}

function parseSaunasFromText(text) {
  const lines = text.split(/\r?\n/);
  const saunaBlocks = [];
  let currentBlock = null;

  // Pattern: "74. Sauna name, Location: XX pistettä"
  const saunaHeadingPattern = /^(\d{1,3})\.\s+(.+?),\s*(.+?):\s*(\d+)\s+pistettä$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if this is a sauna heading (has "pistettä" and matches pattern)
    const saunaMatch = line.match(saunaHeadingPattern);
    if (saunaMatch) {
      // Save previous block if exists
      if (currentBlock) {
        saunaBlocks.push(currentBlock);
      }
      
      const rank = Number(saunaMatch[1]);
      const name = saunaMatch[2].trim();
      const location = saunaMatch[3].trim();
      const points = Number(saunaMatch[4]);
      
      currentBlock = {
        rank,
        name,
        location,
        points,
        lines: [line],
        descriptionLines: []
      };
      continue;
    }

    // If we're in a sauna block, collect description lines
    // Stop when we hit another numbered heading (but not sauna headings we already processed)
    if (currentBlock) {
      // Check if this is the start of a new numbered section (but not a sauna)
      const otherNumberMatch = line.match(/^(\d{1,3})\.\s+/);
      if (otherNumberMatch && Number(otherNumberMatch[1]) !== currentBlock.rank) {
        // This might be a new sauna or other content - check if it's a sauna heading
        if (!line.match(/pistettä/i)) {
          // Not a sauna heading, might be other content - continue collecting
          currentBlock.descriptionLines.push(line);
        } else {
          // It's actually a sauna heading we missed - process it
          continue;
        }
      } else {
        currentBlock.descriptionLines.push(line);
      }
    }
  }

  // Don't forget the last block
  if (currentBlock) {
    saunaBlocks.push(currentBlock);
  }

  // Convert blocks to sauna objects
  const saunas = saunaBlocks.map((block) => {
    // Extract location parts (kunta and possibly address)
    const locationParts = block.location.split(',').map(s => s.trim());
    const kunta = locationParts[0] || 'Tuntematon';
    const osoite = locationParts.slice(1).join(', ') || '';

    // Join description lines, filtering out empty lines and page markers
    const description = block.descriptionLines
      .filter(l => l.trim() && !l.match(/^--\s+\d+\s+of\s+\d+\s+--$/i) && !l.match(/^Sivu\s+\d+/i))
      .join(' ')
      .trim();

    const sauna = createSaunaPlaceholder(block.rank, block.name, [description]);
    sauna.sijainti.kunta = kunta;
    sauna.sijainti.osoite = osoite;
    sauna.pisteet = block.points;
    sauna.id = block.rank; // Use rank as ID

    return sauna;
  });

  // Sort by rank (1 is best, 74 is worst)
  saunas.sort((a, b) => a.sijoitus - b.sijoitus);

  return saunas;
}

function writeJsonAtomically(targetPath, data) {
  const tempPath = `${targetPath}.tmp`;
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(tempPath, json, 'utf-8');
  JSON.parse(fs.readFileSync(tempPath, 'utf-8'));
  fs.renameSync(tempPath, targetPath);
}

async function main() {
  const files = fs.readdirSync(SOURCE_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));

  if (files.length === 0) {
    console.error(`No PDF files found in ${SOURCE_DIR}. Please drop the latest Aamulehti article PDF there.`);
    process.exit(1);
  }

  const pdfWithStats = files.map((file) => {
    const fullPath = path.join(SOURCE_DIR, file);
    const stats = fs.statSync(fullPath);
    return { file, fullPath, mtime: stats.mtimeMs };
  });

  pdfWithStats.sort((a, b) => b.mtime - a.mtime);
  const latest = pdfWithStats[0];

  console.log(`Using PDF: ${latest.file}`);

  const text = await extractTextFromPdf(latest.fullPath);

  if (!fs.existsSync(INTERMEDIATE_DIR)) {
    fs.mkdirSync(INTERMEDIATE_DIR, { recursive: true });
  }
  const intermediateTextPath = path.join(INTERMEDIATE_DIR, 'latest-pdf-text.txt');
  fs.writeFileSync(intermediateTextPath, text, 'utf-8');

  const saunas = parseSaunasFromText(text);

  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
  }

  const generatedPath = path.join(GENERATED_DIR, 'saunas.json');
  writeJsonAtomically(generatedPath, saunas);
  console.log(`Wrote generated sauna data to ${generatedPath}`);

  writeJsonAtomically(PUBLIC_SAUNAS_PATH, saunas);
  console.log(`Updated runtime sauna data at ${PUBLIC_SAUNAS_PATH}`);
}

main().catch((err) => {
  console.error('Error during PDF ingestion:', err);
  process.exit(1);
});


