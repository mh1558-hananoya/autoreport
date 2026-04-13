import { NextRequest, NextResponse } from 'next/server';
import { fetchGA4Data } from '@/lib/ga4';

export async function POST(request: NextRequest) {
  try {
    const { propertyId, conversionEvent, year, month } = await request.json();

    if (!propertyId || !year || !month) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const data = await fetchGA4Data(propertyId, conversionEvent || 'contact', year, month);
    return NextResponse.json(data);
  } catch (error) {
    console.error('GA4 API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'GA4 data fetch failed' },
      { status: 500 }
    );
  }
}
