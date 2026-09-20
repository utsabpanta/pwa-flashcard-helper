import React, { useMemo, useRef, useState } from 'react';
import { FileText, List, Loader, PenLine, Sparkles, Upload, X } from 'lucide-react';
import { Store } from '../hooks/useStore';
import { Navigate } from '../App';
import { CardDraft, DEFAULT_DECK_ID } from '../models/flashCard';
import { extractTextFromPDF } from '../utils/pdfParser';
import { generateFlashcardsFromText, parseCardList } from '../utils/flashcardGenerator';
import { generateFlashcardsWithAI, AIProvider } from '../utils/aiService';
import { useLocalStorage } from '../utils/useLocalStorage';
import { useToast } from './Toast';

interface Props {
  store: Store;
  initialDeckId?: string;
  navigate: Navigate;
}

type Mode = 'single' | 'list' | 'pdf';

const NEW_DECK = '__new__';

const Preview: React.FC<{ cards: CardDraft[]; onRemove: (i: number) => void }> = ({ cards, onRemove }) => (
  <ul className="preview-list">
    {cards.map((c, i) => (
      <li key={i} className="preview-item">
        <div>
          <p className="card-q">{c.question}</p>
          <p className="card-a">{c.answer}</p>
        </div>
        <button className="icon-btn" onClick={() => onRemove(i)} aria-label="Leave this card out">
          <X size={16} />
        </button>
      </li>
    ))}
  </ul>
);

const AddFlashcard: React.FC<Props> = ({ store, initialDeckId, navigate }) => {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('single');
  const [deckId, setDeckId] = useState(initialDeckId ?? store.decks[0]?.id ?? DEFAULT_DECK_ID);
  const [newDeckName, setNewDeckName] = useState('');

  // Single
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [addedCount, setAddedCount] = useState(0);
  const questionRef = useRef<HTMLTextAreaElement>(null);

  // List
  const [listText, setListText] = useState('');
  const listCards = useMemo(() => parseCardList(listText), [listText]);

  // PDF
  const [provider] = useLocalStorage<AIProvider>('ai_provider', 'gemini');
  const [geminiKey] = useLocalStorage<string>('gemini_api_key', '');
  const [claudeKey] = useLocalStorage<string>('claude_api_key', '');
  const activeApiKey = provider === 'gemini' ? geminiKey : claudeKey;
  const providerName = provider === 'gemini' ? 'Gemini' : 'Claude';
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [generated, setGenerated] = useState<CardDraft[]>([]);

  const resolveDeck = (): string | null => {
    if (deckId !== NEW_DECK) return deckId;
    if (!newDeckName.trim()) {
      toast('Name the new deck first', { tone: 'error' });
      return null;
    }
    const deck = store.createDeck(newDeckName);
    setDeckId(deck.id);
    setNewDeckName('');
    return deck.id;
  };

  const deckName = (id: string) => store.decks.find((d) => d.id === id)?.name ?? 'your deck';

  const submitSingle = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    const target = resolveDeck();
    if (!target) return;
    store.addCards([{ question, answer }], target);
    setQuestion('');
    setAnswer('');
    setAddedCount((n) => n + 1);
    toast('Card added');
    questionRef.current?.focus();
  };

  const saveMany = (cards: CardDraft[], reset: () => void) => {
    const target = resolveDeck();
    if (!target || cards.length === 0) return;
    store.addCards(cards, target);
    reset();
    toast(`Added ${cards.length} cards to ${deckName(target)}`, {
      action: { label: 'View deck', onClick: () => navigate({ name: 'deck', deckId: target }) },
    });
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast('That file isn\'t a PDF. Choose a .pdf file.', { tone: 'error' });
      return;
    }
    setFileName(file.name);
    setGenerated([]);
    setIsProcessing(true);
    try {
      setExtractedText(await extractTextFromPDF(file));
    } catch (error) {
      console.error('PDF parsing failed:', error);
      toast('Couldn\'t read that PDF. It may be scanned images rather than text.', { tone: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const generate = async () => {
    if (!extractedText.trim()) return;
    if (activeApiKey) {
      setIsGenerating(true);
      try {
        const cards = await generateFlashcardsWithAI(extractedText, { provider, apiKey: activeApiKey });
        setGenerated(cards);
        if (cards.length === 0) toast(`${providerName} didn't find anything to make cards from.`, { tone: 'error' });
      } catch (error) {
        console.error(error);
        toast(`${providerName} couldn't generate cards. Check your API key in Settings.`, { tone: 'error' });
      } finally {
        setIsGenerating(false);
      }
    } else {
      const cards = generateFlashcardsFromText(extractedText);
      setGenerated(cards);
      if (cards.length === 0) {
        toast('No question and answer pairs found. Add an AI key in Settings for smarter generation.', { tone: 'error' });
      }
    }
  };

  return (
    <div className="add-view">
      <h1>Add cards</h1>

      <div className="deck-picker">
        <label className="field">
          <span>Deck</span>
          <select value={deckId} onChange={(e) => setDeckId(e.target.value)}>
            {store.decks.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
            <option value={NEW_DECK}>New deck…</option>
          </select>
        </label>
        {deckId === NEW_DECK && (
          <label className="field">
            <span>New deck name</span>
            <input value={newDeckName} onChange={(e) => setNewDeckName(e.target.value)} placeholder="e.g. Spanish verbs" autoFocus />
          </label>
        )}
      </div>

      <div className="segmented" role="tablist" aria-label="How to add cards">
        {([
          ['single', PenLine, 'One card'],
          ['list', List, 'Paste a list'],
          ['pdf', FileText, 'From a PDF'],
        ] as const).map(([m, Icon, label]) => (
          <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>
            <Icon size={16} aria-hidden /> {label}
          </button>
        ))}
      </div>

      {mode === 'single' && (
        <form onSubmit={submitSingle} className="single-form">
          <div className="index-card editor-card">
            <label className="editor-side">
              <span className="side-label">Front</span>
              <textarea
                ref={questionRef}
                className="hand"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What is the powerhouse of the cell?"
                rows={3}
              />
            </label>
            <label className="editor-side back">
              <span className="side-label">Back</span>
              <textarea
                className="hand"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="The mitochondria"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitSingle(e);
                }}
              />
            </label>
          </div>
          <div className="form-foot">
            <span className="muted small">{addedCount > 0 ? `${addedCount} added this session` : 'Tip: Ctrl + Enter adds the card'}</span>
            <button type="submit" className="btn btn-primary" disabled={!question.trim() || !answer.trim()}>
              Add card
            </button>
          </div>
        </form>
      )}

      {mode === 'list' && (
        <div className="list-mode">
          <label className="field">
            <span>One card per line, with the question and answer separated by | or a tab</span>
            <textarea
              value={listText}
              onChange={(e) => setListText(e.target.value)}
              rows={8}
              placeholder={'Capital of Japan | Tokyo\nH2O | Water\nPhotosynthesis - How plants turn light into energy'}
            />
          </label>
          {listCards.length > 0 && (
            <>
              <h2 className="preview-title">{listCards.length} cards found</h2>
              <Preview cards={listCards} onRemove={(i) => setListText(listText.split('\n').filter((l) => l.trim()).filter((_, j) => j !== i).join('\n'))} />
            </>
          )}
          <button className="btn btn-primary" disabled={listCards.length === 0} onClick={() => saveMany(listCards, () => setListText(''))}>
            Add {listCards.length || ''} cards
          </button>
        </div>
      )}

      {mode === 'pdf' && (
        <div className="pdf-mode">
          <label
            className="drop-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0]);
            }}
          >
            {isProcessing ? <Loader className="spin" size={28} /> : <Upload size={28} />}
            <span>{isProcessing ? 'Reading PDF…' : fileName || 'Choose or drop a PDF of your notes'}</span>
            <input type="file" accept="application/pdf" onChange={(e) => handleFile(e.target.files?.[0])} hidden />
          </label>

          <p className="muted small">
            {activeApiKey ? (
              <>
                <Sparkles size={14} className="inline-icon" /> {providerName} will write the cards for you.
              </>
            ) : (
              <>
                Without an AI key, only text already laid out as "term - definition" becomes cards.{' '}
                <button className="link-btn" onClick={() => navigate({ name: 'settings' })}>Add a key in Settings</button>
              </>
            )}
          </p>

          {extractedText && (
            <>
              <label className="field">
                <span>Text from {fileName} (edit it before generating if you like)</span>
                <textarea value={extractedText} onChange={(e) => setExtractedText(e.target.value)} rows={8} />
              </label>
              <button className="btn btn-secondary" onClick={generate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader className="spin" size={16} /> Writing cards with {providerName}…
                  </>
                ) : activeApiKey ? (
                  <>
                    <Sparkles size={16} /> Generate with {providerName}
                  </>
                ) : (
                  'Generate cards'
                )}
              </button>
            </>
          )}

          {generated.length > 0 && (
            <>
              <h2 className="preview-title">{generated.length} cards ready. Remove any you don't want.</h2>
              <Preview cards={generated} onRemove={(i) => setGenerated(generated.filter((_, j) => j !== i))} />
              <button
                className="btn btn-primary"
                onClick={() =>
                  saveMany(generated, () => {
                    setGenerated([]);
                    setExtractedText('');
                    setFileName('');
                  })
                }
              >
                Add {generated.length} cards
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AddFlashcard;
