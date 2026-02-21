import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    env: {
      GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
      NODE_ENV: process.env.NODE_ENV,
    }
  });
}