import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, PanInfo, useReducedMotion } from 'framer-motion';
import { ArrowLeft, RotateCcw, X } from 'lucide-react';
import { Store } from '../hooks/useStore';
import { Navigate } from '../App';
import { Rating } from '../models/flashCard';
import { previewInterval, shuffle } from '../utils/srs';

interface Props {
  store: Store;
  deckId?: string;
  mode: 'review' | 'cram';
  navigate: Navigate;
}

const RATINGS: { rating: Rating; label: string; key: string }[] = [
  { rating: 'again', label: 'Again', key: '1' },
  { rating: 'hard', label: 'Hard', key: '2' },
  { rating: 'good', label: 'Good', key: '3' },
  { rating: 'easy', label: 'Easy', key: '4' },
];

const CRAM_RATINGS: { rating: Rating; label: string; key: string }[] = [
  { rating: 'again', label: 'Still learning', key: '1' },
  { rating: 'good', label: 'Got it', key: '2' },
];

const FlashcardStudy: React.FC<Props> = ({ store, deckId, mode, navigate }) => {
  const reduceMotion = useReducedMotion();
  const deck = deckId ? store.decks.find((d) => d.id === deckId) : undefined;

  // Build the queue once per session so reviewing doesn't reshuffle it
  const [queue, setQueue] = useState<number[]>(() => {
    const pool = store.flashcards.filter((c) => !deckId || c.deckId === deckId);
    if (mode === 'cram') return shuffle(pool).map((c) => c.id);
    return pool
      .filter((c) => c.due <= Date.now())
      .sort((a, b) => a.due - b.due)
      .map((c) => c.id);
  });
  const [total] = useState(queue.length);
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<Record<Rating, number>>({ again: 0, hard: 0, good: 0, easy: 0 });
  const [missedIds, setMissedIds] = useState<Set<number>>(new Set());
  const [startedAt] = useState(Date.now());

  const byId = useMemo(() => new Map(store.flashcards.map((c) => [c.id, c])), [store.flashcards]);
  const card = byId.get(queue[position]);
  const finished = position >= queue.length;
  const ratings = mode === 'cram' ? CRAM_RATINGS : RATINGS;

  const rate = useCallback(
    (rating: Rating) => {
      if (!card || !flipped) return;
      if (mode === 'review') store.reviewCard(card, rating);
      else store.logStudy();
      setResults((r) => ({ ...r, [rating]: r[rating] + 1 }));
      if (rating === 'again') {
        setQueue((q) => [...q, card.id]); // see it again this session
        setMissedIds((s) => new Set(s).add(card.id));
      }
      setFlipped(false);
      setPosition((p) => p + 1);
    },
    [card, flipped, mode, store]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === 'Escape') {
        navigate(deckId ? { name: 'deck', deckId } : { name: 'home' });
      } else {
        const match = ratings.find((r) => r.key === e.key);
        if (match) rate(match.rating);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finished, rate, ratings, navigate, deckId]);

  // Skip cards deleted mid-session
  useEffect(() => {
    if (!finished && !card) setPosition((p) => p + 1);
  }, [finished, card]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (!flipped) return;
    if (info.offset.x > 110) rate('good');
    else if (info.offset.x < -110) rate('again');
  };

  const exit = () => navigate(deckId ? { name: 'deck', deckId } : { name: 'home' });
  const title = deck?.name ?? 'All decks';

  if (total === 0) {
    return (
      <div className="study-empty">
        <button className="back-link" onClick={exit}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="index-card welcome-card">
          <p className="hand">Nothing due right now.</p>
        </div>
        <h1>You're caught up{deck ? ` on ${deck.name}` : ''}</h1>
        <p className="muted">Cards come back when you're about to forget them. You can still practice everything now without changing their schedule.</p>
        {store.flashcards.some((c) => !deckId || c.deckId === deckId) ? (
          <button className="btn btn-primary btn-lg" onClick={() => navigate({ name: 'study', deckId, mode: 'cram' })}>
            Practice all cards
          </button>
        ) : (
          <button className="btn btn-primary btn-lg" onClick={() => navigate({ name: 'add', deckId })}>
            Add cards
          </button>
        )}
      </div>
    );
  }

  if (finished) {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    const accuracy = Math.round(((total - missedIds.size) / total) * 100);
    return (
      <div className="summary">
        <div className="index-card summary-card">
          <p className="hand summary-big">{accuracy}%</p>
          <p className="hand">remembered on the first try</p>
        </div>
        <h1>Session done</h1>
        <p className="muted">
          {total} {total === 1 ? 'card' : 'cards'} in {minutes} {minutes === 1 ? 'minute' : 'minutes'}.
          {results.again > 0 ? ` You repeated ${results.again} ${results.again === 1 ? 'card' : 'cards'} until it stuck.` : ' Not a single miss.'}
        </p>
        <div className="summary-actions">
          <button className="btn btn-primary" onClick={exit}>Done</button>
          <button className="btn btn-secondary" onClick={() => navigate({ name: 'study', deckId, mode: 'cram' })}>
            <RotateCcw size={16} /> Practice again
          </button>
        </div>
      </div>
    );
  }

  if (!card) return null;

  const progress = Math.round((position / queue.length) * 100);

  return (
    <div className="study">
      <div className="study-top">
        <button className="icon-btn" onClick={exit} aria-label="End session">
          <X size={20} />
        </button>
        <div className="study-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <span className="study-count">
          {Math.min(position + 1, queue.length)}/{queue.length}
        </span>
      </div>
      <p className="study-deck muted">
        {title}, {mode === 'cram' ? 'practice' : 'review'}
      </p>

      <div className="stage">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`${card.id}-${position}`}
            className="flip-wrap"
            drag={flipped ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={onDragEnd}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, rotate: -1.5 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -60, rotate: -4 }}
            transition={{ duration: 0.22 }}
          >
            <motion.button
              className="flip-card"
              onClick={() => setFlipped((f) => !f)}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26 }}
              aria-label={flipped ? 'Show question' : 'Show answer'}
            >
              <div className="face front index-card">
                <span className="side-label">Question</span>
                <p className="hand face-text">{card.question}</p>
                <span className="face-hint">Tap to flip</span>
              </div>
              <div className="face back index-card">
                <span className="side-label">Answer</span>
                <p className="face-q">{card.question}</p>
                <p className="hand face-text">{card.answer}</p>
              </div>
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="study-controls">
        {!flipped ? (
          <button className="btn btn-primary btn-lg reveal" onClick={() => setFlipped(true)}>
            Show answer
          </button>
        ) : (
          <div className={`ratings ratings-${ratings.length}`}>
            {ratings.map((r) => (
              <button key={r.rating} className={`rate rate-${r.rating}`} onClick={() => rate(r.rating)}>
                <span className="rate-label">{r.label}</span>
                {mode === 'review' && <span className="rate-when">{previewInterval(card, r.rating)}</span>}
                <kbd>{r.key}</kbd>
              </button>
            ))}
          </div>
        )}
        <p className="study-help muted small">
          {flipped ? 'Swipe right if you knew it, left if you didn’t.' : 'Space flips the card.'}
        </p>
      </div>
    </div>
  );
};

export default FlashcardStudy;
