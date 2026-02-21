import { NextRequest, NextResponse } from "next/server";
import { scoreHaiku } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { haiku, music_prompt } = await req.json();
    if (!haiku || !music_prompt) {
      return NextResponse.json({ error: "Haiku and music prompt are required" }, { status: 400 });
    }

    const score = await scoreHaiku(haiku, music_prompt);
    return NextResponse.json(score);
  } catch (error) {
    console.error("Scoring error:", error);
    return NextResponse.json({ error: "Failed to score haiku" }, { status: 500 });
  }
}
