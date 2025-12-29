import { Flashcard } from '../models/flashCard';

export const generateFlashcardsFromText = (text: string): Omit<Flashcard, 'id'>[] => {
  // Simple heuristic: 
  // 1. Split by double newlines to find potential blocks.
  // 2. If a line contains a separator like " - " or ":", split into Q and A.
  // 3. Else, if we have a block, try to split first sentence as Q, rest as A.
  
  const blocks = text.split(/\n\s*\n/);
  const potentialCards: Omit<Flashcard, 'id'>[] = [];

  for (const block of blocks) {
    const cleanBlock = block.trim();
    if (!cleanBlock) continue;

    // Pattern 1: "Term - Definition" or "Term: Definition"
    const separatorMatch = cleanBlock.match(/^(.+?)(?:\s+[-–—:]\s+)(.+)$/s);
    if (separatorMatch) {
      potentialCards.push({
        question: separatorMatch[1].trim(),
        answer: separatorMatch[2].trim(),
      });
      continue;
    }

    // Pattern 2: Multiline. First line is Q, rest is A.
    const lines = cleanBlock.split('\n');
    if (lines.length > 1) {
        const q = lines[0].trim();
        const a = lines.slice(1).join('\n').trim();
        if (q && a) {
            potentialCards.push({ question: q, answer: a });
            continue;
        }
    }
    
    // Fallback: Just put the text in Question (user edits later)
    // or try sentence splitting?
    // Let's just ignore single lines that don't match pattern 1 to avoid garbage.
  }

  return potentialCards;
};
