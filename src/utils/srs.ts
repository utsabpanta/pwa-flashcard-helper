import { Flashcard, Rating, CardDraft } from '../models/flashCard';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

export const newCard = (draft: CardDraft, deckId: string, id = Date.now()): Flashcard => ({
  id,
  question: draft.question.trim(),
  answer: draft.answer.trim(),
  deckId,
  createdAt: Date.now(),
  due: Date.now(),
  interval: 0,
  ease: 2.5,
  reps: 0,
  lapses: 0,
});

/** Simplified SM-2 scheduling. */
export const schedule = (card: Flashcard, rating: Rating, now = Date.now()): Flashcard => {
  let { interval, ease, reps, lapses } = card;

  switch (rating) {
    case 'again':
      reps = 0;
      lapses += 1;
      interval = 0;
      ease = Math.max(1.3, ease - 0.2);
      return { ...card, interval, ease, reps, lapses, due: now + 10 * MINUTE, lastReviewed: now };
    case 'hard':
      interval = Math.max(1, Math.round(interval * 1.2));
      ease = Math.max(1.3, ease - 0.15);
      break;
    case 'good':
      interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(interval * ease);
      break;
    case 'easy':
      interval = reps === 0 ? 4 : Math.round(Math.max(interval, 1) * ease * 1.3);
      ease += 0.15;
      break;
  }
  reps += 1;
  return { ...card, interval, ease, reps, lapses, due: now + interval * DAY, lastReviewed: now };
};

/** Preview of the next interval for a rating, for button labels. */
export const previewInterval = (card: Flashcard, rating: Rating): string => {
  const next = schedule(card, rating, 0);
  if (rating === 'again') return '10m';
  return formatDays(next.interval);
};

export const formatDays = (days: number): string => {
  if (days < 1) return '<1d';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
};

export type CardStatus = 'new' | 'learning' | 'due' | 'review' | 'mastered';

export const cardStatus = (card: Flashcard, now = Date.now()): CardStatus => {
  if (card.reps === 0 && !card.lastReviewed) return 'new';
  if (card.due <= now) return 'due';
  if (card.interval >= 21) return 'mastered';
  if (card.interval < 3) return 'learning';
  return 'review';
};

export const isDue = (card: Flashcard, now = Date.now()) => card.due <= now;

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const computeStreak = (log: Record<string, number>): number => {
  let streak = 0;
  const d = new Date();
  if (!log[dayKey(d)]) d.setDate(d.getDate() - 1); // streak survives until end of today
  while (log[dayKey(d)]) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
};

export const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
