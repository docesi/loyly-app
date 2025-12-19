import fs from 'fs';
import path from 'path';
import process from 'process';
// pdf-parse uses a CommonJS export; require it to avoid ESM default import issues.
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;
import type { Sauna } from '../types';

// NOTE:
// This script is intentionally written to be independent of any specific PDF library.
// It expects that PDF text extraction is handled separately and provided as plain text,
// or that a PDF parsing implementation is later plugged into the `extractTextFromPdf` function.

const SOURCE_DIR = path.resolve(process.cwd(), 'data/source');
const INTERMEDIATE_DIR = path.resolve(process.cwd(), 'data/intermediate');
const GENERATED_DIR = path.resolve(process.cwd(), 'data/generated');
const PUBLIC_SAUNAS_PATH = path.resolve(process.cwd(), 'public/saunas.json');

async function extractTextFromPdf(pdfPath: string): Promise<string> {
  const buffer = fs.readFileSync(pdfPath);
  const result = await pdfParse(buffer);
  return result.text;
}

function parseSaunasFromText(text: string): Sauna[] {
  // This function provides a skeleton for parsing.
  // It should be adapted once you know the concrete textual structure
  // of the Aamulehti article export.

  const lines = text.split(/\r?\n/);

  // Very rough placeholder: look for headings like "1. Sauna name"
  const saunaBlocks: { rank: number; lines: string[] }[] = [];
  let currentBlock: { rank: number; lines: string[] } | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^(\d{1,3})\.\s+(.*)$/);
    if (headingMatch) {
      const rank = Number(headingMatch[1]);
      if (!Number.isNaN(rank)) {
        if (currentBlock) {
          saunaBlocks.push(currentBlock);
        }
        currentBlock = { rank, lines: [line] };
        continue;
      }
    }

    if (currentBlock) {
      currentBlock.lines.push(line);
    }
  }

  if (currentBlock) {
    saunaBlocks.push(currentBlock);
  }

  const saunas: Sauna[] = saunaBlocks.map((block, index) => {
    const headingLine = block.lines[0];
    const headingMatch = headingLine.match(/^(\d{1,3})\.\s+(.*)$/);
    const name = headingMatch ? headingMatch[2].trim() : `Sauna ${block.rank}`;

    const placeholder: Sauna = {
      id: block.rank, // temporary: tie id to rank
      sijoitus: block.rank,
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
      kuvaus: block.lines.slice(1).join(' ').trim(),
      huomioita: '',
    };

    // Ensure unique ids in case rank is not unique
    placeholder.id = placeholder.id || index + 1;

    return placeholder;
  });

  return saunas;
}

function writeJsonAtomically(targetPath: string, data: unknown) {
  const tempPath = `${targetPath}.tmp`;
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(tempPath, json, 'utf-8');

  // Basic validation: ensure written JSON parses again
  JSON.parse(fs.readFileSync(tempPath, 'utf-8'));

  fs.renameSync(tempPath, targetPath);
}

async function main() {
  const files = fs.readdirSync(SOURCE_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));

  if (files.length === 0) {
    console.error(`No PDF files found in ${SOURCE_DIR}. Please drop the latest Aamulehti article PDF there.`);
    process.exit(1);
  }

  // Pick the latest by mtime
  const pdfWithStats = files.map((file) => {
    const fullPath = path.join(SOURCE_DIR, file);
    const stats = fs.statSync(fullPath);
    return { file, fullPath, mtime: stats.mtimeMs };
  });

  pdfWithStats.sort((a, b) => b.mtime - a.mtime);
  const latest = pdfWithStats[0];

  console.log(`Using PDF: ${latest.file}`);

  const text = await extractTextFromPdf(latest.fullPath);

  // Optionally store raw text for debugging
  const intermediateTextPath = path.join(INTERMEDIATE_DIR, 'latest-pdf-text.txt');
  fs.writeFileSync(intermediateTextPath, text, 'utf-8');

  const saunas = parseSaunasFromText(text);

  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
  }

  const generatedPath = path.join(GENERATED_DIR, 'saunas.json');
  writeJsonAtomically(generatedPath, saunas);
  console.log(`Wrote generated sauna data to ${generatedPath}`);

  // Copy to public/saunas.json atomically
  writeJsonAtomically(PUBLIC_SAUNAS_PATH, saunas);
  console.log(`Updated runtime sauna data at ${PUBLIC_SAUNAS_PATH}`);
}

main().catch((err) => {
  console.error('Error during PDF ingestion:', err);
  process.exit(1);
});


