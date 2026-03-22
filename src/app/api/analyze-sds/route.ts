import { NextRequest, NextResponse } from 'next/server';
import { aiMsdsDataExtraction } from '@/ai/flows/ai-msds-data-extraction';

export async function POST(request: NextRequest) {
  try {
    const { documentDataUri } = await request.json();
    if (!documentDataUri) {
      return NextResponse.json({ error: 'Missing documentDataUri' }, { status: 400 });
    }
    const result = await aiMsdsDataExtraction({ documentDataUri });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('SDS analysis error:', error);
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
  }
}
