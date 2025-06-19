import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Store conversation history per user
const conversations = new Map();

// System prompt for Claude
const SYSTEM_PROMPT = `You are a trading assistant integrated with a Slack bot. You have access to live market data and trading tools.

Context: You're helping with SPX options trading, particularly put selling strategies. The user has these tools available:
- Quote tool: Get real-time stock/index prices
- SPX Put Seller (sps): Find put selling opportunities 
- Deep Premium Scanner (sdp): Find high-premium deep OTM puts

Market Context:
- SPX typically around 6000 level
- Focus on put selling strategies (collecting premium)
- Risk management is critical
- 0DTE = same day expiration, 1DTE = next day expiration

Be conversational, insightful, and focus on actionable trading advice. Keep responses concise but informative. When discussing options, always mention current market context and risk considerations.

The user can run commands directly by typing:
- "q SYMBOL" for quotes
- "sps" for put selling opportunities  
- "sdp 0" for 0DTE deep premium scans (today)
- "sdp 1" for 1DTE deep premium scans (next trading day)

You should engage in natural conversation about market conditions, strategy, and analysis.`;

const INTRO_MESSAGE = '📊 TRADING BOT READY\n🎯 Commands: q TSLA | q MSFT | sdp 0 | sdp 1';

export async function claudeChat(message, userId) {
  try {
    // Check if user says "hi" - always return intro
    if (message.toLowerCase().trim() === 'hi') {
      return INTRO_MESSAGE;
    }
    
    // Get or create conversation history for user
    if (!conversations.has(userId)) {
      conversations.set(userId, []);
      // Return intro for new users
      return INTRO_MESSAGE;
    }
    
    const history = conversations.get(userId);
    
    // Add user message to history
    history.push({
      role: 'user',
      content: message
    });
    
    // Keep last 20 messages to manage context length
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
    
    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: history
    });
    
    const assistantMessage = response.content[0].text;
    
    // Add assistant response to history
    history.push({
      role: 'assistant', 
      content: assistantMessage
    });
    
    return assistantMessage;
    
  } catch (error) {
    console.error('Claude API error:', error);
    
    if (error.status === 401) {
      return 'Authentication error: Please check your Claude API key.';
    } else if (error.status === 429) {
      return 'Rate limit exceeded. Please wait a moment and try again.';
    } else {
      return `Error communicating with Claude: ${error.message}`;
    }
  }
}

// Clear conversation history for a user
export function clearHistory(userId) {
  conversations.delete(userId);
  return 'Conversation history cleared.';
}

// Get conversation stats
export function getStats() {
  const totalUsers = conversations.size;
  const totalMessages = Array.from(conversations.values())
    .reduce((total, history) => total + history.length, 0);
  
  return {
    activeUsers: totalUsers,
    totalMessages: totalMessages,
    averageMessagesPerUser: totalUsers > 0 ? Math.round(totalMessages / totalUsers) : 0
  };
}