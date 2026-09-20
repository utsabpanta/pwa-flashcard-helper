import React, { useRef } from 'react';
import { Download, ExternalLink, Monitor, Moon, Sun, Trash2, Upload } from 'lucide-react';
import { Store } from '../hooks/useStore';
import { Theme } from '../models/flashCard';
import { AIProvider } from '../utils/aiService';
import { useLocalStorage } from '../utils/useLocalStorage';
import { dayKey } from '../utils/srs';
import { useToast } from './Toast';

const Settings: React.FC<{ store: Store }> = ({ store }) => {
  const toast = useToast();
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'system');
  const [provider, setProvider] = useLocalStorage<AIProvider>('ai_provider', 'gemini');
  const [geminiKey, setGeminiKey] = useLocalStorage<string>('gemini_api_key', '');
  const [claudeKey, setClaudeKey] = useLocalStorage<string>('claude_api_key', '');
  const fileRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(store.exportBackup(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcards-backup-${dayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup downloaded');
  };

  const importData = async (file?: File) => {
    if (!file) return;
    try {
      const count = store.importBackup(JSON.parse(await file.text()));
      toast(`Imported ${count} cards`);
    } catch (e) {
      toast(e instanceof Error && e.message.includes('No flashcards') ? e.message : 'That file isn\'t a Flashcard Helper backup.', { tone: 'error' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const reset = () => {
    if (confirm('Delete all decks, cards and study history from this device? Download a backup first if you might want them back.')) {
      store.resetAll();
      toast('All data deleted');
    }
  };

  return (
    <div className="settings">
      <h1>Settings</h1>

      <section className="settings-group">
        <h2>Appearance</h2>
        <div className="segmented" role="radiogroup" aria-label="Theme">
          {([
            ['system', Monitor, 'System'],
            ['light', Sun, 'Light'],
            ['dark', Moon, 'Dark'],
          ] as const).map(([value, Icon, label]) => (
            <button key={value} role="radio" aria-checked={theme === value} className={theme === value ? 'active' : ''} onClick={() => setTheme(value)}>
              <Icon size={16} aria-hidden /> {label}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-group">
        <h2>AI card writing</h2>
        <p className="muted small">
          Used only when you make cards from a PDF. Your key stays on this device and is sent directly to the provider you pick.
        </p>
        <label className="field">
          <span>Provider</span>
          <select value={provider} onChange={(e) => setProvider(e.target.value as AIProvider)}>
            <option value="gemini">Google Gemini</option>
            <option value="claude">Anthropic Claude</option>
          </select>
        </label>
        <label className="field">
          <span>{provider === 'gemini' ? 'Gemini' : 'Claude'} API key</span>
          <input
            type="password"
            autoComplete="off"
            value={provider === 'gemini' ? geminiKey : claudeKey}
            onChange={(e) => (provider === 'gemini' ? setGeminiKey(e.target.value) : setClaudeKey(e.target.value))}
            placeholder={`Paste your ${provider === 'gemini' ? 'Google AI Studio' : 'Anthropic'} key`}
          />
        </label>
        <a
          className="link-btn"
          href={provider === 'gemini' ? 'https://aistudio.google.com/app/apikey' : 'https://console.anthropic.com/'}
          target="_blank"
          rel="noreferrer"
        >
          Get a {provider === 'gemini' ? 'Gemini' : 'Claude'} key <ExternalLink size={14} className="inline-icon" />
        </a>
      </section>

      <section className="settings-group">
        <h2>Backup</h2>
        <p className="muted small">
          Your {store.flashcards.length} cards live only in this browser. Download a backup to move them to another device or keep them safe.
        </p>
        <div className="button-row">
          <button className="btn btn-secondary" onClick={exportData}>
            <Download size={16} /> Download backup
          </button>
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Import backup
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => importData(e.target.files?.[0])} />
        </div>
      </section>

      <section className="settings-group">
        <h2>Delete data</h2>
        <button className="btn btn-danger-ghost" onClick={reset}>
          <Trash2 size={16} /> Delete everything on this device
        </button>
      </section>
    </div>
  );
};

export default Settings;
