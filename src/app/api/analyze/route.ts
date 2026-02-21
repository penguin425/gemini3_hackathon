import { GoogleGenAI, Type, Schema } from "@google/genai";
import { NextResponse } from "next/server";

// Fallback to direct AI Studio usage because Vertex AI SDK ADC resolution 
// is fundamentally broken in this specific Next.js/Turbopack local development environment.
let ai: GoogleGenAI;

function getAiClient() {
  if (!ai) {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error("Missing GOOGLE_AI_API_KEY in .env.local");
    }
    // Simple, foolproof initialization that doesn't rely on google-auth-library or local files
    ai = new GoogleGenAI({ 
      apiKey: process.env.GOOGLE_AI_API_KEY
    });
  }
  return ai;
}

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    emotion: { type: Type.STRING, description: "句の主たる情緒（日本語）" },
    season: { type: Type.STRING, description: "季節（春/夏/秋/冬/無季）" },
    colors: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "句から連想される色彩（hex値の配列、最大3色）",
    },
    music_prompt: {
      type: Type.STRING,
      description: "Lyria用の英語音楽プロンプト",
    },
    image_prompt: {
      type: Type.STRING,
      description: "カバーアート(画像)生成用の英語プロンプト。例: 'A beautiful digital illustration of a snowy mountain, nostalgic, vaporwave style, vibrant colors'",
    },
    visual_keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "情景を表すキーワード（英語、3-5語）",
    },
  },
  required: ["emotion", "season", "colors", "music_prompt", "image_prompt", "visual_keywords"],
};

export async function POST(request: Request) {
  try {
    const { haiku } = await request.json();

    if (!haiku || haiku.length > 50) {
      return NextResponse.json({ error: "Invalid haiku" }, { status: 400 });
    }

    const client = getAiClient();
    const response = await client.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `あなたは俳句の専門家であり、音楽プロデューサー兼アートディレクターです。
      以下の俳句を分析し、指定されたJSON形式で回答してください。

      俳句: ${haiku}

      1. "emotion": 句の主たる情緒（日本語）
      2. "season": 季節（春/夏/秋/冬/無季）
      3. "colors": 句から連想される色彩（hex値の配列、最大3色）
      4. "music_prompt": Lyria用の英語音楽プロンプト。**絶対に以下のルールを守ること:**
         - 長文の情景描写は禁止。楽器名と雰囲気のみの短いフレーズにする。
         - 使用可能な楽器は「Japanese Koto」「Taiko drum」「Bamboo flute」「Shamisen」のみ。PianoやGuitarなどは絶対に使わないこと。
         - "pensive" という単語はエラーになるため絶対に使用禁止。"thoughtful", "ambient", "slow", "fast", "energetic", "calm" などを組み合わせること。
         例: "Japanese Koto, slow, calm, ambient" または "Taiko drum, fast, energetic"
      5. "image_prompt": Imagen 3用の英語画像生成プロンプト。俳句の情景を表す、ノスタルジックでエモいカバーアート（ジャケット画像）を生成するための英語の指示。
         例: "A beautiful digital illustration of an old Japanese temple in the rain, lofi aesthetic, highly detailed, vibrant colors."
      6. "visual_keywords": 情景を表すキーワード（英語、3-5語）`,
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    if (!response.text) {
      throw new Error("No response from Gemini");
    }

    const result = JSON.parse(response.text);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Analysis error FULL:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze haiku" }, { status: 500 });
  }
}