import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    let {
      userId,
      displayName,
      haiku,
      score,
      scores,
      feedback,
      audioUrl,
      imageUrl,
      emotion,
      season,
      colors,
    } = data;

    const docRef = await addDoc(collection(db, "haikus"), {
      userId,
      displayName: displayName || "名無しのDJ",
      haiku,
      score,
      scores,
      feedback,
      audioUrl,
      imageUrl: imageUrl || "",
      emotion,
      season,
      colors,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ id: docRef.id, publicAudioUrl: audioUrl });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json({ error: "Failed to submit haiku" }, { status: 500 });
  }
}