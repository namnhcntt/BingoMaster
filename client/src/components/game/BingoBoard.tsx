import { useMemo } from 'react';
import BingoBoardCell, { CellState } from './BingoBoardCell';

export interface BingoBoardCell {
  id: string;
  position: string;
  content: string;
  state: CellState;
  answer?: string;
}

interface BingoBoardProps {
  cells: BingoBoardCell[];
  boardSize: number;
  cellSize?: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
  animate?: boolean;
  onCellClick?: (cell: BingoBoardCell) => void;
  winningPattern?: string[];
}

export function BingoBoard({
  cells,
  boardSize,
  cellSize = 'medium',
  animate = false,
  onCellClick,
  winningPattern = []
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
    <div className={`grid ${getGridColumnsClass(boardSize)} gap-3 w-full max-w-full`}>
      {cells.map((cell) => (
        <BingoBoardCell
          key={cell.id}
          position={cell.position}
          content={cell.content}
          state={isCellInWinningPattern(cell.position) ? 'correct' : cell.state}
          size={cellSize}
          animate={animate}
          onClick={() => onCellClick && onCellClick(cell)}
        />
      ))}
    </div>
  );
}

export default BingoBoard;
