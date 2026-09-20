import { CardDraft } from '../models/flashCard';

/** Parse one card per line: "question | answer", "question<TAB>answer" or "term - definition". */
export const parseCardList = (text: string): CardDraft[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.+?)\s*(?:\||\t|\s[-–—:]\s)\s*(.+)$/);
      return m ? { question: m[1].trim(), answer: m[2].trim() } : null;
    })
    .filter((c): c is CardDraft => !!c);

/** Heuristic generator for free text (used when no AI key is set). */
export const generateFlashcardsFromText = (text: string): CardDraft[] => {
  const blocks = text.split(/\n\s*\n/);
  const cards: CardDraft[] = [];

  for (const block of blocks) {
    const clean = block.trim();
    if (!clean) continue;

    const sep = clean.match(/^(.+?)(?:\s+[-–—:]\s+)(.+)$/s);
    if (sep) {
      cards.push({ question: sep[1].trim(), answer: sep[2].trim() });
      continue;
    }

    const lines = clean.split('\n');
    if (lines.length > 1) {
      const q = lines[0].trim();
      const a = lines.slice(1).join('\n').trim();
      if (q && a) cards.push({ question: q, answer: a });
    }
  }
  return cards;
};
