import { useEffect, useState } from 'react';
import { Home as HomeIcon, Layers, Plus, Settings as SettingsIcon } from 'lucide-react';
import { useStore } from './hooks/useStore';
import { useLocalStorage } from './utils/useLocalStorage';
import { Theme } from './models/flashCard';
import { ToastProvider } from './components/Toast';
import Home from './components/Home';
import DeckView from './components/DeckView';
import AddFlashcard from './components/AddFlashcard';
import FlashcardStudy from './components/FlashcardStudy';
import Settings from './components/Settings';

export type Route =
  | { name: 'home' }
  | { name: 'deck'; deckId: string }
  | { name: 'add'; deckId?: string }
  | { name: 'study'; deckId?: string; mode: 'review' | 'cram' }
  | { name: 'settings' };

export type Navigate = (route: Route) => void;

function App() {
  const store = useStore();
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [theme] = useLocalStorage<Theme>('theme', 'system');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);

  const navigate: Navigate = (r) => {
    setRoute(r);
    window.scrollTo({ top: 0 });
  };

  const studying = route.name === 'study';

  const tabs = [
    { key: 'home', label: 'Today', icon: HomeIcon, go: () => navigate({ name: 'home' }), active: route.name === 'home' || route.name === 'deck' },
    { key: 'study', label: 'Study', icon: Layers, go: () => navigate({ name: 'study', mode: 'review' }), active: studying },
    { key: 'add', label: 'Add', icon: Plus, go: () => navigate({ name: 'add' }), active: route.name === 'add' },
    { key: 'settings', label: 'Settings', icon: SettingsIcon, go: () => navigate({ name: 'settings' }), active: route.name === 'settings' },
  ];

  return (
    <ToastProvider>
      <div className={`app ${studying ? 'is-studying' : ''}`}>
        <header className="topbar">
          <button className="brand" onClick={() => navigate({ name: 'home' })}>
            <img src="/flashcard helper.png" alt="" width={32} height={32} />
            <span>Flashcard Helper</span>
          </button>
          <nav className="tabs-desktop" aria-label="Main">
            {tabs.map((t) => (
              <button key={t.key} className={`tab ${t.active ? 'active' : ''}`} onClick={t.go} aria-current={t.active ? 'page' : undefined}>
                <t.icon size={18} aria-hidden /> {t.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="main" key={route.name + ('deckId' in route ? route.deckId ?? '' : '')}>
          {route.name === 'home' && <Home store={store} navigate={navigate} />}
          {route.name === 'deck' && <DeckView store={store} deckId={route.deckId} navigate={navigate} />}
          {route.name === 'add' && <AddFlashcard store={store} initialDeckId={route.deckId} navigate={navigate} />}
          {route.name === 'study' && (
            <FlashcardStudy store={store} deckId={route.deckId} mode={route.mode} navigate={navigate} />
          )}
          {route.name === 'settings' && <Settings store={store} />}
        </main>

        <nav className="tabs-mobile" aria-label="Main">
          {tabs.map((t) => (
            <button key={t.key} className={`tab ${t.active ? 'active' : ''}`} onClick={t.go} aria-current={t.active ? 'page' : undefined}>
              <t.icon size={22} aria-hidden />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </ToastProvider>
  );
}

export default App;
