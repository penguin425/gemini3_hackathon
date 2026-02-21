import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc } from "firebase/firestore";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. Check simple password protection
    const { password } = await request.json();
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    
    if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch all documents in haikus collection
    const haikusCol = collection(db, "haikus");
    const snapshot = await getDocs(haikusCol);

    // 3. Delete all documents
    const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    return NextResponse.json({ success: true, deletedCount: snapshot.docs.length });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json({ error: "Failed to reset ranking" }, { status: 500 });
  }
}