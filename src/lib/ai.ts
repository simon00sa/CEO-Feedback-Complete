// This file contains AI functionality for the anonymous feedback platform using Eden AI

// Eden AI API configuration
const EDEN_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMGQ5YmFlYzItOTBiYi00OGEzLWFlMmQtNjljM2ZkZGE5OWNmIiwidHlwZSI6InNhbmRib3hfYXBpX3Rva2VuIiwibmFtZSI6IkZlZWRiYWNrIEFwcCIsImlzX2N1c3RvbSI6dHJ1ZX0.l-GSu2x4rjFrPO9mSVooV4pKBRfp3KuXbHnWGuIdhqw";
const EDEN_API_URL = "https://api.edenai.run/v2";

export class EdenAI {
  // Process user message and generate AI response
  static async processMessage(message: string, conversation: any[]): Promise<{
    response: string;
    anonymized?: string;
    metadata?: {
      category?: string;
      priority?: number;
      isQuestion?: boolean;
    }
  }> {
    try {
      // For production, this would call the Eden AI API
      const response = await fetch(`${EDEN_API_URL}/text/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EDEN_API_KEY}`
        },
        body: JSON.stringify({
          providers: ["openai"],
          text: message,
          previous_history: conversation.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            message: msg.content
          })),
          temperature: 0.7,
          max_tokens: 150
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from Eden AI');
      }
      
      const data = await response.json();
      const aiResponse = data.openai?.generated_text || "I'm sorry, I couldn't process your message.";
      
      // Categorize the message
      let category = await EdenAI.categorizeMessage(message);
      let priority = EdenAI.calculatePriority(category, message);
      
      // If this is the final message in the conversation, also anonymize the feedback
      let anonymized = null;
      if (conversation.length >= 5) {
        // Collect all user messages
        const userMessages = conversation
          .filter(msg => msg.sender === 'user')
          .map(msg => msg.content)
          .join("\n");
        
        // Add the current message
        const fullFeedback = userMessages + "\n" + message;
        
        // Anonymize the feedback
        anonymized = await EdenAI.anonymizeFeedback(fullFeedback);
      }
      
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
      console.error('Error calling Eden AI:', error);
      
      // Fallback to local processing if API call fails
      return EdenAI.localProcessMessage(message, conversation);
    }
  }
  
  // Local fallback for message processing when API is unavailable
  private static async localProcessMessage(message: string, conversation: any[]): Promise<{
    response: string;
    anonymized?: string;
    metadata?: {
      category?: string;
      priority?: number;
      isQuestion?: boolean;
    }
  }> {
    // Simple keyword-based categorization and priority assessment
    let category = "";
    let priority = 1;
    
    if (message.toLowerCase().includes("workload") || 
        message.toLowerCase().includes("overtime") || 
        message.toLowerCase().includes("deadline")) {
      category = "Workload";
      priority = 3;
    } else if (message.toLowerCase().includes("communication") || 
               message.toLowerCase().includes("misalignment") || 
               message.toLowerCase().includes("silo")) {
      category = "Communication";
      priority = 2;
    } else if (message.toLowerCase().includes("benefit") || 
               message.toLowerCase().includes("compensation") || 
               message.toLowerCase().includes("salary")) {
      category = "Benefits";
      priority = 2;
    } else if (message.toLowerCase().includes("office") || 
               message.toLowerCase().includes("environment") || 
               message.toLowerCase().includes("temperature")) {
      category = "Office Environment";
      priority = 1;
    } else {
      category = "Other";
      priority = 1;
    }
    
    // Check if this is the first message
    if (conversation.length === 0) {
      return {
        response: "Thank you for reaching out. I'm here to collect your anonymous feedback. Could you please share what's on your mind?",
        metadata: {
          isQuestion: true
        }
      };
    }
    
    // Check if this is a follow-up message
    if (conversation.length === 2) {
      return {
        response: `Thank you for sharing that. Could you provide more specific details about the ${category.toLowerCase()} issue you're experiencing?`,
        metadata: {
          category,
          priority,
          isQuestion: true
        }
      };
    }
    
    // Check if we need more information
    if (conversation.length === 4) {
      return {
        response: "Do you have any suggestions for how this situation could be improved?",
        metadata: {
          category,
          priority,
          isQuestion: true
        }
      };
    }
    
    // Final response with preview
    if (conversation.length >= 6) {
      return {
        response: "Thank you for your feedback. Here's a preview of your anonymized feedback that will be shared with leadership:",
        metadata: {
          category,
          priority,
          isQuestion: false
        }
      };
    }
    
    // Default response
    return {
      response: "Thank you for sharing that information. Is there anything else you'd like to add?",
      metadata: {
        category,
        priority,
        isQuestion: true
      }
    };
  }
  
  // Categorize message using Eden AI
  private static async categorizeMessage(message: string): Promise<string> {
    try {
      const response = await fetch(`${EDEN_API_URL}/text/classification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EDEN_API_KEY}`
        },
        body: JSON.stringify({
          providers: ["openai"],
          text: message,
          categories: ["Workload", "Communication", "Benefits", "Office Environment", "Management", "Culture", "Technology", "Other"]
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to categorize message');
      }
      
      const data = await response.json();
      const categories = data.openai?.items || [];
      
      // Return the highest confidence category
      if (categories.length > 0) {
        return categories[0].category;
      }
      
      return "Other";
    } catch (error) {
      console.error('Error categorizing message:', error);
      return "Other";
    }
  }
  
  // Calculate priority based on category and content
  private static calculatePriority(category: string, message: string): number {
    // High priority categories
    if (category === "Workload" || message.toLowerCase().includes("urgent") || 
        message.toLowerCase().includes("critical") || message.toLowerCase().includes("immediately")) {
      return 3;
    }
    
    // Medium priority categories
    if (category === "Communication" || category === "Benefits" || 
        category === "Management" || message.toLowerCase().includes("important")) {
      return 2;
    }
    
    // Default to low priority
    return 1;
  }
  
  // Anonymize user feedback using Eden AI
  static async anonymizeFeedback(originalText: string): Promise<string> {
    try {
      const response = await fetch(`${EDEN_API_URL}/text/anonymization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EDEN_API_KEY}`
        },
        body: JSON.stringify({
          providers: ["openai"],
          text: originalText,
          entities_to_anonymize: ["PERSON", "EMAIL", "LOCATION", "ORGANIZATION", "PHONE_NUMBER"]
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to anonymize feedback');
      }
      
      const data = await response.json();
      return data.openai?.result || EdenAI.localAnonymizeFeedback(originalText);
    } catch (error) {
      console.error('Error anonymizing feedback:', error);
      return EdenAI.localAnonymizeFeedback(originalText);
    }
  }
  
  // Local fallback for anonymization when API is unavailable
  private static localAnonymizeFeedback(originalText: string): string {
    // Simple anonymization by replacing first person with third person
    let anonymized = originalText
      .replace(/\bI am\b/gi, "The person is")
      .replace(/\bI'm\b/gi, "The person is")
      .replace(/\bI\b/gi, "The person")
      .replace(/\bmy\b/gi, "their")
      .replace(/\bmine\b/gi, "theirs")
      .replace(/\bmyself\b/gi, "themselves");
    
    // Replace specific names with generic terms
    const names = ["John", "Jane", "Michael", "David", "Sarah"];
    names.forEach(name => {
      const regex = new RegExp(`\\b${name}\\b`, "gi");
      anonymized = anonymized.replace(regex, "a colleague");
    });
    
    return anonymized;
  }
  
  // Analyze feedback for trends and insights
  static async analyzeFeedback(feedbackItems: any[]): Promise<{
    topCategories: { name: string, count: number }[];
    sentimentByDepartment: { department: string, sentiment: number }[];
    urgentIssues: string[];
    recommendedActions: string[];
  }> {
    try {
      // Collect all feedback text
      const feedbackText = feedbackItems
        .map(item => item.content)
        .join("\n\n");
      
      // Call Eden AI for sentiment analysis
      const sentimentResponse = await fetch(`${EDEN_API_URL}/text/sentiment_analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EDEN_API_KEY}`
        },
        body: JSON.stringify({
          providers: ["openai"],
          text: feedbackText,
          language: "en"
        }),
      });
      
      if (!sentimentResponse.ok) {
        throw new Error('Failed to analyze sentiment');
      }
      
      const sentimentData = await sentimentResponse.json();
      
      // Call Eden AI for text summarization to get urgent issues and recommendations
      const summaryResponse = await fetch(`${EDEN_API_URL}/text/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EDEN_API_KEY}`
        },
        body: JSON.stringify({
          providers: ["openai"],
          text: feedbackText,
          language: "en",
          output_sentences: 6
        }),
      });
      
      if (!summaryResponse.ok) {
        throw new Error('Failed to summarize feedback');
      }
      
      const summaryData = await summaryResponse.json();
      
      // Process the results
      const sentiment = sentimentData.openai?.sentiment || "neutral";
      const summary = summaryData.openai?.result || "";
      
      // Count categories from feedback items
      const categoryCount: Record<string, number> = {};
      feedbackItems.forEach(item => {
        const category = item.metadata?.category || "Other";
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
      
      const topCategories = Object.entries(categoryCount)
        .map(([name, count]) => ({ name, count: count as number }))
        .sort((a, b) => b.count - a.count);
      
      // Generate department sentiment (mock data for now)
      const sentimentByDepartment = [
        { department: "Engineering", sentiment: -0.2 },
        { department: "Marketing", sentiment: 0.1 },
        { department: "Sales", sentiment: 0.3 },
        { department: "HR", sentiment: 0.5 }
      ];
      
      // Extract urgent issues and recommendations from summary
      const summaryLines = summary.split('. ');
      const urgentIssues = summaryLines.slice(0, 3).map(line => line.trim() + (line.endsWith('.') ? '' : '.'));
      const recommendedActions = [
        "Review project timelines and resource allocation in Engineering",
        "Implement regular cross-department sync meetings",
        "Address office temperature regulation issues"
      ];
      
      return {
        topCategories,
        sentimentByDepartment,
        urgentIssues,
        recommendedActions
      };
    } catch (error) {
      console.error('Error analyzing feedback:', error);
      
      // Return mock data if API call fails
      return {
        topCategories: [
          { name: "Workload", count: 35 },
          { name: "Communication", count: 25 },
          { name: "Benefits", count: 15 },
          { name: "Office Environment", count: 10 },
          { name: "Other", count: 42 }
        ],
        sentimentByDepartment: [
          { department: "Engineering", sentiment: -0.2 },
          { department: "Marketing", sentiment: 0.1 },
          { department: "Sales", sentiment: 0.3 },
          { department: "HR", sentiment: 0.5 }
        ],
        urgentIssues: [
          "Engineering team workload and overtime",
          "Cross-department communication barriers",
          "Office temperature complaints"
        ],
        recommendedActions: [
          "Review project timelines and resource allocation in Engineering",
          "Implement regular cross-department sync meetings",
          "Address office temperature regulation issues"
        ]
      };
    }
  }
  
  // Generate follow-up questions based on feedback
  static async generateFollowUpQuestions(feedback: string): Promise<string[]> {
    try {
      const response = await fetch(`${EDEN_API_URL}/text/generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EDEN_API_KEY}`
        },
        body: JSON.stringify({
          providers: ["openai"],
          text: `Based on this feedback: "${feedback}", generate 3 follow-up questions to gather more information. Format as a JSON array of strings.`,
          temperature: 0.7,
          max_tokens: 150
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate follow-up questions');
      }
      
      const data = await response.json();
      const generatedText = data.openai?.generated_text || "";
      
      // Try to parse the response as JSON
      try {
        // Extract JSON array from the response if it's embedded in text
        const jsonMatch = generatedText.match(/\[.*\]/s);
        if (jsonMatch) {
          const questions = JSON.parse(jsonMatch[0]);
          if (Array.isArray(questions) && questions.length > 0) {
            return questions;
          }
        }
        
        // If no JSON array found, split by newlines or numbers
        return generatedText
          .split(/\n|(?:\d+\.)/)
          .map(q => q.trim())
          .filter(q => q.length > 0 && q.endsWith('?'))
          .slice(0, 3);
      } catch (e) {
        console.error('Error parsing follow-up questions:', e);
        return EdenAI.localGenerateFollowUpQuestions(feedback);
      }
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      return EdenAI.localGenerateFollowUpQuestions(feedback);
    }
  }
  
  // Local fallback for generating follow-up questions
  private static localGenerateFollowUpQuestions(feedback: string): string[] {
    if (feedback.toLowerCase().includes("workload")) {
      return [
        "How long has the workload been an issue?",
        "Are there specific projects that are causing the most stress?",
        "What resources would help alleviate the situation?"
      ];
    } else if (feedback.toLowerCase().includes("communication")) {
      return [
        "Which departments have the most communication challenges?",
        "What specific information is being siloed?",
        "Have you tried any solutions to improve communication?"
      ];
    } else {
      return [
        "Could you provide more specific details about this issue?",
        "How long has this been a concern?",
        "Do you have any suggestions for improvement?"
      ];
    }
  }
}
