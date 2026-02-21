import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// Allow up to 30s
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const { image_prompt } = await request.json();

    if (!image_prompt) {
      return NextResponse.json({ error: "Missing image prompt" }, { status: 400 });
    }

    console.log("Generating image via Nanobanana Pro (gemini-3-pro-image-preview) for prompt:", image_prompt);

    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error("Missing GOOGLE_AI_API_KEY in .env.local");
    }

    // Initialize using GoogleGenAI with AI Studio API Key
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GOOGLE_AI_API_KEY 
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: [
        { text: `Create an illustration for a haiku. The art should have a nostalgic and beautiful aesthetic, suitable for an album cover. ${image_prompt}` }
      ],
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: '1:1',
          imageSize: '1K', // Or '2K' if you prefer higher res, but 1K is faster and safer for size limits
        },
      },
    });

    let base64Image = null;
    let mimeType = "image/jpeg";

    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          mimeType = part.inlineData.mimeType || "image/jpeg";
          break;
        }
      }
    }

    if (base64Image) {
       const imageUrl = `data:${mimeType};base64,${base64Image}`;
       return NextResponse.json({ imageUrl });
    }

    throw new Error("No image inlineData returned from Nanobanana Pro");

  } catch (error: any) {
    console.error("Image generation error (Nanobanana Pro):", error.message);
    // Return empty string if generation fails so it doesn't break the app flow
    return NextResponse.json({ imageUrl: "", warning: "Image generation failed" });
  }
}