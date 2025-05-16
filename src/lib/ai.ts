import { OpenAI } from 'openai';
import { EdenAI as EdenAIClient } from 'edenai-js';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import { FeedbackEntry } from '@prisma/client';

interface AnalysisResult {
  sentiment: string;
  topics: string[];
  summary: string;
  actionableInsights: string[];
}

class AIImplementation {
  private openai: OpenAI;
  private edenai: typeof EdenAIClient;
  private redis: Redis;
  private ratelimit: Ratelimit;
  private cache: Map<string, any>;
  private cacheTimeout: number = 1000 * 60 * 60; // 1 hour

  constructor() {
    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize EdenAI
    this.edenai = new EdenAIClient({
      api_key: process.env.EDEN_AI_API_KEY,
    });

    // Initialize Redis if credentials are available
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      // Initialize rate limiting
      this.ratelimit = new Ratelimit({
        redis: this.redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
      });
    }

    // Initialize in-memory cache
    this.cache = new Map();
  }

  private async checkRateLimit(identifier: string): Promise<void> {
    if (this.ratelimit) {
      const result = await this.ratelimit.limit(identifier);
      if (!result.success) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
    }
  }

  private getCacheKey(method: string, params: any): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    // Try in-memory cache first
    const memoryCache = this.cache.get(key);
    if (memoryCache && memoryCache.timestamp > Date.now() - this.cacheTimeout) {
      return memoryCache.data;
    }

    // Try Redis cache if available
    if (this.redis) {
      const redisCache = await this.redis.get(key);
      if (redisCache) {
        // Update in-memory cache
        this.cache.set(key, {
          data: redisCache,
          timestamp: Date.now(),
        });
        return redisCache as T;
      }
    }

    return null;
  }

  private async setCache(key: string, data: any): Promise<void> {
    // Set in-memory cache
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Set Redis cache if available
    if (this.redis) {
      await this.redis.set(key, data, {
        ex: this.cacheTimeout / 1000, // Convert to seconds for Redis
      });
    }
  }

  async analyzeFeedback(feedback: FeedbackEntry[]): Promise<AnalysisResult> {
    try {
      await this.checkRateLimit('analyzeFeedback');

      const cacheKey = this.getCacheKey('analyzeFeedback', feedback);
      const cachedResult = await this.getFromCache<AnalysisResult>(cacheKey);
      if (cachedResult) return cachedResult;

      // Prepare feedback text for analysis
      const feedbackText = feedback
        .map((entry) => `${entry.content} (Rating: ${entry.rating})`)
        .join('\n');

      // First try OpenAI
      try {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Analyze the following feedback entries and provide sentiment, topics, summary, and actionable insights.',
            },
            {
              role: 'user',
              content: feedbackText,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');
        await this.setCache(cacheKey, result);
        return result;
      } catch (error) {
        console.error('OpenAI analysis failed, falling back to EdenAI:', error);
      }

      // Fallback to EdenAI
      try {
        const edenResult = await this.edenai.text.analyze_sentiment({
          text: feedbackText,
          providers: ['amazon'],
        });

        const result: AnalysisResult = {
          sentiment: edenResult.amazon.sentiment,
          topics: [], // EdenAI doesn't provide topics
          summary: edenResult.amazon.summary || '',
          actionableInsights: [], // EdenAI doesn't provide actionable insights
        };

        await this.setCache(cacheKey, result);
        return result;
      } catch (error) {
        console.error('EdenAI analysis failed:', error);
        throw new Error('Failed to analyze feedback with both AI providers');
      }
    } catch (error) {
      console.error('Error in analyzeFeedback:', error);
      throw error;
    }
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      await this.checkRateLimit('generateResponse');

      const cacheKey = this.getCacheKey('generateResponse', prompt);
      const cachedResult = await this.getFromCache<string>(cacheKey);
      if (cachedResult) return cachedResult;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant generating responses to feedback.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const response = completion.choices[0].message.content || '';
      await this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Error in generateResponse:', error);
      throw error;
    }
  }

  async clearCache(): Promise<void> {
    try {
      // Clear in-memory cache
      this.cache.clear();

      // Clear Redis cache if available
      if (this.redis) {
        await this.redis.flushall();
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
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
