<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## Run and deploy your app

This contains everything you need to run your app locally.

View your app in AI Studio: `https://ai.studio/apps/drive/1huAfnZExNjL93wjE5CB1OXk_WmcWhmud`

## Run Locally

- **Prerequisites**: Node.js

1. **Install dependencies**: `npm install`
2. **Set API key (if needed)**: Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key
3. **Run the app**: `npm run dev`

## Updating sauna data from the Aamulehti PDF

- **Where to put the PDF**: Save the latest Aamulehti sauna article PDF under `data/source/` (for example `data/source/aamulehti-saunat-2025-12.pdf`).
- **Run ingestion**: From the project root, run `npm run ingest:pdf`.
  - This will:
    - Find the newest PDF in `data/source/`
    - Extract text and parse it into sauna objects (including ranking `sijoitus` 1–73)
    - Write `data/generated/saunas.json`
    - Atomically overwrite `public/saunas.json` so the app always sees a complete dataset
- **What the app uses**:
  - At runtime, the PWA only reads `public/saunas.json` through `fetchSaunaData`.
  - Coordinate and similar overrides remain in code and are applied on top of the JSON at runtime.
- **Ranking in the UI**:
  - Saunas are primarily sorted by `sijoitus` (1–73) when not sorting by distance.
  - Each sauna card shows a `#rank` badge alongside the score, so the app reflects the article’s ranking order.
