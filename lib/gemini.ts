// Perplexity AI chat function

const PERPLEXITY_API_KEY = process.env.EXPO_PUBLIC_PERPLEXITY_API_KEY || "YOUR_PERPLEXITY_API_KEY";
const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_SYSTEM_MESSAGE =
  "You are a helpful medical assistant. Only answer questions related to medications, their usage, dosages, side effects, drug interactions, and related medication safety. If a question is not about medication or side effects, politely respond: 'I'm only able to answer questions about medications and their side effects.'";

export async function getPerplexityChatResponse(userMessage: string): Promise<string> {
  const headers = {
    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
    'Content-Type': 'application/json',
  };
  const payload = {
    model: 'sonar-pro',
    messages: [
      { role: 'system', content: PERPLEXITY_SYSTEM_MESSAGE },
      { role: 'user', content: userMessage },
    ],
  };
  try {
    const response = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      return data.choices[0].message.content;
    }
    return "Sorry, I couldn't get a response from Perplexity AI.";
  } catch (error) {
    return "There was an error connecting to the Perplexity AI service.";
  }
}

// Use Perplexity as the default chat function
export async function getGeminiChatResponse(userMessage: string): Promise<string> {
  return getPerplexityChatResponse(userMessage);
}
