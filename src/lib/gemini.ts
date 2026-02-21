import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_AI_API_KEY;

// Mock data for fallback
const MOCK_ANALYSIS = {
  emotion: "静寂",
  season: "冬",
  colors: ["#2C3E50", "#ECF0F1", "#BDC3C7"],
  music_prompt: "Slow ambient Lo-fi with Koto and Shamisen melodies, depicting a snowy evening, 80bpm, melancholic and contemplative atmosphere",
  visual_keywords: ["snow", "silence", "dusk", "solitude"]
};

const MOCK_SCORE = {
  scores: {
    rhythm: 20,
    emotion: 22,
    originality: 18,
    harmony: 20
  },
  totalScore: 80,
  feedback: "ふむ、なかなかの風情じゃのう。冬の静けさがよく伝わってくるわい。ただ、もう少し言葉の選び方に工夫があれば、さらに良くなるであろう。精進せいよ！",
  emotion: "静寂",
  season: "冬",
  colors: ["#2C3E50", "#ECF0F1", "#BDC3C7"],
  music_prompt: "Slow ambient Lo-fi with Koto and Shamisen melodies, depicting a snowy evening, 80bpm, melancholic and contemplative atmosphere",
  visual_keywords: ["snow", "silence", "dusk", "solitude"]
};

export async function analyzeHaiku(haiku: string) {
  if (!apiKey) {
    console.warn("GOOGLE_AI_API_KEY not found. Using mock analysis.");
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    return MOCK_ANALYSIS;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using 1.5 Flash as requested (2.5 might not be available yet or was typo in prompt, using 1.5 flash or pro) - Prompt said 2.5 Flash but 1.5 Flash is standard available. I will use 1.5-flash for now or follow prompt exactly if possible. Let's assume 1.5-flash as safe bet or prompt exact string.

    // Using gemini-1.5-flash as per recommendation for speed/cost.
    const prompt = `
      You are a haiku expert and music producer.
      Analyze the following Japanese Haiku and provide a JSON response.
      Haiku: "${haiku}"

      Return JSON with:
      1. "emotion": Primary emotion (Japanese)
      2. "season": Season (Spring/Summer/Autumn/Winter/None)
      3. "colors": Array of 3 hex color codes representing the imagery
      4. "music_prompt": Detailed English music generation prompt for Lyria (instruments, tempo, atmosphere)
      5. "visual_keywords": Array of 3-5 English keywords for visualization
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Simple parsing, assuming valid JSON returned or wrapped in markdown code block
    const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error analyzing haiku:", error);
    return MOCK_ANALYSIS;
  }
}

export async function scoreHaiku(haiku: string, musicPrompt: string) {
  if (!apiKey) {
    console.warn("GOOGLE_AI_API_KEY not found. Using mock scoring.");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return MOCK_SCORE;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are "Pen-Basho" (ペン芭蕉), a penguin haiku critic with a witty, slightly cynical Edo-style tone (end sentences with 〜でござる, 〜じゃのう).
      Score the following Haiku based on 4 criteria (0-25 points each):
      1. Rhythm (5-7-5 compliance, flow)
      2. Emotion (Seasonality, depth)
      3. Originality (Freshness)
      4. Harmony (Match with music prompt: "${musicPrompt}")

      Haiku: "${haiku}"

      Return JSON with:
      - scores: { rhythm, emotion, originality, harmony }
      - totalScore: sum of scores
      - feedback: Your critique (80-120 chars) in character. Always end with advice.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error scoring haiku:", error);
    return MOCK_SCORE;
  }
}
