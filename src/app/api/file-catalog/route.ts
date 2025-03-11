import { NextResponse } from 'next/server';
import { loadFileCatalog } from '@/utils/file-catalog';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    logger.info('API: Fetching file catalog');
    
    // Load the file catalog
    const catalog = loadFileCatalog();
    
    return NextResponse.json(catalog);
  } catch (error) {
    logger.error('API: Error fetching file catalog:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch file catalog', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 