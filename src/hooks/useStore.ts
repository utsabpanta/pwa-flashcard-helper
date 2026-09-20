import { useCallback, useEffect, useMemo } from 'react';
import { useLocalStorage } from '../utils/useLocalStorage';
import { CardDraft, Deck, DECK_COLORS, DEFAULT_DECK_ID, Flashcard, Rating } from '../models/flashCard';
import { dayKey, newCard, schedule } from '../utils/srs';

type LegacyCard = Partial<Flashcard> & { id: number; question: string; answer: string };

const migrateCard = (c: LegacyCard): Flashcard => ({
  deckId: DEFAULT_DECK_ID,
  createdAt: c.id,
  due: Date.now(),
  interval: 0,
  ease: 2.5,
  reps: 0,
  lapses: 0,
  ...c,
});

const defaultDeck: Deck = { id: DEFAULT_DECK_ID, name: 'My cards', color: DECK_COLORS[0], createdAt: 0 };

export interface Backup {
  app: 'flashcard-helper';
  version: 2;
  exportedAt: string;
  decks: Deck[];
  flashcards: Flashcard[];
  studyLog: Record<string, number>;
}

export function useStore() {
  // "flashcards" is the same key the original app used, so existing cards carry over.
  const [rawCards, setCards] = useLocalStorage<LegacyCard[]>('flashcards', []);
  const [decks, setDecks] = useLocalStorage<Deck[]>('decks', [defaultDeck]);
  const [studyLog, setStudyLog] = useLocalStorage<Record<string, number>>('study_log', {});

  const needsMigration = rawCards.some((c) => c.deckId === undefined || c.due === undefined);
  const flashcards = useMemo(() => rawCards.map(migrateCard), [rawCards]);

  useEffect(() => {
    if (needsMigration) setCards((prev) => prev.map(migrateCard));
  }, [needsMigration, setCards]);

  // Make sure every card's deck exists (e.g. after importing old data)
  useEffect(() => {
    const ids = new Set(decks.map((d) => d.id));
    if (flashcards.some((c) => !ids.has(c.deckId)) && !ids.has(DEFAULT_DECK_ID)) {
      setDecks((prev) => [defaultDeck, ...prev]);
    }
  }, [decks, flashcards, setDecks]);

  const addCards = useCallback(
    (drafts: CardDraft[], deckId: string) => {
      const base = Date.now();
      setCards((prev) => [...prev, ...drafts.map((d, i) => newCard(d, deckId, base + i))]);
    },
    [setCards]
  );

  const updateCard = useCallback(
    (id: number, patch: Partial<Flashcard>) =>
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    [setCards]
  );

  const deleteCard = useCallback(
    (id: number) => {
      const removed = rawCards.find((c) => c.id === id);
      setCards((prev) => prev.filter((c) => c.id !== id));
      return () => {
        if (removed) setCards((prev) => [...prev, removed]);
      };
    },
    [rawCards, setCards]
  );

  const reviewCard = useCallback(
    (card: Flashcard, rating: Rating) => {
      const updated = schedule(card, rating);
      setCards((prev) => prev.map((c) => (c.id === card.id ? updated : c)));
      setStudyLog((prev) => ({ ...prev, [dayKey()]: (prev[dayKey()] ?? 0) + 1 }));
      return updated;
    },
    [setCards, setStudyLog]
  );

  const logStudy = useCallback(
    () => setStudyLog((prev) => ({ ...prev, [dayKey()]: (prev[dayKey()] ?? 0) + 1 })),
    [setStudyLog]
  );

  const createDeck = useCallback(
    (name: string): Deck => {
      const deck: Deck = {
        id: `deck-${Date.now()}`,
        name: name.trim() || 'Untitled deck',
        color: DECK_COLORS[decks.length % DECK_COLORS.length],
        createdAt: Date.now(),
      };
      setDecks((prev) => [...prev, deck]);
      return deck;
    },
    [decks.length, setDecks]
  );

  const updateDeck = useCallback(
    (id: string, patch: Partial<Deck>) => setDecks((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d))),
    [setDecks]
  );

  const deleteDeck = useCallback(
    (id: string) => {
      setDecks((prev) => prev.filter((d) => d.id !== id));
      setCards((prev) => prev.filter((c) => c.deckId !== id));
    },
    [setDecks, setCards]
  );

  const exportBackup = useCallback((): Backup => ({
    app: 'flashcard-helper',
    version: 2,
    exportedAt: new Date().toISOString(),
    decks,
    flashcards,
    studyLog,
  }), [decks, flashcards, studyLog]);

  /** Merge a backup (or a plain array of cards from the old app) into current data. */
  const importBackup = useCallback(
    (data: unknown): number => {
      const incomingCards: LegacyCard[] = Array.isArray(data)
        ? data
        : (data as Backup)?.flashcards ?? [];
      const incomingDecks: Deck[] = Array.isArray(data) ? [] : (data as Backup)?.decks ?? [];
      const valid = incomingCards.filter((c) => c && typeof c.question === 'string' && typeof c.answer === 'string');
      if (valid.length === 0) throw new Error('No flashcards found in this file');

      setDecks((prev) => {
        const ids = new Set(prev.map((d) => d.id));
        return [...prev, ...incomingDecks.filter((d) => !ids.has(d.id))];
      });
      setCards((prev) => {
        const ids = new Set(prev.map((c) => c.id));
        return [...prev, ...valid.filter((c) => !ids.has(c.id)).map(migrateCard)];
      });
      if (!Array.isArray(data) && (data as Backup).studyLog) {
        setStudyLog((prev) => ({ ...(data as Backup).studyLog, ...prev }));
      }
      return valid.length;
    },
    [setCards, setDecks, setStudyLog]
  );

  const resetAll = useCallback(() => {
    setCards([]);
    setDecks([defaultDeck]);
    setStudyLog({});
  }, [setCards, setDecks, setStudyLog]);

  return {
    flashcards,
    decks,
    studyLog,
    addCards,
    updateCard,
    deleteCard,
    reviewCard,
    logStudy,
    createDeck,
    updateDeck,
    deleteDeck,
    exportBackup,
    importBackup,
    resetAll,
  };
}

export type Store = ReturnType<typeof useStore>;
