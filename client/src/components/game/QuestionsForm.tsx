import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface QuestionsFormProps {
  boardSize: number;
  initialQuestions?: Array<{ question: string; answer: string }>;
  onBack: () => void;
  onNext: (questions: Array<{ question: string; answer: string }>) => void;
}

export default function QuestionsForm({ boardSize, initialQuestions = [], onBack, onNext }: QuestionsFormProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [questions, setQuestions] = useState<Array<{ question: string; answer: string }>>(initialQuestions);
  const [aiPrompt, setAiPrompt] = useState('');
  const { toast } = useToast();

  // Ensure we have at least enough empty slots for the board
  useEffect(() => {
    const requiredSlots = boardSize * boardSize;
    if (questions.length < requiredSlots) {
      const newQuestions = [...questions];
      for (let i = questions.length; i < requiredSlots; i++) {
        newQuestions.push({ question: '', answer: '' });
      }
      setQuestions(newQuestions);
    }
  }, [boardSize, questions.length]);

  // Query API providers
  const { data: providers } = useQuery<{ id: string; name: string; isActive: boolean }[]>({
    queryKey: ['/api/admin/providers'],
    enabled: activeTab === 'ai'
  });

  // Function to handle question input changes
  const handleQuestionChange = (index: number, field: 'question' | 'answer', value: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index][field] = value;
    setQuestions(updatedQuestions);
  };

  // Function to add more question slots
  const addMoreQuestions = () => {
    setQuestions([...questions, { question: '', answer: '' }]);
  };

  // AI generate questions mutation
  const generateQuestionsMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest('POST', '/api/game/generate-questions', {
        prompt,
        count: boardSize * boardSize
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        toast({
          title: "Questions generated successfully",
          description: `Generated ${data.questions.length} questions.`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to generate questions",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handler for generating questions
  const handleGenerateQuestions = () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Prompt is required",
        description: "Please enter a prompt to generate questions.",
        variant: "destructive"
      });
      return;
    }
    
    generateQuestionsMutation.mutate(aiPrompt);
  };

  // Check if we have enough valid questions
  const validateQuestions = () => {
    const requiredQuestions = boardSize * boardSize;
    const validQuestions = questions.filter(q => q.question.trim() && q.answer.trim());
    
    if (validQuestions.length < requiredQuestions) {
      toast({
        title: "Not enough questions",
        description: `You need at least ${requiredQuestions} valid question-answer pairs for a ${boardSize}×${boardSize} board.`,
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  // Handler for next button
  const handleNext = () => {
    if (validateQuestions()) {
      // Filter out empty questions
      const validQuestions = questions.filter(q => q.question.trim() && q.answer.trim());
      onNext(validQuestions);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Add Question-Answer Pairs</h3>
        <p className="text-gray-600 dark:text-gray-400">Choose how you want to add your questions</p>
        
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as 'manual' | 'ai')}
          className="mt-4"
        >
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="ai">AI-Generated</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="mt-4">
            <div className="border dark:border-gray-700 rounded-lg p-4 mb-6">
              <h4 className="font-medium mb-2">Enter Question-Answer Pairs Manually</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                You need at least {boardSize * boardSize} pairs for a {boardSize}×{boardSize} board
              </p>
              
              <div className="space-y-4">
                {questions.map((q, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      placeholder="Question in Japanese"
                      value={q.question}
                      onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                    />
                    <Input
                      placeholder="Answer (Japanese or Vietnamese)"
                      value={q.answer}
                      onChange={(e) => handleQuestionChange(index, 'answer', e.target.value)}
                    />
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  onClick={addMoreQuestions} 
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add More Question-Answer Pairs
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="ai" className="mt-4">
            <div className="border dark:border-gray-700 rounded-lg p-4 mb-6">
              <h4 className="font-medium mb-2">Generate Questions using AI</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enter a prompt to generate question-answer pairs
              </p>
              
              <div className="mb-4">
                <Textarea
                  placeholder="e.g. 'Tạo bingo board với các từ hiragana ứng với trình độ N5'"
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Active API Provider
                </label>
                <Select disabled={!providers || providers.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers?.map(provider => (
                      <SelectItem 
                        key={provider.id} 
                        value={provider.id}
                      >
                        {provider.name}{provider.isActive ? ' (Active)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!providers || providers.length === 0 ? (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    No API providers available. An admin needs to configure them.
                  </p>
                ) : null}
              </div>
              
              <Button 
                onClick={handleGenerateQuestions}
                disabled={generateQuestionsMutation.isPending || !aiPrompt.trim()}
              >
                {generateQuestionsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Questions
                  </>
                )}
              </Button>
            </div>
            
            {/* Display the generated questions if any */}
            {questions.length > 0 && (
              <div className="border dark:border-gray-700 rounded-lg p-4 mb-6">
                <h4 className="font-medium mb-2">Generated Questions</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Review and edit the generated questions before proceeding
                </p>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {questions.map((q, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        placeholder="Question in Japanese"
                        value={q.question}
                        onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                      />
                      <Input
                        placeholder="Answer (Japanese or Vietnamese)"
                        value={q.answer}
                        onChange={(e) => handleQuestionChange(index, 'answer', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      <div className="mt-8 flex justify-between">
        <Button 
          variant="outline" 
          onClick={onBack}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Button>
        
        <Button 
          onClick={handleNext}
        >
          Next: Review Game
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
