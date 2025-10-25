// backend/mindlink.js
import express from "express";
import fetch from "node-fetch";
import { PassThrough } from "stream";

const app = express();
app.use(express.json());

// ✅ Voice sample for your signature voice
const VOICE_SAMPLE_URL = "https://drive.google.com/uc?export=download&id=1DrfRAWLj1ntNCqRmpFQZ3Kt5mM6uxrz3";

// ✅ NVIDIA API Keys
const LLM_API_KEY = process.env.NVIDIA_LLM_KEY || "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";
const TTS_API_KEY = process.env.NVIDIA_TTS_KEY || "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";

// ✅ Test route — shows backend is live
app.get("/", (req, res) => {
  res.send("✅ Mindlink Backend is running perfectly and connected to NVIDIA!");
});

// 🎯 Main endpoint for the AI assistant
app.post("/api/mindlink", async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: "No message provided." });

    // --- STEP 1: Ask NVIDIA LLM for reply ---
    const llmResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-8b-instruct",
        messages: [
          {
            role: "system",
            content:
              "You are Mindlink — a warm, caring, emotionally intelligent voice assistant who speaks gently and encourages learning. Always sound supportive, kind, and a bit magical.",
          },
          ...(context || []),
          { role: "user", content: message },
        ],
        temperature: 0.4,
        top_p: 0.8,
        max_tokens: 800,
      }),
    });

    const data = await llmResponse.json();
    const textResponse = data.choices?.[0]?.message?.content || "I’m here, but something went wrong.";

    // --- STEP 2: Convert LLM text to speech ---
    let audioUrl = null;
    try {
      const ttsResponse = await fetch("https://integrate.api.nvidia.com/v1/tts/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TTS_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "magpie-tts-multilingual",
          voice: VOICE_SAMPLE_URL,
          input: textResponse,
          format: "mp3",
        }),
      });

      const ttsData = await ttsResponse.json();
      audioUrl = ttsData.audio_url || null;
    } catch (err) {
      console.error("TTS Error:", err);
    }

    // --- STEP 3: Send back the final AI + voice response ---
    res.json({
      text: textResponse,
      audio: audioUrl,
    });
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ✅ Run server (Render auto-detects port)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Mindlink backend running on port ${PORT}`));
