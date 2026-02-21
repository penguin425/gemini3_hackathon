import { NextRequest, NextResponse } from "next/server";
import { generateMusic } from "@/lib/music";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const audioUrl = await generateMusic(prompt);
    return NextResponse.json({ audioUrl });
  } catch (error) {
    console.error("Music generation error:", error);
    return NextResponse.json({ error: "Failed to generate music" }, { status: 500 });
  }
}
