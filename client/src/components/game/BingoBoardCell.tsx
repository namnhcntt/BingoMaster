import { HTMLAttributes, useState } from 'react';
import { cn } from '@/lib/utils';

export type CellState = 'default' | 'selected' | 'correct' | 'incorrect';

interface BingoBoardCellProps extends HTMLAttributes<HTMLDivElement> {
  position: string;
  content: string;
  state: CellState;
  animate?: boolean;
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
  isHost?: boolean;
  question?: string;
  answer?: string;
  isPreviousQuestion?: boolean;
}

export function BingoBoardCell({ 
  position, 
  content, 
  state, 
  animate = false,
  size = 'medium',
  isHost = false,
  question = '',
  answer = '',
  isPreviousQuestion = false,
  className,
  ...props 
}: BingoBoardCellProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const sizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
    xlarge: 'text-lg',
    xxlarge: 'text-xl'
  };

  const stateClasses = {
    default: 'bingo-cell-default',
    selected: 'bingo-cell-selected',
    correct: 'bingo-cell-correct',
    incorrect: 'bingo-cell-incorrect'
  };

  const animationClass = animate ? (
    state === 'selected' ? 'cell-select' : 
    (state === 'correct' || state === 'incorrect') ? 'cell-reveal' : 
    ''
  ) : '';

  const isActiveState = state === 'correct' || state === 'selected';

  return (
    <div 
      className={cn(
        'bingo-cell relative',
        stateClasses[state],
        animationClass,
        sizeClasses[size],
        isPreviousQuestion && 'ring-2 ring-yellow-500 dark:ring-yellow-400',
        className
      )}
      onMouseEnter={() => isHost && setShowTooltip(true)}
      onMouseLeave={() => isHost && setShowTooltip(false)}
      {...props}
    >
      <div className={`text-[10px] leading-tight ${isActiveState ? 'text-primary-600 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'} mb-0.5`}>
        {position}
      </div>
      <div className={cn(
        'font-game font-medium text-center break-words w-full text-xs sm:text-sm',
        {
          'text-gray-900 dark:text-white': state === 'default',
          'text-primary-900 dark:text-primary-100': state === 'selected',
          'text-green-900 dark:text-green-100': state === 'correct',
          'text-red-900 dark:text-red-100': state === 'incorrect'
        }
      )}>
        {content}
      </div>
      {state === 'correct' && (
        <div className="mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      {state === 'incorrect' && (
        <div className="mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      
      {/* Host-only tooltip showing question and answer */}
      {isHost && showTooltip && question && (
        <div className="absolute z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-lg text-xs w-48 -top-2 left-full ml-2">
          <div className="font-semibold mb-1 text-gray-900 dark:text-white">Question:</div>
          <div className="text-gray-700 dark:text-gray-300 mb-2">{question}</div>
          {answer && (
            <>
              <div className="font-semibold mb-1 text-gray-900 dark:text-white">Answer:</div>
              <div className="text-primary-600 dark:text-primary-400">{answer}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default BingoBoardCell;
