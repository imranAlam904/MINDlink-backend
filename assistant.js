// backend/assistant.js
import express from 'express';
import fetch from 'node-fetch';
import { PassThrough } from 'stream';
const app = express();
app.use(express.json());

// Your short audio sample URL for Lyra's signature voice
const VOICE_SAMPLE_URL = "https://drive.google.com/uc?export=download&id=1DrfRAWLj1ntNCqRmpFQZ3Kt5mM6uxrz3";

// NVIDIA API keys
const LLM_API_KEY = "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";
const TTS_API_KEY = "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";

// Endpoint for your frontend to call
app.post('/api/assistant', async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: "No message provided." });

    // --- Step 1: Stream chat completion ---
    const llmResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LLM_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-8b-instruct",
        messages: [
          { role: "system", content: "You are Lyra, a warm, caring assistant that responds empathetically." },
          ...(context || []),
          { role: "user", content: message }
        ],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
        stream: true
      })
    });

    // Streaming text chunks
    const reader = llmResponse.body.getReader();
    const stream = new PassThrough();
    res.setHeader('Content-Type', 'application/json');

    let fullText = "";
    stream.write('{"text": "');
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkText = new TextDecoder("utf-8").decode(value);
      fullText += chunkText;
      stream.write(chunkText.replace(/"/g, '\\"')); // escape quotes
      stream.write('');
    }
    stream.write('", "audio": "processing"}'); // temporary placeholder for audio
    stream.end();

    // --- Step 2: Generate TTS audio ---
    let audioUrl = null;
    try {
      const ttsResponse = await fetch("https://integrate.api.nvidia.com/v1/tts/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TTS_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          voice: VOICE_SAMPLE_URL,
          input: fullText,
          model: "magpie-tts-multilingual",
          format: "mp3"
        })
      });

      const ttsData = await ttsResponse.json();
      audioUrl = ttsData.audio_url || null;

    } catch (err) {
      console.error("TTS failed:", err);
      audioUrl = null; // fallback if TTS fails
    }

    // --- Step 3: Send final JSON response with audio URL ---
    res.end(JSON.stringify({
      text: fullText,
      audio: audioUrl
    }));

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// For Base44, listening may not be needed; adjust if platform auto-handles
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Assistant backend running on port ${PORT}`));
