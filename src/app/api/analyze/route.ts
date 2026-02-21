import { NextRequest, NextResponse } from "next/server";
import { analyzeHaiku } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { haiku } = await req.json();
    if (!haiku) {
      return NextResponse.json({ error: "Haiku is required" }, { status: 400 });
    }

    const analysis = await analyzeHaiku(haiku);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: "Failed to analyze haiku" }, { status: 500 });
  }
}
