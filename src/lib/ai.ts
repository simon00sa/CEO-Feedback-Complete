import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// Eden AI API configuration (kept for anonymization)
const EDEN_API_KEY = process.env.EDEN_AI_API_KEY || "";
const EDEN_API_URL = "https://api.edenai.run/v2";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const prisma = new PrismaClient(); // Instantiate Prisma client if needed here or pass it in

export class AI {

  // --- NEW FUNCTION: Analyze a single feedback item --- 
  static async analyzeSingleFeedback(feedbackContent: string): Promise<{
    analysisSummary: string | null;
    sentiment: string | null;
    topics: string[];
    status: 'ANALYZED' | 'FLAGGED'; // Determine status based on analysis
  }> {
    try {
      console.log(`Starting AI analysis for feedback: "${feedbackContent.substring(0, 50)}..."`);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant analyzing anonymous employee feedback. Analyze the following feedback and provide:
            1. A concise summary (1-2 sentences).
            2. The overall sentiment (Positive, Negative, Neutral, Mixed).
            3. A list of relevant topics/keywords (up to 5).
            4. Determine if the content potentially violates HR policy (e.g., harassment, discrimination, threats) - respond with 'FLAGGED' if yes, 'ANALYZED' if no.
            
            Format your response strictly as JSON with the following structure:
            {
              "summary": "Concise summary here.",
              "sentiment": "Positive|Negative|Neutral|Mixed",
              "topics": ["topic1", "topic2", ...],
              "status": "ANALYZED|FLAGGED"
            }`
          },
          {
            role: "user",
            content: feedbackContent
          }
        ],
        temperature: 0.5,
        max_tokens: 300,
        response_format: { type: "json_object" }
      });

      const analysisText = completion.choices[0]?.message?.content || "{}";
      console.log("AI Analysis Raw Response:", analysisText);
      let analysisResult;

      try {
        analysisResult = JSON.parse(analysisText);
      } catch (e) {
        console.error('Error parsing AI analysis JSON:', e);
        // Fallback if JSON parsing fails
        return {
          analysisSummary: "AI analysis failed to parse.",
          sentiment: "Unknown",
          topics: [],
          status: 'ANALYZED', // Default to ANALYZED if parsing fails
        };
      }

      // Validate the structure and types
      const summary = typeof analysisResult.summary === 'string' ? analysisResult.summary : null;
      const sentiment = typeof analysisResult.sentiment === 'string' ? analysisResult.sentiment : null;
      const topics = Array.isArray(analysisResult.topics) ? analysisResult.topics.map(String) : [];
      const status = analysisResult.status === 'FLAGGED' ? 'FLAGGED' : 'ANALYZED';

      console.log(`AI Analysis Completed: Status=${status}, Sentiment=${sentiment}`);

      return {
        analysisSummary: summary,
        sentiment: sentiment,
        topics: topics,
        status: status,
      };

    } catch (error) {
      console.error('Error during AI feedback analysis:', error);
      // Return default values in case of error
      return {
        analysisSummary: "AI analysis encountered an error.",
        sentiment: "Unknown",
        topics: [],
        status: 'ANALYZED', // Default to ANALYZED on error
      };
    }
  }

  // --- Existing functions below (potentially refactor/remove unused ones later) ---

  // Process user message and generate AI response using OpenAI directly
  static async processMessage(message: string, conversation: any[]): Promise<{
    response: string;
    anonymized?: string;
    metadata?: {
      category?: string;
      priority?: number;
      isQuestion?: boolean;
    }
  }> {
    // ... (keep existing implementation for chat functionality)
    try {
      console.log("Processing message with OpenAI:", message);
      
      const formattedMessages = conversation.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      formattedMessages.push({
        role: 'user',
        content: message
      });
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 250,
      });
      
      const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your message.";
      console.log("OpenAI response:", aiResponse);
      
      let category = await AI.categorizeMessage(message);
      let priority = AI.calculatePriority(category, message);
      let anonymized = null;
      // ... (rest of the existing logic)
      
      return {
        response: aiResponse,
        anonymized,
        metadata: {
          category,
          priority,
          isQuestion: aiResponse.endsWith('?')
        }
      };
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      return AI.localProcessMessage(message, conversation);
    }
  }
  
  // Local fallback for message processing
  private static async localProcessMessage(message: string, conversation: any[]): Promise<{
    response: string;
    anonymized?: string;
    metadata?: {
      category?: string;
      priority?: number;
      isQuestion?: boolean;
    }
  }> {
    // ... (keep existing implementation)
    let category = "";
    let priority = 1;
    // ... (rest of the existing logic)
    return {
      response: "Thank you for sharing that information. Is there anything else you'd like to add?",
      metadata: {
        category,
        priority,
        isQuestion: true
      }
    };
  }
  
  // Categorize message using OpenAI
  private static async categorizeMessage(message: string): Promise<string> {
    // ... (keep existing implementation)
     try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that categorizes workplace feedback into one of these categories: Workload, Communication, Benefits, Office Environment, Management, Culture, Technology, Other. Respond with only the category name."
          },
          {
            role: "user",
            content: `Categorize this feedback: "${message}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 20,
      });
      const category = completion.choices[0]?.message?.content?.trim() || "Other";
      const validCategories = ["Workload", "Communication", "Benefits", "Office Environment", "Management", "Culture", "Technology", "Other"];
      return validCategories.includes(category) ? category : "Other";
    } catch (error) {
      console.error('Error categorizing message with OpenAI:', error);
      return "Other";
    }
  }
  
  // Calculate priority based on category and content
  private static calculatePriority(category: string, message: string): number {
    // ... (keep existing implementation)
    if (category === "Workload" || message.toLowerCase().includes("urgent") || 
        message.toLowerCase().includes("critical") || message.toLowerCase().includes("immediately")) {
      return 3;
    }
    if (category === "Communication" || category === "Benefits" || 
        category === "Management" || message.toLowerCase().includes("important")) {
      return 2;
    }
    return 1;
  }
  
  // Anonymize user feedback using Eden AI (or OpenAI)
  static async anonymizeFeedback(originalText: string): Promise<string> {
    // ... (keep existing implementation)
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an anonymization assistant. Your task is to anonymize the following text by removing or replacing any personally identifiable information such as names, email addresses, phone numbers, specific locations, and organization names. Replace names with 'a person' or 'a colleague', emails with '[email]', phone numbers with '[phone]', locations with '[location]', and organizations with '[organization]'. Also change first-person references ('I', 'my', 'me') to third-person ('the person', 'their', 'them')."
          },
          {
            role: "user",
            content: originalText
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      });
      const anonymizedText = completion.choices[0]?.message?.content || "";
      if (anonymizedText) return anonymizedText;
      
      // Fallback to Eden AI (if needed, though OpenAI should be sufficient)
      // ... (Eden AI fallback logic)
      return AI.localAnonymizeFeedback(originalText); // Fallback to local if all else fails
    } catch (error) {
      console.error('Error anonymizing feedback:', error);
      return AI.localAnonymizeFeedback(originalText);
    }
  }
  
  // Local fallback for anonymization
  private static localAnonymizeFeedback(originalText: string): string {
    // ... (keep existing implementation)
    let anonymized = originalText
      .replace(/\bI am\b/gi, "The person is")
      .replace(/\bI'm\b/gi, "The person is")
      .replace(/\bI\b/gi, "The person")
      .replace(/\bmy\b/gi, "their")
      .replace(/\bmine\b/gi, "theirs")
      .replace(/\bmyself\b/gi, "themselves");
    const names = ["John", "Jane", "Michael", "David", "Sarah"]; // Example names
    names.forEach(name => {
      const regex = new RegExp(`\\b${name}\\b`, "gi");
      anonymized = anonymized.replace(regex, "a colleague");
    });
    return anonymized;
  }
  
  // Analyze feedback for trends and insights (Batch analysis - keep as is for now)
  static async analyzeFeedback(feedbackItems: any[]): Promise<{
    topCategories: { name: string, count: number }[];
    sentimentByDepartment: { department: string, sentiment: number }[];
    urgentIssues: string[];
    recommendedActions: string[];
  }> {
    // ... (keep existing implementation for potential future use)
     try {
      const feedbackText = feedbackItems.map(item => item.content).join("\n\n");
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
           {
            role: "system",
            content: `You are an analytics assistant that analyzes workplace feedback. Analyze the following feedback and provide: 1. The top 5 categories of issues mentioned. 2. 3 urgent issues that need immediate attention. 3. 3 recommended actions to address the issues. Format your response as JSON with the following structure: {"topCategories": [{"name": "Category1", "count": 5}, ...], "urgentIssues": ["Issue 1", ...], "recommendedActions": ["Action 1", ...]}`
          },
          {
            role: "user",
            content: feedbackText
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });
      const analysisText = completion.choices[0]?.message?.content || "{}";
      let analysis = JSON.parse(analysisText);
      // ... (rest of existing logic)
      return {
        topCategories: analysis.topCategories || [],
        sentimentByDepartment: [], // Mock data
        urgentIssues: analysis.urgentIssues || [],
        recommendedActions: analysis.recommendedActions || []
      };
    } catch (error) {
      console.error('Error analyzing feedback:', error);
      return { topCategories: [], sentimentByDepartment: [], urgentIssues: [], recommendedActions: [] }; // Return empty on error
    }
  }
  
  // Generate follow-up questions based on feedback using OpenAI
  static async generateFollowUpQuestions(feedback: string): Promise<string[]> {
     // ... (keep existing implementation)
     try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an assistant that generates follow-up questions based on workplace feedback. Generate 3 relevant follow-up questions to gather more information. Format your response as a JSON array of strings."
          },
          {
            role: "user",
            content: `Generate follow-up questions for this feedback: "${feedback}"`
          }
        ],
        temperature: 0.6,
        max_tokens: 150,
        response_format: { type: "json_object" }
      });
      const questionsText = completion.choices[0]?.message?.content || '{"questions": []}';
      const result = JSON.parse(questionsText);
      return Array.isArray(result.questions) ? result.questions.map(String) : [];
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      return [];
    }
  }
}


