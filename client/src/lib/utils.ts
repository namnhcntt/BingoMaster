import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names with tailwind merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time
 */
export function formatTime(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Generate a random string ID
 */
export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Shuffles an array in place
 */
export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Creates a grid of row and column positions
 * e.g. A1, A2, A3, B1, B2, B3, etc.
 */
export function createPositionGrid(size: number): string[] {
  const positions: string[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const rowLetter = String.fromCharCode(65 + row); // A, B, C, ...
      positions.push(`${rowLetter}${col + 1}`);
    }
  }
  return positions;
}

/**
 * Checks if an array of positions forms a bingo pattern
 */
export function checkBingoPattern(
  markedPositions: string[], 
  boardSize: number
): string[] | null {
  // Create a 2D array representation of the board
  const board: boolean[][] = Array(boardSize)
    .fill(false)
    .map(() => Array(boardSize).fill(false));

  // Mark positions on the board
  for (const pos of markedPositions) {
    const row = pos.charCodeAt(0) - 65; // Convert A, B, C to 0, 1, 2
    const col = parseInt(pos.substring(1)) - 1;
    if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
      board[row][col] = true;
    }
  }

  // Check rows
  for (let i = 0; i < boardSize; i++) {
    if (board[i].every(cell => cell)) {
      // Return the positions for this row
      return Array(boardSize)
        .fill(0)
        .map((_, j) => `${String.fromCharCode(65 + i)}${j + 1}`);
    }
  }

  // Check columns
  for (let j = 0; j < boardSize; j++) {
    if (board.every(row => row[j])) {
      // Return the positions for this column
      return Array(boardSize)
        .fill(0)
        .map((_, i) => `${String.fromCharCode(65 + i)}${j + 1}`);
    }
  }

  // Check diagonal from top-left to bottom-right
  if (Array(boardSize).fill(0).every((_, i) => board[i][i])) {
    // Return the positions for this diagonal
    return Array(boardSize)
      .fill(0)
      .map((_, i) => `${String.fromCharCode(65 + i)}${i + 1}`);
  }

  // Check diagonal from top-right to bottom-left
  if (Array(boardSize).fill(0).every((_, i) => board[i][boardSize - 1 - i])) {
    // Return the positions for this diagonal
    return Array(boardSize)
      .fill(0)
      .map((_, i) => `${String.fromCharCode(65 + i)}${boardSize - i}`);
  }

  // No bingo found
  return null;
}
