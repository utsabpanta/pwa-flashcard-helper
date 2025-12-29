import React, { useState } from 'react';
import { Flashcard } from '../models/flashCard';
import { extractTextFromPDF } from '../utils/pdfParser';
import { generateFlashcardsFromText } from '../utils/flashcardGenerator';
import { generateFlashcardsWithAI, AIProvider } from '../utils/aiService';
import { useLocalStorage } from '../utils/useLocalStorage';
import { Upload, Plus, FileText, Loader, Settings, Key, Sparkles, BrainCircuit } from 'lucide-react';

interface AddFlashcardProps {
  addFlashcard: (flashcard: Flashcard) => void;
}

type Mode = 'manual' | 'pdf';

const AddFlashcard: React.FC<AddFlashcardProps> = ({ addFlashcard }) => {
  const [mode, setMode] = useState<Mode>('manual');
  
  // AI Settings State
  const [provider, setProvider] = useLocalStorage<AIProvider>('ai_provider', 'gemini');
  const [geminiKey, setGeminiKey] = useLocalStorage<string>('gemini_api_key', '');
  const [claudeKey, setClaudeKey] = useLocalStorage<string>('claude_api_key', '');
  const [showSettings, setShowSettings] = useState(false);
  
  // Manual State
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  // PDF State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [generatedCards, setGeneratedCards] = useState<Omit<Flashcard, 'id'>[]>([]);

  const activeApiKey = provider === 'gemini' ? geminiKey : claudeKey;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && answer.trim()) {
      const newCard: Flashcard = {
        id: Date.now(),
        question: question.trim(),
        answer: answer.trim(),
      };
      addFlashcard(newCard);
      setQuestion('');
      setAnswer('');
      alert('Flashcard added!');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.');
      return;
    }

    setIsProcessing(true);
    try {
      const text = await extractTextFromPDF(file);
      setExtractedText(text);
    } catch (error) {
      console.error('PDF parsing failed:', error);
      alert('Failed to parse PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerate = async () => {
    if (!extractedText.trim()) return;

    if (activeApiKey) {
      setIsGenerating(true);
      try {
        const cards = await generateFlashcardsWithAI(extractedText, { provider, apiKey: activeApiKey });
        setGeneratedCards(cards);
        if (cards.length === 0) {
           alert("AI could not generate flashcards. Please check the text.");
        }
      } catch (error) {
        alert(`Generation with ${provider} failed. Check your API Key.`);
      } finally {
        setIsGenerating(false);
      }
    } else {
      // Fallback to manual regex
      const cards = generateFlashcardsFromText(extractedText);
      setGeneratedCards(cards);
      if (cards.length === 0) {
          alert("Could not automatically detect standard flashcards. Please ensure the text has distinct questions and answers, or edit the text above. Tip: Add an AI API Key in Settings for smart generation!");
      }
    }
  };

  const saveAllGenerated = () => {
    generatedCards.forEach((card, index) => {
      addFlashcard({
        ...card,
        id: Date.now() + index, // Ensure unique IDs
      });
    });
    setGeneratedCards([]);
    setExtractedText('');
    alert(`Successfully added ${generatedCards.length} flashcards!`);
  };

  return (
    <div className="add-flashcard-container">
      <div className="header-actions" style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem'}}>
        <button className="btn-icon" onClick={() => setShowSettings(!showSettings)} title="AI Settings">
          <Settings size={20} />
        </button>
      </div>

      {showSettings && (
        <div className="settings-panel" style={{background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e9ecef'}}>
          <h4 style={{margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <BrainCircuit size={18} /> AI Configuration
          </h4>
          
          <div className="form-group">
            <label style={{fontSize: '0.9rem', marginBottom: '0.25rem'}}>Select Provider:</label>
            <select 
              value={provider} 
              onChange={(e) => setProvider(e.target.value as AIProvider)}
              style={{width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da', marginBottom: '1rem'}}
            >
              <option value="gemini">Google Gemini (Recommended)</option>
              <option value="claude">Anthropic Claude</option>
            </select>
          </div>

          <div className="form-group">
            <label style={{fontSize: '0.9rem', marginBottom: '0.25rem'}}>
               <Key size={14} style={{display:'inline', verticalAlign:'middle'}}/> {provider === 'gemini' ? 'Gemini' : 'Claude'} API Key
            </label>
            <input 
              type="password" 
              value={provider === 'gemini' ? geminiKey : claudeKey} 
              onChange={(e) => provider === 'gemini' ? setGeminiKey(e.target.value) : setClaudeKey(e.target.value)} 
              placeholder={`Paste your ${provider === 'gemini' ? 'Google' : 'Anthropic'} API Key`}
              style={{width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da'}}
            />
            <p style={{fontSize: '0.8rem', color: '#6c757d', marginTop: '0.25rem'}}>
              {provider === 'gemini' 
                ? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{color: '#6366f1'}}>Get Gemini Key</a>
                : <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" style={{color: '#6366f1'}}>Get Claude Key</a>
              }
            </p>
          </div>
        </div>
      )}

      <div className="tabs">
        <button 
          className={`tab-btn ${mode === 'manual' ? 'active' : ''}`} 
          onClick={() => setMode('manual')}
        >
          <Plus size={16} /> Manual Entry
        </button>
        <button 
          className={`tab-btn ${mode === 'pdf' ? 'active' : ''}`} 
          onClick={() => setMode('pdf')}
        >
          <FileText size={16} /> PDF Upload
        </button>
      </div>

      {mode === 'manual' ? (
        <form onSubmit={handleManualSubmit} className="manual-form">
          <div className="form-group">
            <label htmlFor="question">Question</label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What is the capital of France?"
              rows={3}
            />
          </div>
          <div className="form-group">
            <label htmlFor="answer">Answer</label>
            <textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="e.g. Paris"
              rows={3}
            />
          </div>
          <button type="submit" className="submit-btn">Add Flashcard</button>
        </form>
      ) : (
        <div className="pdf-upload-section">
          <div className="file-input-wrapper">
            <label htmlFor="pdf-upload" className="file-drop-zone">
              <Upload size={32} />
              <span>Click to upload PDF</span>
              <input 
                id="pdf-upload" 
                type="file" 
                accept="application/pdf" 
                onChange={handleFileChange}
                hidden
              />
            </label>
          </div>

          {isProcessing && (
            <div className="loading-state">
              <Loader className="spin" /> Processing PDF...
            </div>
          )}

          {extractedText && (
            <div className="extraction-area">
              <h3>Extracted Text</h3>
              {!activeApiKey && <p className="hint-text">No API Key detected for {provider}. Using basic text splitting.</p>}
              {activeApiKey && <p className="hint-text" style={{color: '#6366f1', fontWeight: 500}}> <Sparkles size={14} style={{display:'inline', verticalAlign:'middle'}}/> AI Ready ({provider})</p>}
              
              <textarea 
                value={extractedText} 
                onChange={(e) => setExtractedText(e.target.value)}
                rows={10}
                className="extracted-text-input"
              />
              <button onClick={handleGenerate} className="action-btn" disabled={isGenerating}>
                {isGenerating ? (
                   <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                     <Loader className="spin" size={18} /> Generating with {provider}...
                   </span>
                ) : (
                   activeApiKey ? `Generate with ${provider === 'gemini' ? 'Gemini' : 'Claude'}` : "Generate Flashcards (Basic)"
                )}
              </button>
            </div>
          )}

          {generatedCards.length > 0 && (
            <div className="preview-area">
              <h3>Preview ({generatedCards.length})</h3>
              <div className="preview-list">
                {generatedCards.map((card, i) => (
                  <div key={i} className="preview-card">
                    <p><strong>Q:</strong> {card.question}</p>
                    <p><strong>A:</strong> {card.answer}</p>
                  </div>
                ))}
              </div>
              <button onClick={saveAllGenerated} className="submit-btn">
                Save All Flashcards
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AddFlashcard;