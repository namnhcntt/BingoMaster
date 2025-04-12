import { useMemo } from 'react';
import BingoBoardCell, { CellState } from './BingoBoardCell';

export interface BingoBoardCell {
  id: string;
  position: string;
  content: string;
  state: CellState;
  answer?: string;
  question?: string;
  isPreviousQuestion?: boolean;
}

interface BingoBoardProps {
  cells: BingoBoardCell[];
  boardSize: number;
  cellSize?: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
  animate?: boolean;
  onCellClick?: (cell: BingoBoardCell) => void;
  winningPattern?: string[];
  isHost?: boolean;
  previousQuestionPosition?: string;
}

export function BingoBoard({
  cells,
  boardSize,
  cellSize = 'medium',
  animate = false,
  onCellClick,
  winningPattern = [],
  isHost = false,
  previousQuestionPosition = ''
}: BingoBoardProps) {
  // Get proper grid columns based on board size
  const getGridColumnsClass = (size: number) => {
    switch (size) {
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-4';
      case 5: return 'grid-cols-5';
      case 6: return 'grid-cols-6';
      default: return 'grid-cols-3';
    }
  };

  // Check if a cell is part of the winning pattern
  const isCellInWinningPattern = (position: string) => {
    return winningPattern.includes(position);
  };

  return (
    <div className="w-full max-w-full overflow-auto">
      <div className={`grid ${getGridColumnsClass(boardSize)} gap-1 sm:gap-2 md:gap-3 mx-auto max-w-lg`}>
        {cells.map((cell) => (
          <BingoBoardCell
            key={cell.id}
            position={cell.position}
            content={cell.content}
            state={isCellInWinningPattern(cell.position) ? 'correct' : cell.state}
            size={cellSize}
            animate={animate}
            onClick={() => onCellClick && onCellClick(cell)}
            isHost={isHost}
            question={cell.question}
            answer={cell.answer}
            isPreviousQuestion={cell.position === previousQuestionPosition}
          />
        ))}
      </div>
    </div>
  );
}

export default BingoBoard;
