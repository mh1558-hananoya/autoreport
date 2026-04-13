import { NextRequest, NextResponse } from 'next/server';
import { fetchSEOData } from '@/lib/dataforseo';

export async function POST(request: NextRequest) {
  try {
    const { domain, keywords, competitors } = await request.json();

    if (!domain || !keywords) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const data = await fetchSEOData(domain, keywords, competitors || []);
    return NextResponse.json(data);
  } catch (error) {
    console.error('DataForSEO API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'SEO data fetch failed' },
      { status: 500 }
    );
  }
}
