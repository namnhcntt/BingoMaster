import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface QuestionDisplayProps {
  question: string;
  className?: string;
}

export default function QuestionDisplay({ question, className }: QuestionDisplayProps) {
  const [animate, setAnimate] = useState(false);
  
  // Animation effect when question changes
  useEffect(() => {
    setAnimate(true);
    const timer = setTimeout(() => setAnimate(false), 500);
    return () => clearTimeout(timer);
  }, [question]);

  return (
    <div 
      className={cn(
        "bg-white dark:bg-gray-700 p-8 rounded-lg shadow-lg text-center mb-6 transform transition-all duration-300",
        animate && "animate-pulse",
        className
      )}
    >
      <h2 className="text-6xl font-game font-bold text-gray-900 dark:text-white mb-4">
        {question}
      </h2>
      <p className="text-xl text-gray-600 dark:text-gray-400">
        Select the correct answer below
      </p>
    </div>
  );
}
