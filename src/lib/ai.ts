// This file contains AI functionality for the anonymous feedback platform
// Using OpenAI directly for chat and Eden AI for anonymization

import OpenAI from 'openai';

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "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";

// Eden AI API configuration (kept for anonymization)
const EDEN_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMGQ5YmFlYzItOTBiYi00OGEzLWFlMmQtNjljM2ZkZGE5OWNmIiwidHlwZSI6InNhbmRib3hfYXBpX3Rva2VuIiwibmFtZSI6IkZlZWRiYWNrIEFwcCIsImlzX2N1c3RvbSI6dHJ1ZX0.l-GSu2x4rjFrPO9mSVooV4pKBRfp3KuXbHnWGuIdhqw";
const EDEN_API_URL = "https://api.edenai.run/v2";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export class AI {
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
    try {
      console.log("Processing message with OpenAI:", message);
      
      // Format conversation history for OpenAI
      const formattedMessages = conversation.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      // Add the current message
      formattedMessages.push({
        role: 'user',
        content: message
      });
      
      // Call OpenAI API directly
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using GPT-4o mini as recommended
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 250,
      });
      
      const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your message.";
      console.log("OpenAI response:", aiResponse);
      
      // Categorize the message
      let category = await AI.categorizeMessage(message);
      let priority = AI.calculatePriority(category, message);
      
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
        anonymized = await AI.anonymizeFeedback(fullFeedback);
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
      console.error('Error calling OpenAI:', error);
      
      // Fallback to local processing if API call fails
      return AI.localProcessMessage(message, conversation);
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
        response: "Hello! I'm here to help you provide anonymous feedback to leadership. Your identity will be protected through our anonymization process. What would you like to share today?",
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
  
  // Categorize message using OpenAI
  private static async categorizeMessage(message: string): Promise<string> {
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
      
      // Ensure the category is one of our predefined categories
      const validCategories = ["Workload", "Communication", "Benefits", "Office Environment", "Management", "Culture", "Technology", "Other"];
      
      if (validCategories.includes(category)) {
        return category;
      }
      
      return "Other";
    } catch (error) {
      console.error('Error categorizing message with OpenAI:', error);
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
  
  // Anonymize user feedback using Eden AI (keeping this functionality)
  static async anonymizeFeedback(originalText: string): Promise<string> {
    try {
      // First try using OpenAI directly for anonymization
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
      
      if (anonymizedText) {
        return anonymizedText;
      }
      
      // Fallback to Eden AI if OpenAI fails
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
        throw new Error('Failed to anonymize feedback with Eden AI');
      }
      
      const data = await response.json();
      return data.openai?.result || AI.localAnonymizeFeedback(originalText);
    } catch (error) {
      console.error('Error anonymizing feedback:', error);
      return AI.localAnonymizeFeedback(originalText);
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
  
  // Analyze feedback for trends and insights using OpenAI
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
      
      // Use OpenAI to analyze the feedback
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an analytics assistant that analyzes workplace feedback. 
            Analyze the following feedback and provide:
            1. The top 5 categories of issues mentioned
            2. 3 urgent issues that need immediate attention
            3. 3 recommended actions to address the issues
            
            Format your response as JSON with the following structure:
            {
              "topCategories": [{"name": "Category1", "count": 5}, ...],
              "urgentIssues": ["Issue 1", "Issue 2", "Issue 3"],
              "recommendedActions": ["Action 1", "Action 2", "Action 3"]
            }`
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
      let analysis;
      
      try {
        analysis = JSON.parse(analysisText);
      } catch (e) {
        console.error('Error parsing OpenAI analysis response:', e);
        throw new Error('Failed to parse analysis response');
      }
      
      // Count categories from feedback items for backup
      const categoryCount: Record<string, number> = {};
      feedbackItems.forEach(item => {
        const category = item.metadata?.category || "Other";
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
      
      const backupTopCategories = Object.entries(categoryCount)
        .map(([name, count]) => ({ name, count: count as number }))
        .sort((a, b) => b.count - a.count);
      
      // Generate department sentiment (mock data for now)
      const sentimentByDepartment = [
        { department: "Engineering", sentiment: -0.2 },
        { department: "Marketing", sentiment: 0.1 },
        { department: "Sales", sentiment: 0.3 },
        { department: "HR", sentiment: 0.5 }
      ];
      
      return {
        topCategories: analysis.topCategories || backupTopCategories,
        sentimentByDepartment,
        urgentIssues: analysis.urgentIssues || [
          "Engineering team workload and overtime",
          "Cross-department communication barriers",
          "Office temperature complaints"
        ],
        recommendedActions: analysis.recommendedActions || [
          "Review project timelines and resource allocation in Engineering",
          "Implement regular cross-department sync meetings",
          "Address office temperature regulation issues"
        ]
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
  
  // Generate follow-up questions based on feedback using OpenAI
  static async generateFollowUpQuestions(feedback: string): Promise<string[]> {
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
            content: `Based on this feedback: "${feedback}", generate 3 follow-up questions.`
          }
        ],
        temperature: 0.7,
        max_tokens: 150,
        response_format: { type: "json_object" }
      });
      
      const responseText = completion.choices[0]?.message?.content || "{}";
      let response;
      
      try {
        response = JSON.parse(responseText);
        if (Array.isArray(response.questions) && response.questions.length > 0) {
          return response.questions;
        } else if (Array.isArray(response) && response.length > 0) {
          return response;
        }
      } catch (e) {
        console.error('Error parsing follow-up questions response:', e);
      }
      
      return AI.localGenerateFollowUpQuestions(feedback);
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      return AI.localGenerateFollowUpQuestions(feedback);
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
        "What specific information is not being shared effectively?",
        "Have you tried any solutions to improve communication already?"
      ];
    } else if (feedback.toLowerCase().includes("benefit")) {
      return [
        "Which specific benefits are you concerned about?",
        "How do our benefits compare to other companies you're aware of?",
        "What changes would make the biggest positive impact for you?"
      ];
    } else if (feedback.toLowerCase().includes("office") || feedback.toLowerCase().includes("environment")) {
      return [
        "Which specific aspects of the office environment are problematic?",
        "How is this affecting your productivity or wellbeing?",
        "What changes would create a better working environment for you?"
      ];
    } else {
      return [
        "Could you provide more specific details about this issue?",
        "How long has this been a concern for you?",
        "What solutions would you suggest to address this?"
      ];
    }
  }
}

// Export the AI class as the default export
export default AI;

