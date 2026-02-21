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
    scores: {
      type: Type.OBJECT,
      properties: {
        rhythm: { type: Type.NUMBER, description: "五七五のリズム、字余り・字足らずの巧さ (0-25)" },
        emotion: { type: Type.NUMBER, description: "季語の適切さ、余韻、読後感 (0-25)" },
        originality: { type: Type.NUMBER, description: "表現の新鮮さ、意外性 (0-25)" },
        harmony: { type: Type.NUMBER, description: "生成された音楽との相性 (0-25)" },
      },
      required: ["rhythm", "emotion", "originality", "harmony"],
    },
    total_score: { type: Type.NUMBER, description: "合計スコア (0-100)" },
    feedback: { type: Type.STRING, description: "ペン芭蕉の講評 (80〜120文字)" },
  },
  required: ["scores", "total_score", "feedback"],
};

export async function POST(request: Request) {
  try {
    const { haiku, music_prompt, season, audioUrl } = await request.json();

    const client = getAiClient();
    
    // Prepare contents array for multimodal input
    const contents: any[] = [
      `あなたは俳句鑑定士であり、伝説のクラブDJ「DJ ペン芭蕉」です。
      以下のユーザーが詠んだリリック（俳句）と、そのリリックから【今まさに生成されたオリジナル・ビート（音楽）】を「実際に聴き比べて」採点とバイブスチェック（講評）を行ってください。

      リリック (俳句): ${haiku}
      季節: ${season}
      生成時のプロンプト意図: ${music_prompt}

      【講評のルール】
      - キャラクター: 「DJ ペン芭蕉」（ペンギンのカリスマDJ）
      - 口調: ヒップホップやクラブカルチャーの用語を交えた、ノリが良くて熱い口調。「〜だぜ」「〜じゃねえか」「バイブス」「ドープ」「フロウ」などの言葉を使うこと。
      - 内容: 必ず【聴こえてきた音色やビート感】（例: キックの重さが〜、和のサンプルがドープで〜）に具体的に触れて、リリック（俳句）の情景とのマッチ度合いを語ること。
      - 文字数: 80〜150文字
      - 末尾に必ず一言のアドバイス（もっとエモくしろ、等）を含める

      【採点基準（各25点、計100点）】
      1. フロウ（Rhythm）: 五七五のリズム、字余り・字足らずのグルーヴ感
      2. エモさ（Emotion）: 季語のハマり具合、余韻、パンチライン
      3. ドープ度（Originality）: 表現の新鮮さ、言葉選びのヤバさ
      4. ビートとのシンクロ（Harmony）: 【添付された実際の音楽】と、リリックの情景・感情のシンクロ度合い（厳しく判定してよい）`
    ];

    // If audio was successfully generated and passed back as a data URL (base64)
    if (audioUrl && audioUrl.startsWith('data:audio/')) {
       // Extract MIME type and base64 string from data URL
       // Format: data:audio/wav;base64,UklGRiQ...
       const matches = audioUrl.match(/^data:(audio\/[a-zA-Z0-9]+);base64,(.+)$/);
       if (matches && matches.length === 3) {
         const mimeType = matches[1];
         const base64Data = matches[2];
         
         console.log(`Scoring with attached audio file (${mimeType})...`);
         contents.push({
           inlineData: {
             data: base64Data,
             mimeType: mimeType
           }
         });
       } else {
         console.log("Audio URL provided but failed to parse base64 for Gemini multimodal input.");
       }
    }

    const response = await client.models.generateContent({
      model: "gemini-2.5-pro",
      contents: contents,
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
  } catch (error) {
    console.error("Scoring error:", error);
    return NextResponse.json({ error: "Failed to score haiku" }, { status: 500 });
  }
}