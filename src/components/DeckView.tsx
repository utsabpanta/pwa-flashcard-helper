import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Edit2, Plus, Search, Shuffle, Trash2, X } from 'lucide-react';
import { Store } from '../hooks/useStore';
import { Navigate } from '../App';
import { Flashcard } from '../models/flashCard';
import { cardStatus, CardStatus } from '../utils/srs';
import { useToast } from './Toast';

interface Props {
  store: Store;
  deckId: string;
  navigate: Navigate;
}

const statusLabel: Record<CardStatus, string> = {
  new: 'New',
  learning: 'Learning',
  due: 'Due',
  review: 'Reviewing',
  mastered: 'Mastered',
};

const CardRow: React.FC<{ card: Flashcard; store: Store }> = ({ card, store }) => {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState(card.question);
  const [a, setA] = useState(card.answer);
  const [deckId, setDeckId] = useState(card.deckId);
  const status = cardStatus(card);

  const save = () => {
    if (!q.trim() || !a.trim()) return;
    store.updateCard(card.id, { question: q.trim(), answer: a.trim(), deckId });
    setEditing(false);
    toast(deckId !== card.deckId ? 'Card moved' : 'Card saved');
  };

  const remove = () => {
    const undo = store.deleteCard(card.id);
    toast('Card deleted', { action: { label: 'Undo', onClick: undo } });
  };

  if (editing) {
    return (
      <li className="card-row editing">
        <label className="field">
          <span>Front</span>
          <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={2} autoFocus />
        </label>
        <label className="field">
          <span>Back</span>
          <textarea value={a} onChange={(e) => setA(e.target.value)} rows={3} />
        </label>
        {store.decks.length > 1 && (
          <label className="field">
            <span>Deck</span>
            <select value={deckId} onChange={(e) => setDeckId(e.target.value)}>
              {store.decks.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
        )}
        <div className="row-actions">
          <button className="btn btn-ghost" onClick={() => { setQ(card.question); setA(card.answer); setDeckId(card.deckId); setEditing(false); }}>
            <X size={16} /> Cancel
          </button>
          <button className="btn btn-primary" onClick={save}>
            <Check size={16} /> Save card
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="card-row">
      <div className="card-row-text">
        <p className="card-q">{card.question}</p>
        <p className="card-a">{card.answer}</p>
      </div>
      <span className={`status status-${status}`}>{statusLabel[status]}</span>
      <div className="card-row-actions">
        <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Edit card">
          <Edit2 size={16} />
        </button>
        <button className="icon-btn danger" onClick={remove} aria-label="Delete card">
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
};

const DeckView: React.FC<Props> = ({ store, deckId, navigate }) => {
  const toast = useToast();
  const deck = store.decks.find((d) => d.id === deckId);
  const [query, setQuery] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(deck?.name ?? '');

  const cards = useMemo(() => store.flashcards.filter((c) => c.deckId === deckId), [store.flashcards, deckId]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? cards.filter((c) => (c.question + ' ' + c.answer).toLowerCase().includes(q)) : cards;
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [cards, query]);
  const due = cards.filter((c) => c.due <= Date.now()).length;

  if (!deck) {
    return (
      <div className="empty">
        <p>This deck no longer exists.</p>
        <button className="btn btn-secondary" onClick={() => navigate({ name: 'home' })}>Back to decks</button>
      </div>
    );
  }

  const deleteDeck = () => {
    if (!confirm(`Delete "${deck.name}" and its ${cards.length} cards? This can't be undone.`)) return;
    store.deleteDeck(deck.id);
    toast('Deck deleted');
    navigate({ name: 'home' });
  };

  return (
    <div className="deck-view" style={{ '--deck': deck.color } as React.CSSProperties}>
      <button className="back-link" onClick={() => navigate({ name: 'home' })}>
        <ArrowLeft size={16} /> Decks
      </button>

      <div className="deck-head">
        {renaming ? (
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              store.updateDeck(deck.id, { name: name.trim() || deck.name });
              setRenaming(false);
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus aria-label="Deck name" />
            <button className="btn btn-primary" type="submit">Rename</button>
          </form>
        ) : (
          <h1 className="deck-title">
            {deck.name}
            <button className="icon-btn" onClick={() => setRenaming(true)} aria-label="Rename deck">
              <Edit2 size={16} />
            </button>
          </h1>
        )}
        <p className="muted">
          {cards.length} {cards.length === 1 ? 'card' : 'cards'}, {due} due now
        </p>

        <div className="deck-actions">
          <button className="btn btn-primary" disabled={due === 0} onClick={() => navigate({ name: 'study', deckId, mode: 'review' })}>
            Review {due > 0 ? due : ''} due
          </button>
          <button className="btn btn-secondary" disabled={cards.length === 0} onClick={() => navigate({ name: 'study', deckId, mode: 'cram' })}>
            <Shuffle size={16} /> Practice all
          </button>
          <button className="btn btn-secondary" onClick={() => navigate({ name: 'add', deckId })}>
            <Plus size={16} /> Add cards
          </button>
        </div>
      </div>

      {cards.length > 0 ? (
        <>
          <label className="search">
            <Search size={16} aria-hidden />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this deck" aria-label="Search cards" />
          </label>
          {filtered.length === 0 ? (
            <p className="muted empty-inline">No cards match "{query}".</p>
          ) : (
            <ul className="card-list">
              {filtered.map((c) => (
                <CardRow key={c.id} card={c} store={store} />
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="empty">
          <p>This deck is empty.</p>
          <button className="btn btn-primary" onClick={() => navigate({ name: 'add', deckId })}>
            <Plus size={16} /> Add the first card
          </button>
        </div>
      )}

      <button className="btn btn-danger-ghost delete-deck" onClick={deleteDeck}>
        <Trash2 size={16} /> Delete deck
      </button>
    </div>
  );
};

export default DeckView;
