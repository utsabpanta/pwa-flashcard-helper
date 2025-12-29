import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { Flashcard } from "../models/flashCard";

export type AIProvider = 'gemini' | 'claude';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
}

const PROMPT = `
  You are a sophisticated study assistant. 
  Analyze the following text and extract comprehensive flashcards (Question and Answer pairs).
  Focus on key definitions, complex relationships, and critical facts that are essential for deep learning.
  
  Return the output ONLY as a valid JSON array of objects with "question" and "answer" keys. 
  Do not include any explanation or markdown formatting outside the JSON.
`;

export const generateFlashcardsWithAI = async (text: string, config: AIConfig): Promise<Omit<Flashcard, 'id'>[]> => {
  if (!config.apiKey) {
    throw new Error("API Key is missing");
  }

  if (config.provider === 'claude') {
    return generateWithClaude(text, config.apiKey);
  } else {
    return generateWithGemini(text, config.apiKey);
  }
};

const generateWithGemini = async (text: string, apiKey: string): Promise<Omit<Flashcard, 'id'>[]> => {
  const genAI = new GoogleGenerativeAI(apiKey);
  // Default to preview, fallback handled inside if needed, but keeping it simple for now
  // Reverting to the logic that handles the 404 fallback manually if we wanted, 
  // but for now let's stick to the robust logic we built.
  
  let model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

  const fullPrompt = `${PROMPT}\n\nText:\n${text.substring(0, 500000)}`;

  try {
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const textResponse = response.text();
    return parseResponse(textResponse);
  } catch (error: any) {
    if (error.message && (error.message.includes("404") || error.message.includes("not found"))) {
      console.warn("Gemini 3 Pro not found, falling back to Gemini 1.5 Pro");
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await fallbackModel.generateContent(fullPrompt);
      const response = await result.response;
      return parseResponse(response.text());
    }
    console.error("Gemini Generation failed:", error);
    throw error;
  }
};

const generateWithClaude = async (text: string, apiKey: string): Promise<Omit<Flashcard, 'id'>[]> => {
  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Required for client-side usage
  });

  try {
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: [
        { role: "user", content: `${PROMPT}\n\nText:\n${text.substring(0, 100000)}` } // Claude limit is roughly 200k tokens, keep safe
      ]
    });

    const textResponse = message.content[0].type === 'text' ? message.content[0].text : '';
    return parseResponse(textResponse);
  } catch (error) {
    console.error("Claude Generation failed:", error);
    throw error;
  }
};

const parseResponse = (textResponse: string): Omit<Flashcard, 'id'>[] => {
  try {
    // Clean up markdown formatting if present
    const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Failed to parse AI response:", textResponse);
    throw new Error("Failed to parse AI response as JSON");
  }
}
