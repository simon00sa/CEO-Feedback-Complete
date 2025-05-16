import { OpenAI } from "openai";
import { EdenAI as EdenAIClient } from "edenai";
import { PrismaClient } from "@prisma/client";
import { LRUCache } from "lru-cache";
import { z } from "zod";

// Initialize Prisma client
const prisma = new PrismaClient();

// Define cache options
const cacheOptions = {
  max: 100, // Maximum number of items to store in cache
  ttl: 1000 * 60 * 60, // 1 hour TTL
};

// Define response schemas for validation
const feedbackAnalysisSchema = z.object({
  sentiment: z.string(),
  topics: z.array(z.string()),
  summary: z.string(),
  actionItems: z.array(z.string()),
});

const chatResponseSchema = z.object({
  response: z.string(),
});

class AIImplementation {
  private openai: OpenAI;
  private edenai: typeof EdenAIClient;
  private cache: LRUCache<string, any>;
  private isInitialized: boolean = false;

  constructor() {
    // Initialize cache
    this.cache = new LRUCache(cacheOptions);
    
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
    });
    
    // Initialize EdenAI client
    this.edenai = new EdenAIClient({
      apiKey: process.env.EDENAI_API_KEY || "",
    });
    
    this.isInitialized = true;
  }

  /**
   * Analyzes feedback text to extract sentiment, topics, and action items
   */
  public async analyzeFeedback(feedbackText: string): Promise<{
    sentiment: string;
    topics: string[];
    summary: string;
    actionItems: string[];
  }> {
    try {
      // Check if initialized
      if (!this.isInitialized) {
        throw new Error("AI service not initialized");
      }

      // Generate cache key
      const cacheKey = `feedback_analysis_${Buffer.from(feedbackText).toString('base64')}`;
      
      // Check cache first
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult) {
        console.log("Using cached feedback analysis");
        return cachedResult;
      }

      // Try EdenAI first for sentiment analysis
      let sentiment = "";
      try {
        const edenResponse = await this.edenai.text.sentimentAnalysis({
          providers: ["amazon"],
          text: feedbackText,
          language: "en",
        });
        
        sentiment = edenResponse.amazon.sentiment;
      } catch (error) {
        console.error("EdenAI sentiment analysis failed, falling back to OpenAI", error);
      }

      // Use OpenAI for comprehensive analysis
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant that analyzes feedback. 
            Extract the following from the feedback:
            1. Overall sentiment (positive, negative, or neutral)
            2. Main topics mentioned
            3. A brief summary
            4. Actionable items for improvement
            
            Format your response as JSON with the following structure:
            {
              "sentiment": "positive/negative/neutral",
              "topics": ["topic1", "topic2"],
              "summary": "brief summary",
              "actionItems": ["action1", "action2"]
            }`,
          },
          {
            role: "user",
            content: feedbackText,
          },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      });

      // Parse the response
      const responseContent = completion.choices[0]?.message?.content || "{}";
      let parsedResponse;
      
      try {
        parsedResponse = JSON.parse(responseContent);
        
        // If we got sentiment from EdenAI, use that instead
        if (sentiment) {
          parsedResponse.sentiment = sentiment;
        }
        
        // Validate with zod schema
        const validatedResponse = feedbackAnalysisSchema.parse(parsedResponse);
        
        // Cache the result
        this.cache.set(cacheKey, validatedResponse);
        
        // Store analysis in database for future reference
        await this.storeAnalysisInDb(feedbackText, validatedResponse);
        
        return validatedResponse;
      } catch (parseError) {
        console.error("Failed to parse OpenAI response", parseError);
        throw new Error("Failed to analyze feedback: Invalid response format");
      }
    } catch (error) {
      console.error("Error in analyzeFeedback:", error);
      // Return a fallback response
      return {
        sentiment: "neutral",
        topics: ["unknown"],
        summary: "Could not analyze feedback",
        actionItems: ["Review feedback manually"],
      };
    }
  }

  /**
   * Handles chat interactions with the AI
   */
  public async chat(message: string, history: Array<{ role: string; content: string }> = []): Promise<{ response: string }> {
    try {
      // Check if initialized
      if (!this.isInitialized) {
        throw new Error("AI service not initialized");
      }

      // Generate cache key based on message and history
      const historyString = history.map(h => `${h.role}:${h.content}`).join("|");
      const cacheKey = `chat_${Buffer.from(message + historyString).toString('base64')}`;
      
      // Check cache first
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult) {
        console.log("Using cached chat response");
        return cachedResult;
      }

      // Prepare messages for OpenAI
      const messages = [
        {
          role: "system",
          content: "You are a helpful assistant that provides concise and accurate responses to questions about feedback and organizational improvement.",
        },
        ...history,
        {
          role: "user",
          content: message,
        },
      ];

      // Call OpenAI
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 500,
      });

      // Extract and validate response
      const responseContent = completion.choices[0]?.message?.content || "No response generated";
      const response = { response: responseContent };
      
      // Validate with schema
      const validatedResponse = chatResponseSchema.parse(response);
      
      // Cache the result
      this.cache.set(cacheKey, validatedResponse);
      
      return validatedResponse;
    } catch (error) {
      console.error("Error in chat:", error);
      return { response: "I'm sorry, I encountered an error processing your request. Please try again later." };
    }
  }

  /**
   * Stores analysis results in the database for future reference
   */
  private async storeAnalysisInDb(feedbackText: string, analysis: any): Promise<void> {
    try {
      // Store in database if needed
      // This is a placeholder for actual database storage logic
      await prisma.feedbackAnalysis.create({
        data: {
          feedbackText,
          sentiment: analysis.sentiment,
          topics: analysis.topics,
          summary: analysis.summary,
          actionItems: analysis.actionItems,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      // Log but don't throw - this is a non-critical operation
      console.error("Failed to store analysis in database:", error);
    }
  }

  /**
   * Clears the cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}

// Create singleton instance with proper caching
const aiInstance = new AIImplementation();

// Default export (for chat/route.ts)
export default aiInstance;

// Named export for EdenAI (for analytics/route.ts)
export const EdenAI = {
  analyzeFeedback: aiInstance.analyzeFeedback.bind(aiInstance)
};

// Re-export the class (for backward compatibility)
export const AI = AIImplementation;
