import OpenAI from "openai";

// Define provider interface
interface AIProvider {
  id: string;
  name: string;
  type: string;
  apiKey: string;
  apiEndpoint?: string;
  isActive: boolean;
}

// Generate AI questions
export async function generateAIQuestions(
  provider: AIProvider,
  prompt: string,
  count: number = 25
): Promise<Array<{ question: string; answer: string }>> {
  try {
    switch (provider.type) {
      case 'openai':
        return await generateWithOpenAI(provider, prompt, count);
      case 'openrouter':
        return await generateWithOpenRouter(provider, prompt, count);
      case 'deepseek':
        return await generateWithDeepSeek(provider, prompt, count);
      case 'custom':
        return await generateWithCustomProvider(provider, prompt, count);
      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }
  } catch (error) {
    console.error(`Error generating questions with ${provider.name}:`, error);
    throw new Error(`Failed to generate questions: ${error.message}`);
  }
}

// Test provider
export async function testProvider(
  provider: AIProvider,
  prompt: string
): Promise<any> {
  try {
    switch (provider.type) {
      case 'openai':
        const openaiClient = createOpenAIClient(provider);
        const response = await openaiClient.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
          messages: [{ role: "user", content: prompt }],
          max_tokens: 150,
        });
        return { content: response.choices[0].message.content };
        
      case 'openrouter':
        // Test OpenRouter
        const openRouterResponse = await testOpenRouter(provider, prompt);
        return openRouterResponse;
        
      case 'deepseek':
        // Test DeepSeek
        const deepSeekResponse = await testDeepSeek(provider, prompt);
        return deepSeekResponse;
        
      case 'custom':
        // Test custom provider
        return { message: "Custom provider test endpoint" };
        
      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }
  } catch (error) {
    console.error(`Error testing provider ${provider.name}:`, error);
    throw new Error(`Provider test failed: ${error.message}`);
  }
}

// Generate with OpenAI
async function generateWithOpenAI(
  provider: AIProvider,
  prompt: string,
  count: number
): Promise<Array<{ question: string; answer: string }>> {
  const openaiClient = createOpenAIClient(provider);
  
  const systemPrompt = `
    You are a Japanese language teacher tasked with creating Bingo game content.
    Generate ${count} Japanese question-answer pairs suitable for a Bingo game board.
    Each pair should have a Japanese word/phrase as the question and its meaning/definition as the answer.
    Format your response as a valid JSON array of objects, each with 'question' and 'answer' fields.
    Ensure questions are appropriate for the given context: ${prompt}
  `;

  const response = await openaiClient.chat.completions.create({
    model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No content in the response");
  }

  // Parse the response
  try {
    const parsedData = JSON.parse(content);
    if (Array.isArray(parsedData.pairs)) {
      return parsedData.pairs;
    } else if (Array.isArray(parsedData.questions)) {
      return parsedData.questions;
    } else if (Array.isArray(parsedData.data)) {
      return parsedData.data;
    } else {
      // Try to find any array in the response
      const firstArrayKey = Object.keys(parsedData).find(key => Array.isArray(parsedData[key]));
      if (firstArrayKey) {
        return parsedData[firstArrayKey];
      }
      throw new Error("Could not find questions array in response");
    }
  } catch (error) {
    console.error("Error parsing OpenAI response:", error);
    throw new Error("Failed to parse response from AI provider");
  }
}

// Generate with OpenRouter
async function generateWithOpenRouter(
  provider: AIProvider,
  prompt: string,
  count: number
): Promise<Array<{ question: string; answer: string }>> {
  const apiEndpoint = provider.apiEndpoint || 'https://openrouter.ai/api/v1/chat/completions';
  
  const systemPrompt = `
    You are a Japanese language teacher tasked with creating Bingo game content.
    Generate ${count} Japanese question-answer pairs suitable for a Bingo game board.
    Each pair should have a Japanese word/phrase as the question and its meaning/definition as the answer.
    Format your response as a valid JSON array of objects, each with 'question' and 'answer' fields.
    Ensure questions are appropriate for the given context: ${prompt}
  `;

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
      'HTTP-Referer': 'https://bingo-game.com',
      'X-Title': 'Bingo Game'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o', // Using OpenAI's latest model through OpenRouter
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content in the response");
  }

  // Parse the response
  try {
    const parsedData = JSON.parse(content);
    if (Array.isArray(parsedData.pairs)) {
      return parsedData.pairs;
    } else if (Array.isArray(parsedData.questions)) {
      return parsedData.questions;
    } else if (Array.isArray(parsedData.data)) {
      return parsedData.data;
    } else {
      // Try to find any array in the response
      const firstArrayKey = Object.keys(parsedData).find(key => Array.isArray(parsedData[key]));
      if (firstArrayKey) {
        return parsedData[firstArrayKey];
      }
      throw new Error("Could not find questions array in response");
    }
  } catch (error) {
    console.error("Error parsing OpenRouter response:", error);
    throw new Error("Failed to parse response from AI provider");
  }
}

// Generate with DeepSeek
async function generateWithDeepSeek(
  provider: AIProvider,
  prompt: string,
  count: number
): Promise<Array<{ question: string; answer: string }>> {
  const apiEndpoint = provider.apiEndpoint || 'https://api.deepseek.com/v1/chat/completions';
  
  const systemPrompt = `
    You are a Japanese language teacher tasked with creating Bingo game content.
    Generate ${count} Japanese question-answer pairs suitable for a Bingo game board.
    Each pair should have a Japanese word/phrase as the question and its meaning/definition as the answer.
    Format your response as a valid JSON array of objects, each with 'question' and 'answer' fields.
    Ensure questions are appropriate for the given context: ${prompt}
  `;

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content in the response");
  }

  // Parse the response
  try {
    const parsedData = JSON.parse(content);
    if (Array.isArray(parsedData.pairs)) {
      return parsedData.pairs;
    } else if (Array.isArray(parsedData.questions)) {
      return parsedData.questions;
    } else if (Array.isArray(parsedData.data)) {
      return parsedData.data;
    } else {
      // Try to find any array in the response
      const firstArrayKey = Object.keys(parsedData).find(key => Array.isArray(parsedData[key]));
      if (firstArrayKey) {
        return parsedData[firstArrayKey];
      }
      throw new Error("Could not find questions array in response");
    }
  } catch (error) {
    console.error("Error parsing DeepSeek response:", error);
    throw new Error("Failed to parse response from AI provider");
  }
}

// Generate with custom provider
async function generateWithCustomProvider(
  provider: AIProvider,
  prompt: string,
  count: number
): Promise<Array<{ question: string; answer: string }>> {
  if (!provider.apiEndpoint) {
    throw new Error("API endpoint is required for custom providers");
  }

  const response = await fetch(provider.apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify({
      prompt,
      count
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Custom API error: ${response.status} ${errorText}`);
  }

  return await response.json();
}

// Create OpenAI client
function createOpenAIClient(provider: AIProvider): OpenAI {
  return new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.apiEndpoint,
  });
}

// Test OpenRouter
async function testOpenRouter(provider: AIProvider, prompt: string): Promise<any> {
  const apiEndpoint = provider.apiEndpoint || 'https://openrouter.ai/api/v1/chat/completions';
  
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
      'HTTP-Referer': 'https://bingo-game.com',
      'X-Title': 'Bingo Game'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 150
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return { content: data.choices[0]?.message?.content };
}

// Test DeepSeek
async function testDeepSeek(provider: AIProvider, prompt: string): Promise<any> {
  const apiEndpoint = provider.apiEndpoint || 'https://api.deepseek.com/v1/chat/completions';
  
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 150
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return { content: data.choices[0]?.message?.content };
}
