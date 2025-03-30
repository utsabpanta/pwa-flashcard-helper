import React from 'react';
import { Flashcard } from '../models/flashCard';

interface FlashcardListProps {
  flashcards: Flashcard[];
}

const FlashcardList: React.FC<FlashcardListProps> = ({ flashcards }) => {
  if (flashcards.length === 0) {
    return <p>No flashcards available. Please add some.</p>;
  }

  return (
    <ul className="flashcard-list">
      {flashcards.map((card) => (
        <li key={card.id} className="flashcard">
          <p>
            <strong>Question:</strong> {card.question}
          </p>
          <p>
            <strong>Answer:</strong> {card.answer}
          </p>
        </li>
      ))}
    </ul>
  );
};

export default FlashcardList;
