import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { gameSettingsSchema } from '@shared/types';
import QuestionsForm from './QuestionsForm';

interface GameCreationWizardProps {
  onComplete: (settings: any, questions: any[]) => void;
}

// Define the steps of the wizard
type Step = 'settings' | 'questions' | 'review';

export default function GameCreationWizard({ onComplete }: GameCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('settings');
  const [gameSettings, setGameSettings] = useState<z.infer<typeof gameSettingsSchema> | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);

  // Form for game settings
  const form = useForm<z.infer<typeof gameSettingsSchema>>({
    resolver: zodResolver(gameSettingsSchema),
    defaultValues: {
      boardSize: 5,
      cellSize: 'medium',
      answerTime: 30,
      groupCount: 4,
      name: '',
    },
  });

  // Handle settings form submission
  function onSettingsSubmit(data: z.infer<typeof gameSettingsSchema>) {
    // Ensure answerTime is a proper number
    const validatedData = {
      ...data,
      answerTime: Number(data.answerTime)
    };
    setGameSettings(validatedData);
    setCurrentStep('questions');
  }

  // Handle questions form submission
  function onQuestionsSubmit(questionData: any[]) {
    setQuestions(questionData);
    setCurrentStep('review');
  }

  // Handle final submission
  function handleComplete() {
    if (gameSettings && questions.length > 0) {
      onComplete(gameSettings, questions);
    }
  }

  // Render step indicator
  const renderStepIndicator = (step: Step, number: number, label: string) => {
    const isActive = currentStep === step;
    const isCompleted = 
      (step === 'settings' && gameSettings) || 
      (step === 'questions' && questions.length > 0);

    return (
      <button 
        className={`px-6 py-3 font-medium text-sm ${
          isActive 
            ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500' 
            : 'text-gray-500 dark:text-gray-400'
        }`}
        onClick={() => {
          if (step === 'settings' || (step === 'questions' && gameSettings)) {
            setCurrentStep(step);
          }
        }}
      >
        <span className={`
          rounded-full h-6 w-6 inline-flex items-center justify-center mr-2
          ${isActive 
            ? 'bg-primary-500 text-white' 
            : isCompleted 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
          }
        `}>
          {isCompleted ? '✓' : number}
        </span>
        {label}
      </button>
    );
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-primary-100 dark:bg-primary-900 px-6 py-4">
        <h2 className="text-2xl font-bold font-poppins text-primary-700 dark:text-primary-300">Create New Bingo Game</h2>
        <p className="text-gray-600 dark:text-gray-400">Configure your game settings and add questions</p>
      </CardHeader>

      {/* Wizard Steps */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {renderStepIndicator('settings', 1, 'Game Settings')}
        {renderStepIndicator('questions', 2, 'Questions')}
        {renderStepIndicator('review', 3, 'Review')}
      </div>

      <CardContent className="p-6">
        {/* Step 1: Game Settings */}
        {currentStep === 'settings' && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSettingsSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Game Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a name for your game" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <FormField
                    control={form.control}
                    name="boardSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Board Size</FormLabel>
                        <div className="flex flex-wrap gap-4">
                          {[3, 4, 5, 6].map((size) => (
                            <label key={size} className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                className="sr-only peer"
                                checked={field.value === size}
                                onChange={() => field.onChange(size)}
                              />
                              <div className={`w-16 h-16 flex items-center justify-center rounded-lg border-2 transition-all ${
                                field.value === size
                                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                <span className="text-2xl font-bold">{size}×{size}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <FormField
                    control={form.control}
                    name="cellSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cell Size</FormLabel>
                        <div className="flex flex-wrap gap-4">
                          {[
                            { value: 'small', label: 'S', width: 'w-12 h-12' },
                            { value: 'medium', label: 'M', width: 'w-14 h-14' },
                            { value: 'large', label: 'L', width: 'w-16 h-16' },
                            { value: 'xlarge', label: 'XL', width: 'w-20 h-20' },
                          ].map((size) => (
                            <label key={size.value} className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                className="sr-only peer"
                                checked={field.value === size.value}
                                onChange={() => field.onChange(size.value)}
                              />
                              <div className={`${size.width} flex items-center justify-center rounded-lg border-2 transition-all ${
                                field.value === size.value
                                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                <span className={`font-bold ${
                                  size.value === 'small' ? 'text-sm' :
                                  size.value === 'medium' ? 'text-base' :
                                  size.value === 'large' ? 'text-lg' : 'text-xl'
                                }`}>{size.label}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <FormField
                    control={form.control}
                    name="answerTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="answerTime">Answer Time (seconds)</FormLabel>
                        <div className="mt-1 relative">
                          <input 
                            type="range" 
                            id="answerTime" 
                            min="5" 
                            max="120" 
                            step="5" 
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(parseInt(e.target.value, 10));
                            }}
                          />
                          <div className="absolute -top-8 left-0 right-0 flex justify-between px-2">
                            <span>5s</span>
                            <span>30s</span>
                            <span>60s</span>
                            <span>120s</span>
                          </div>
                          <div className="mt-2 text-center font-bold text-primary-600 dark:text-primary-400">
                            <span>{field.value}</span> seconds
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <FormField
                    control={form.control}
                    name="groupCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Groups</FormLabel>
                        <div className="flex items-center space-x-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => field.value > 1 && field.onChange(field.value - 1)}
                          >
                            -
                          </Button>
                          <div className="w-16 h-16 flex items-center justify-center rounded-md border-2 border-primary-500 bg-primary-50 dark:bg-primary-900 text-2xl font-bold">
                            {field.value}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => field.value < 10 && field.onChange(field.value + 1)}
                          >
                            +
                          </Button>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="mt-8 flex justify-end">
                <Button type="submit">
                  Next: Add Questions
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* Step 2: Questions */}
        {currentStep === 'questions' && gameSettings && (
          <QuestionsForm 
            boardSize={gameSettings.boardSize}
            onBack={() => setCurrentStep('settings')}
            onNext={onQuestionsSubmit}
            initialQuestions={questions}
          />
        )}

        {/* Step 3: Review */}
        {currentStep === 'review' && gameSettings && questions.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Review Your Game</h3>
            
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium mb-2">Game Settings</h4>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Game Name</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{gameSettings.name}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Board Size</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{gameSettings.boardSize}×{gameSettings.boardSize}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Cell Size</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{gameSettings.cellSize}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Answer Time</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{gameSettings.answerTime} seconds</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Number of Groups</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{gameSettings.groupCount}</dd>
                  </div>
                </dl>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium mb-2">Questions ({questions.length})</h4>
                
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {questions.slice(0, 5).map((q, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-2 rounded-md">
                      <div className="text-sm font-medium">{q.question}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{q.answer}</div>
                    </div>
                  ))}
                  {questions.length > 5 && (
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                      +{questions.length - 5} more questions
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-between">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setCurrentStep('questions')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>
              
              <Button
                type="button"
                onClick={handleComplete}
              >
                Create Game
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
