import React, { useState } from 'react';
import { Flashcard } from '../models/flashcard';

interface FlashcardStudyProps {
  flashcards: Flashcard[];
}

const FlashcardStudy: React.FC<FlashcardStudyProps> = ({ flashcards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  if (flashcards.length === 0) {
    return <p>No flashcards available for study. Please add some.</p>;
  }

  const currentCard = flashcards[currentIndex];

  const handleNext = () => {
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  return (
    <div className="study-mode">
      <div className="flashcard">
        <p>
          <strong>Question:</strong> {currentCard.question}
        </p>
        {showAnswer && (
          <p>
            <strong>Answer:</strong> {currentCard.answer}
          </p>
        )}
      </div>
      <div className="study-buttons">
        <button onClick={() => setShowAnswer(!showAnswer)}>
          {showAnswer ? 'Hide Answer' : 'Show Answer'}
        </button>
        <button onClick={handleNext}>Next Question</button>
      </div>
    </div>
  );
};

export default FlashcardStudy;
