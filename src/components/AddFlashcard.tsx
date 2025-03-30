import React, { useState } from 'react';
import { Flashcard } from '../models/flashcard';

interface AddFlashcardProps {
  addFlashcard: (flashcard: Flashcard) => void;
}

const AddFlashcard: React.FC<AddFlashcardProps> = ({ addFlashcard }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question && answer) {
      const newCard: Flashcard = {
        id: Date.now(),
        question,
        answer,
      };
      addFlashcard(newCard);
      setQuestion('');
      setAnswer('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="question">Question:</label>
      <textarea
        id="question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Enter the question"
      />
      <label htmlFor="answer">Answer:</label>
      <textarea
        id="answer"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Enter the answer"
      />
      <button type="submit">Add Flashcard</button>
    </form>
  );
};

export default AddFlashcard;