import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Confetti from "@/components/ui/confetti";

export interface BingoGroupResult {
  groupId: string;
  groupName: string;
  members: {
    id: string;
    name: string;
    color?: string;
  }[];
  pattern: string[];
  boardSize: number;
}

interface BingoAchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: BingoGroupResult | null;
}

export default function BingoAchievementModal({
  isOpen,
  onClose,
  result
}: BingoAchievementModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
    } else {
      setShowConfetti(false);
    }
  }, [isOpen]);

  if (!result) return null;

  // Calculate grid cols based on board size
  const gridColsClass = `grid-cols-${result.boardSize}`;

  // Create a simplified board showing winning pattern
  const renderSimplifiedBoard = () => {
    const boardCells = [];
    const totalCells = result.boardSize * result.boardSize;
    
    for (let i = 0; i < totalCells; i++) {
      const row = Math.floor(i / result.boardSize);
      const col = i % result.boardSize;
      const position = `${String.fromCharCode(65 + row)}${col + 1}`;
      const isWinningCell = result.pattern.includes(position);
      
      boardCells.push(
        <div 
          key={position}
          className={`aspect-square flex items-center justify-center ${
            isWinningCell 
              ? 'bg-green-100 dark:bg-green-900 rounded-lg border-2 border-green-500' 
              : 'bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600'
          }`}
        >
          {position}
        </div>
      );
    }
    
    return (
      <div className={`grid ${gridColsClass} gap-2 max-w-sm mx-auto`}>
        {boardCells}
      </div>
    );
  };

  // Generate a color based on the member's name
  const getMemberColor = (member: { name: string, color?: string }) => {
    if (member.color) return member.color;
    
    const colors = [
      'primary-100 dark:primary-900 text-primary-800 dark:text-primary-200',
      'secondary-100 dark:secondary-900 text-secondary-800 dark:text-secondary-200',
      'accent-100 dark:accent-900 text-accent-800 dark:text-accent-200',
      'green-100 dark:green-900 text-green-800 dark:text-green-200',
      'purple-100 dark:purple-900 text-purple-800 dark:text-purple-200'
    ];
    
    // Simple hash function to get a consistent color for a name
    const nameHash = member.name.split('').reduce((hash, char) => {
      return char.charCodeAt(0) + ((hash << 5) - hash);
    }, 0);
    
    return colors[Math.abs(nameHash) % colors.length];
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-2xl p-6 my-8 text-left align-middle w-full">
        {showConfetti && <Confetti />}
        
        <div className="relative z-10">
          <div className="text-center">
            <div className="text-6xl font-bold font-game tracking-wide mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 animate-bounce-slow">
              BINGO!
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {result.groupName} has achieved Bingo!
            </h3>
            
            <div className="bg-primary-50 dark:bg-primary-900 rounded-xl p-6 mb-6">
              <h4 className="font-medium text-primary-800 dark:text-primary-200 mb-3">
                Winning Pattern
              </h4>
              {renderSimplifiedBoard()}
            </div>
            
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Group Members
              </h4>
              <div className="flex flex-wrap justify-center gap-2">
                {result.members.map(member => (
                  <div key={member.id} className="bg-white dark:bg-gray-700 px-3 py-2 rounded-md shadow-sm flex items-center">
                    <div className={`w-8 h-8 rounded-full bg-${getMemberColor(member)} flex items-center justify-center font-bold mr-2`}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{member.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <Button onClick={onClose}>
              Continue Playing
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
