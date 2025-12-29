import React, { useState } from 'react';
import { Flashcard } from '../models/flashCard';
import { Trash2, Edit2, Save, X } from 'lucide-react';

interface FlashcardListProps {
  flashcards: Flashcard[];
  onDelete: (id: number) => void;
  onUpdate: (id: number, updatedCard: Flashcard) => void;
}

const FlashcardItem: React.FC<{ 
  card: Flashcard; 
  onDelete: (id: number) => void; 
  onUpdate: (id: number, updatedCard: Flashcard) => void; 
}> = ({ card, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState(card.question);
  const [editedAnswer, setEditedAnswer] = useState(card.answer);

  const handleSave = () => {
    if (editedQuestion.trim() && editedAnswer.trim()) {
      onUpdate(card.id, { ...card, question: editedQuestion, answer: editedAnswer });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedQuestion(card.question);
    setEditedAnswer(card.answer);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <li className="flashcard editing">
        <div className="edit-group">
          <label>Question</label>
          <textarea 
            value={editedQuestion} 
            onChange={(e) => setEditedQuestion(e.target.value)} 
            rows={2}
          />
        </div>
        <div className="edit-group">
          <label>Answer</label>
          <textarea 
            value={editedAnswer} 
            onChange={(e) => setEditedAnswer(e.target.value)} 
            rows={3}
          />
        </div>
        <div className="card-actions">
          <button onClick={handleSave} className="btn-icon btn-save" title="Save">
            <Save size={18} />
          </button>
          <button onClick={handleCancel} className="btn-icon btn-cancel" title="Cancel">
            <X size={18} />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flashcard">
      <div className="card-content">
        <p className="card-question"><strong>Q:</strong> {card.question}</p>
        <p className="card-answer"><strong>A:</strong> {card.answer}</p>
      </div>
      <div className="card-actions">
        <button onClick={() => setIsEditing(true)} className="btn-icon btn-edit" title="Edit">
          <Edit2 size={18} />
        </button>
        <button onClick={() => onDelete(card.id)} className="btn-icon btn-delete" title="Delete">
          <Trash2 size={18} />
        </button>
      </div>
    </li>
  );
};

const FlashcardList: React.FC<FlashcardListProps> = ({ flashcards, onDelete, onUpdate }) => {
  if (flashcards.length === 0) {
    return (
      <div className="empty-state">
        <p>No flashcards yet.</p>
        <p className="sub-text">Go to "Add Flashcard" to create your first set!</p>
      </div>
    );
  }

  return (
    <ul className="flashcard-list">
      {flashcards.map((card) => (
        <FlashcardItem 
          key={card.id} 
          card={card} 
          onDelete={onDelete} 
          onUpdate={onUpdate} 
        />
      ))}
    </ul>
  );
};

export default FlashcardList;