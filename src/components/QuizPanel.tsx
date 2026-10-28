import { useEffect, useRef } from 'react';
import { Button } from '@cloudflare/kumo/components/button';
import { Text } from '@cloudflare/kumo/components/text';
import type { Journey } from '../useJourney';

export function QuizPanel({ journey }: { journey: Journey }) {
  const { quiz, step, steps, index, startQuiz, answerQuiz, nextQuestion, finishQuiz } = journey;
  const questionRef = useRef<HTMLHeadingElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const nextPhase = steps.slice(index + 1).find((candidate) => candidate.phase !== step.phase)?.phase;

  useEffect(() => {
    if (!quiz) return;
    if (quiz.answered) actionRef.current?.focus();
    else questionRef.current?.focus();
  }, [quiz?.answered, quiz?.index, quiz]);

  if (!quiz) {
    if (!journey.quizVisible) return null;
    return (
      <section className="quiz-panel" aria-label={`${step.phase} quiz`}>
        <Text variant="heading" as="h3">
          {step.phase} quiz
        </Text>
        <p className="quiz-guidance">
          You are at the end of {step.phase}. Start the quiz or choose Skip quiz to continue
          {nextPhase ? ` to ${nextPhase}` : ' to finish here'}.
        </p>
        <Button variant="primary" onClick={startQuiz}>
          Start quiz
        </Button>
        <Button variant="secondary" onClick={finishQuiz}>
          Skip quiz
        </Button>
      </section>
    );
  }

  const question = quiz.questions[quiz.index];
  const finished = quiz.answered && quiz.index === 4;

  return (
    <section className="quiz-panel" aria-label={`${quiz.phase} quiz`}>
      <Text variant="heading" as="h3">
        {quiz.phase} quiz
      </Text>
      <p className="quiz-count">
        Question {quiz.index + 1} of 5
      </p>
      <h4 className="quiz-question" tabIndex={-1} ref={questionRef}>
        {question.prompt}
      </h4>
      {question.choices.map((choice, choiceIndex) => (
        <Button
          key={choiceIndex}
          className="quiz-choice"
          variant="secondary"
          disabled={quiz.answered}
          onClick={() => answerQuiz(choiceIndex)}
        >
          {choice}
        </Button>
      ))}
      {quiz.answered ? (
        <>
          <p className="quiz-feedback" role="status" aria-live="polite">
            {quiz.feedback} {question.explanation}
          </p>
          {finished ? (
            <>
              <p className="quiz-score">Score: {quiz.score}/5</p>
              <Button ref={actionRef} variant="primary" onClick={finishQuiz}>
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={finishQuiz}>
                Skip quiz
              </Button>
              <Button ref={actionRef} variant="primary" onClick={nextQuestion}>
                Next question
              </Button>
            </>
          )}
        </>
      ) : (
        <Button variant="secondary" onClick={finishQuiz}>
          Skip quiz
        </Button>
      )}
    </section>
  );
}
