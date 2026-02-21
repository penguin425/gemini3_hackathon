import { NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";

// Allow this API route to run for up to 60 seconds (Lyria generation takes ~24s)
export const maxDuration = 60;

// Fallback music mapping based on season
const FALLBACK_MUSIC: Record<string, string> = {
  "春": "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
  "夏": "https://cdn.pixabay.com/audio/2023/04/28/audio_2ba7d48348.mp3",
  "秋": "https://cdn.pixabay.com/audio/2024/02/21/audio_145b23d90f.mp3",
  "冬": "https://cdn.pixabay.com/audio/2022/10/24/audio_97637cc9da.mp3",
  "無季": "https://cdn.pixabay.com/audio/2024/01/17/audio_efcfdbf22c.mp3",
};

export async function POST(request: Request) {
  let requestedSeason = "無季";
  try {
    const body = await request.json();
    const music_prompt = body.music_prompt;
    requestedSeason = body.season || "無季";

    console.log("Generating music via Lyria (lyria-002) for prompt:", music_prompt);
    
    // We must use GoogleAuth to get a valid OAuth token for the REST API
    const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined
    });
    
    const client = await auth.getClient() as any;
    
    // Explicitly call getAccessToken because getRequestHeaders doesn't reliably append it 
    // depending on the type of AuthClient returned by google-auth-library.
    let token = null;
    if (typeof client.getAccessToken === 'function') {
        const tokenResponse = await client.getAccessToken();
        token = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse.token;
    } else {
        const headers = await client.getRequestHeaders();
        token = headers['Authorization'] ? headers['Authorization'].replace('Bearer ', '') : null;
    }

    if (!token) {
       throw new Error("Failed to retrieve access token");
    }

    let projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) {
       projectId = await auth.getProjectId() || "kaoru";
    }
    
    // music-bison is generally available in us-central1
    const location = "us-central1"; 
    
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/lyria-002:predict`;

    // Retry logic parameters
    const maxRetries = 3;
    let lyriaResponse = null;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      lyriaResponse = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: `${music_prompt}`
            }
          ],
          parameters: {
            sampleCount: 1,
            durationSeconds: 15
          }
        })
      });

      if (lyriaResponse.ok) {
        break; // Success, exit retry loop
      }

      const errText = await lyriaResponse.text();
      console.error(`Lyria API Error (Attempt ${retryCount + 1}):`, lyriaResponse.status, errText);

      // Only retry on 429 (Resource Exhausted) or 5xx server errors
      if (lyriaResponse.status === 429 || lyriaResponse.status >= 500) {
        if (retryCount === maxRetries) {
           throw new Error(`Lyria API failed after ${maxRetries} retries: ${lyriaResponse.status}`);
        }
        
        // Exponential backoff: 2s, 4s, 8s...
        const delayMs = Math.pow(2, retryCount + 1) * 1000;
        console.log(`Retrying Lyria in ${delayMs / 1000} seconds...`);
        await new Promise(res => setTimeout(res, delayMs));
        retryCount++;
      } else {
        // Stop retrying for client errors like 400 Bad Request (Recitation Check) or 403 Forbidden
        throw new Error(`Lyria API failed with non-retryable error: ${lyriaResponse.status} - ${errText}`);
      }
    }

    // Safety check just in case it breaks out of the loop unexpectedly
    if (!lyriaResponse || !lyriaResponse.ok) {
      throw new Error("Lyria API failed permanently.");
    }

    const lyriaData = await lyriaResponse.json();
    
    // Lyria (lyria-002) returns the audio base64 encoded under "bytesBase64Encoded"
    if (lyriaData.predictions && lyriaData.predictions.length > 0) {
       let base64Audio;
       
       const prediction = lyriaData.predictions[0];
       if (typeof prediction === 'object' && prediction.bytesBase64Encoded) {
         base64Audio = prediction.bytesBase64Encoded;
       } else if (typeof prediction === 'object' && prediction.audio) {
         base64Audio = prediction.audio; // Fallback to older format
       } else if (typeof prediction === 'string') {
         base64Audio = prediction;
       }
       
       if (base64Audio) {
         // Lyria returns WAV data by default
         const audioUrl = `data:audio/wav;base64,${base64Audio}`;
         return NextResponse.json({ audioUrl });
       }
    }

    throw new Error("No audio payload returned from Lyria");

  } catch (error: any) {
    console.error("Music generation error (Lyria):", error.message);
    const fallbackUrl = FALLBACK_MUSIC[requestedSeason] || FALLBACK_MUSIC["無季"];
    console.log("Using fallback audio:", fallbackUrl);
    
    return NextResponse.json({ audioUrl: fallbackUrl, warning: "Used fallback audio" });
  }
}