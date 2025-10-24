import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ Lyra Backend is running perfectly and connected to NVIDIA TTS!");
});

app.post("/speak", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });

    // Call NVIDIA Magpie Multilingual TTS
    const response = await fetch("https://integrate.api.nvidia.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NVIDIA_TTS_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nvidia/magpie-tts-multilingual",
        input: text,
        voice: "en_us_male", // You can try 'en_us_female' or other voices
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NVIDIA API error:", errorText);
      return res.status(500).json({ error: "Failed to get TTS audio", details: errorText });
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error("Error in /speak route:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
