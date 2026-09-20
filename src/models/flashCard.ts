export interface Deck {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface Flashcard {
  id: number;
  question: string;
  answer: string;
  deckId: string;
  createdAt: number;
  // Spaced repetition state
  due: number;
  interval: number; // days
  ease: number;
  reps: number;
  lapses: number;
  lastReviewed?: number;
}

export type CardDraft = Pick<Flashcard, 'question' | 'answer'>;

export type Rating = 'again' | 'hard' | 'good' | 'easy';

export type Theme = 'system' | 'light' | 'dark';

export const DECK_COLORS = ['#2F5BEA', '#E0533D', '#2F9E6A', '#E39A2B', '#8B5CF6', '#0E9AA7'];

export const DEFAULT_DECK_ID = 'default';
