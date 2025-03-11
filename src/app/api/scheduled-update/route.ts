import { NextResponse } from 'next/server';
import { generateEmbeddings } from '@/actions/knowledgebase-embeddings';
import { logger } from '@/utils/logger';

// Secret key for authentication
const API_SECRET = process.env.SCHEDULED_UPDATE_SECRET || 'default-secret-key';

export async function POST(req: Request) {
  try {
    // Check for authentication
    const { secret } = await req.json();
    
    if (secret !== API_SECRET) {
      logger.warn('Unauthorized attempt to trigger scheduled update');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    logger.info('Starting scheduled knowledge base update');
    
    // Generate embeddings (this now uses the selective update logic)
    await generateEmbeddings();
    
    logger.info('Scheduled knowledge base update completed successfully');
    
    return NextResponse.json(
      { success: true, message: 'Knowledge base updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error in scheduled knowledge base update:', error);
    
    return NextResponse.json(
      { error: 'Failed to update knowledge base', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Also support GET requests for easier testing
export async function GET(req: Request) {
  try {
    // Extract secret from URL query parameters
    const url = new URL(req.url);
    const secret = url.searchParams.get('secret');
    
    if (secret !== API_SECRET) {
      logger.warn('Unauthorized attempt to trigger scheduled update via GET');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    logger.info('Starting scheduled knowledge base update via GET');
    
    // Generate embeddings (this now uses the selective update logic)
    await generateEmbeddings();
    
    logger.info('Scheduled knowledge base update completed successfully');
    
    return NextResponse.json(
      { success: true, message: 'Knowledge base updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error in scheduled knowledge base update:', error);
    
    return NextResponse.json(
      { error: 'Failed to update knowledge base', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 