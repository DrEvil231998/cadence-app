// api/chat.js — Vercel Serverless Function
// Proxies requests to OpenRouter using the free Llama 3.1 8B model
// Set OPENROUTER_API_KEY in your Vercel environment variables

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Pull the API key from environment (never expose this to frontend)
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  const { messages, type } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required.' });
  }

  // System prompt varies by report type
  const systemPrompts = {
    daily: `You are Cadence, an elite personal performance advisor combining McKinsey-level business strategy with executive coaching. The user has submitted their daily performance data. Your job: in under 150 words, deliver ONE sharp, specific insight about today's data — identify the most important pattern, call out what's off-track, and give one concrete action for tomorrow. No fluff. No praise. Be direct.`,

    weekly: `You are Cadence, an elite personal performance advisor. The user wants a weekly performance review. Format your response as a short executive briefing: 3 sections — (1) What moved the needle this week, (2) What is the biggest bottleneck right now, (3) One high-leverage priority for next week. Use bullet points. Be blunt. Under 200 words.`,

    monthly: `You are Cadence, an elite personal performance advisor. The user wants a monthly consulting-style review. Structure it like a McKinsey slide: (1) Headline finding (one sentence), (2) 3 key metrics with trend direction (up/down/flat), (3) Root cause of the biggest gap, (4) Recommended strategic shift for next month. Under 250 words. No warm-up. Lead with the hard truth.`,
  };

  const systemPrompt = systemPrompts[type] || systemPrompts.daily;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://cadence-app.vercel.app',
        'X-Title': 'Cadence Personal OS',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        max_tokens: 400,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `OpenRouter error: ${errText}` });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response generated.';

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('OpenRouter fetch failed:', err);
    return res.status(500).json({ error: 'Failed to reach AI service.' });
  }
}
