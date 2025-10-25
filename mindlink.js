// backend/assistant.js
import express from 'express';
import fetch from 'node-fetch';
import { PassThrough } from 'stream';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors()); // ✅ Fix CORS issue

// Your short audio sample URL for MindLink's signature voice
const VOICE_SAMPLE_URL = "https://drive.google.com/uc?export=download&id=1DrfRAWLj1ntNCqRmpFQZ3Kt5mM6uxrz3";

// NVIDIA API keys
const LLM_API_KEY = "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";
const TTS_API_KEY = "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";

// Endpoint for frontend to call
app.post('/api/assistant', async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: "No message provided." });

    // --- Step 1: Chat completion ---
    const llmResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LLM_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-8b-instruct",
        messages: [
          { role: "system", content: "You are MindLink, a warm, caring assistant that responds empathetically." },
          ...(context || []),
          { role: "user", content: message }
        ],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
        stream: false // 🔹 changed to false for simplicity; can implement streaming later
      })
    });

    const llmData = await llmResponse.json();
    const fullText = llmData.choices?.[0]?.message?.content || "Sorry, I couldn't understand.";

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
      audioUrl = null;
    }

    // --- Step 3: Send response ---
    res.json({ text: fullText, audio: audioUrl });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MindLink backend running on port ${PORT}`));
