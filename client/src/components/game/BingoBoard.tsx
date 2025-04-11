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
  // Compute grid-cols class based on boardSize
  const gridColsClass = useMemo(() => {
    return `grid-cols-${boardSize}`;
  }, [boardSize]);

  // Check if a cell is part of the winning pattern
  const isCellInWinningPattern = (position: string) => {
    return winningPattern.includes(position);
  };

  return (
    <div className={`grid ${gridColsClass} gap-3`}>
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
