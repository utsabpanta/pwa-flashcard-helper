import { useState } from 'react';
import { Flashcard } from './models/flashCard';
import FlashcardList from './components/FlashcardList';
import AddFlashcard from './components/AddFlashcard';
import FlashcardStudy from './components/FlashcardStudy';
import { useLocalStorage } from './utils/useLocalStorage';

type View = 'list' | 'add' | 'study';

function App() {
  const [flashcards, setFlashcards] = useLocalStorage<Flashcard[]>('flashcards', []);
  const [view, setView] = useState<View>('list');

  const addFlashcard = (flashcard: Flashcard) => {
    setFlashcards([...flashcards, flashcard]);
  };

  return (
    <>
    <header>
        <img src="/flashcard helper.png" alt="Flashcard Helper Logo" />
        <h1>Flashcard Helper</h1>
      </header>
      <nav>
        <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>Flashcards List</button>
        <button className={view === 'add' ? 'active' : ''} onClick={() => setView('add')}>Add Flashcard</button>
        <button className={view === 'study' ? 'active' : ''} onClick={() => setView('study')}>Study Mode</button>
      </nav>
      <div className='container'>
        {view === 'list' && <FlashcardList flashcards={flashcards} />}
        {view === 'add' && <AddFlashcard addFlashcard={addFlashcard} />}
        {view === 'study' && <FlashcardStudy flashcards={flashcards} />}
      </div>
    </>
  );
}

export default App;
