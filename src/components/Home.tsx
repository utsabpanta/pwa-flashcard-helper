import React, { useMemo, useState } from 'react';
import { Flame, Plus } from 'lucide-react';
import { Store } from '../hooks/useStore';
import { Navigate } from '../App';
import { cardStatus, computeStreak, dayKey } from '../utils/srs';

interface Props {
  store: Store;
  navigate: Navigate;
}

const relativeTime = (ts: number) => {
  const mins = Math.round((ts - Date.now()) / 60000);
  if (mins < 60) return `in ${Math.max(1, mins)} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'tomorrow' : `in ${days} days`;
};

const Home: React.FC<Props> = ({ store, navigate }) => {
  const { flashcards, decks, studyLog, createDeck } = store;
  const [newDeckName, setNewDeckName] = useState('');
  const [creating, setCreating] = useState(false);

  const now = Date.now();
  const stats = useMemo(() => {
    const due = flashcards.filter((c) => c.due <= now);
    const mastered = flashcards.filter((c) => cardStatus(c, now) === 'mastered').length;
    const upcoming = flashcards.filter((c) => c.due > now).sort((a, b) => a.due - b.due)[0];
    return { due: due.length, mastered, nextDue: upcoming?.due };
  }, [flashcards, now]);

  const streak = computeStreak(studyLog);
  const today = studyLog[dayKey()] ?? 0;

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), count: studyLog[dayKey(d)] ?? 0, isToday: i === 6 };
  });

  const dateLine = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const submitDeck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    const deck = createDeck(newDeckName);
    setNewDeckName('');
    setCreating(false);
    navigate({ name: 'deck', deckId: deck.id });
  };

  if (flashcards.length === 0) {
    return (
      <section className="welcome">
        <div className="index-card welcome-card">
          <p className="hand">What do you want to remember?</p>
        </div>
        <h1>Make your first card</h1>
        <p className="muted">
          Write a question on the front and the answer on the back, paste a list, or turn a PDF of your notes into cards.
          The app then shows you each card right before you'd forget it.
        </p>
        <button className="btn btn-primary btn-lg" onClick={() => navigate({ name: 'add' })}>
          <Plus size={18} /> Add cards
        </button>
      </section>
    );
  }

  return (
    <div className="home">
      <section className="hero">
        <p className="muted">{dateLine}</p>
        {stats.due > 0 ? (
          <>
            <h1 className="hero-title">
              <span className="hero-count">{stats.due}</span> {stats.due === 1 ? 'card' : 'cards'} to review
            </h1>
            <button className="btn btn-primary btn-lg" onClick={() => navigate({ name: 'study', mode: 'review' })}>
              Start review
            </button>
          </>
        ) : (
          <>
            <h1 className="hero-title">You're all caught up</h1>
            <p className="muted">
              {stats.nextDue ? `Next card is due ${relativeTime(stats.nextDue)}.` : ''} Want to keep going? Practice a deck anyway.
            </p>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate({ name: 'study', mode: 'cram' })}>
              Practice all cards
            </button>
          </>
        )}
      </section>

      <section className="progress-strip" aria-label="Your progress">
        <div className="streak">
          <Flame size={20} className={streak > 0 ? 'flame-on' : ''} aria-hidden />
          <span>
            <strong>{streak}</strong> day streak
          </span>
        </div>
        <div className="week" aria-label="Cards reviewed in the last 7 days">
          {week.map((d, i) => (
            <div key={i} className={`week-day ${d.isToday ? 'today' : ''}`} title={`${d.count} reviewed`}>
              <span className="week-bar" style={{ height: `${Math.min(100, d.count * 4) || 6}%` }} data-active={d.count > 0} />
              <span className="week-label">{d.label}</span>
            </div>
          ))}
        </div>
        <p className="progress-note muted">
          {today} reviewed today, {stats.mastered} of {flashcards.length} mastered
        </p>
      </section>

      <section className="decks">
        <div className="section-head">
          <h2>Decks</h2>
          <button className="btn btn-ghost" onClick={() => setCreating((v) => !v)}>
            <Plus size={16} /> New deck
          </button>
        </div>

        {creating && (
          <form className="inline-form" onSubmit={submitDeck}>
            <input
              autoFocus
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder="Deck name, e.g. Biology 101"
              aria-label="Deck name"
            />
            <button className="btn btn-primary" type="submit">Create</button>
          </form>
        )}

        <ul className="deck-list">
          {decks.map((deck) => {
            const cards = flashcards.filter((c) => c.deckId === deck.id);
            const due = cards.filter((c) => c.due <= now).length;
            const mastered = cards.filter((c) => cardStatus(c, now) === 'mastered').length;
            const pct = cards.length ? Math.round((mastered / cards.length) * 100) : 0;
            return (
              <li key={deck.id}>
                <button className="deck-card" onClick={() => navigate({ name: 'deck', deckId: deck.id })} style={{ '--deck': deck.color } as React.CSSProperties}>
                  <span className="deck-name">{deck.name}</span>
                  <span className="deck-meta">
                    {cards.length} {cards.length === 1 ? 'card' : 'cards'}
                    {due > 0 && <span className="due-pill">{due} due</span>}
                  </span>
                  <span className="deck-bar" aria-label={`${pct}% mastered`}>
                    <span style={{ width: `${pct}%` }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
};

export default Home;
