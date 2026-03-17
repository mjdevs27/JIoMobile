// api/check.js — Vercel Serverless Function
// Proxies fraud-check requests to Groq API keeping the key server-side

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var type = req.body && req.body.type ? req.body.type : 'text';
  var text = req.body && req.body.text ? req.body.text : '';

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'No text provided' });
  }

  var apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // Build a concise fraud-detection prompt based on check type
  var prompts = {
    qr: 'You are a fraud detection system. Analyse this UPI ID or QR payment link for fraud risk: "' + text + '". Reply ONLY with a JSON object: {"verdict":"safe|warn|danger","reason":"one sentence explanation"}',
    message: 'You are a fraud detection system. Analyse this SMS or message for fraud/scam indicators: "' + text + '". Reply ONLY with a JSON object: {"verdict":"safe|warn|danger","reason":"one sentence explanation"}',
    link: 'You are a fraud detection system. Analyse this URL for phishing or fraud risk: "' + text + '". Reply ONLY with a JSON object: {"verdict":"safe|warn|danger","reason":"one sentence explanation"}',
    video: 'You are a fraud detection system. The user has uploaded a video and wants to know about deepfake risks. Text context: "' + text + '". Reply ONLY with a JSON object: {"verdict":"warn","reason":"Deepfake video analysis requires specialised tools. Treat video calls from unknown numbers with caution."}'
  };

  var prompt = prompts[type] || prompts.message;

  try {
    var response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 120,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error('Groq API error: ' + response.status);
    }

    var data = await response.json();
    var content = data.choices[0].message.content.trim();

    // Parse the JSON response from Groq
    var result;
    try {
      // Extract JSON from the response (Groq sometimes adds extra text)
      var jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { verdict: 'warn', reason: content };
    } catch (e) {
      result = { verdict: 'warn', reason: content };
    }

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ verdict: 'warn', reason: 'AI check failed. Use manual caution.' });
  }
}
