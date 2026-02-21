import * as React from "react"
import { collection, query, orderBy, limit, onSnapshot, WhereFilterOp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { HaikuResult } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

export function Leaderboard() {
  const [scores, setScores] = React.useState<HaikuResult[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    // Check if db is initialized (it might be null if env vars are missing and we didn't handle it well,
    // but our lib/firebase.ts handles it gracefully).

    if (!db) {
        console.warn("Firestore not available");
        setLoading(false);
        return;
    }

    try {
        const q = query(
            collection(db, "haikus"),
            orderBy("score", "desc"),
            orderBy("createdAt", "desc"),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const results: HaikuResult[] = [];
            snapshot.forEach((doc) => {
                results.push({ id: doc.id, ...doc.data() } as HaikuResult);
            });
            setScores(results);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching leaderboard:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    } catch (e) {
        console.error("Firestore query error:", e);
        setLoading(false);
    }
  }, [])

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">読み込み中...</div>
  }

  if (scores.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">まだ投稿がありません。</div>
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-card/20 backdrop-blur-sm border-primary/20">
      <CardHeader>
        <CardTitle className="text-xl text-center">🏆 名人番付 (Top 10)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] w-full px-4">
            <ul className="divide-y divide-border">
                {scores.map((score, index) => (
                    <li key={score.id} className="py-3 flex justify-between items-center hover:bg-white/5 transition-colors px-2 rounded">
                        <div className="flex items-center gap-3">
                            <span className={`
                                font-bold w-6 text-center
                                ${index === 0 ? "text-yellow-400 text-lg" : ""}
                                ${index === 1 ? "text-gray-300" : ""}
                                ${index === 2 ? "text-amber-600" : ""}
                                ${index > 2 ? "text-muted-foreground" : ""}
                            `}>
                                {index + 1}
                            </span>
                            <div className="flex flex-col">
                                <span className="font-serif text-sm truncate w-32">{score.haiku}</span>
                                <span className="text-xs text-muted-foreground">{score.displayName || "詠み人知らず"}</span>
                            </div>
                        </div>
                        <div className="font-mono font-bold text-primary">
                            {score.score}点
                        </div>
                    </li>
                ))}
            </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
