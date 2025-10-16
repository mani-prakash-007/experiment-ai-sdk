import { NextRequest, NextResponse } from 'next/server';
import { createClientForServer } from '@/utils/supabase/server';
import type { FileWithMetadata, FilesResponse } from '@/app/types/chat';

// Helper function to categorize files by type
function categorizeFile(mimeType: string): 'image' | 'document' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('text') ||
    mimeType.includes('msword') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation')
  ) return 'document';
  return 'other';
}

// GET /api/files - Get paginated files for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClientForServer();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Max 50 files per page
    const category = searchParams.get('category'); // Optional filter by category
    
    const offset = (page - 1) * limit;

    // List files in the user's directory
    const { data: fileList, error: listError } = await supabase.storage
      .from('chat-files')
      .list(user.id, {
        limit: 1000, // Get all files first, then handle pagination
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (listError) {
      console.error('Error listing files:', listError);
      return NextResponse.json(
        { error: 'Failed to list files' },
        { status: 500 }
      );
    }

    // Filter out folders and placeholder files
    const filesOnly = fileList?.filter(item => {
      // Filter out folder placeholders and system files
      const isPlaceholderFile = item.name === '.emptyFolderPlaceholder' || 
                               item.name.startsWith('.') ||
                               item.name.endsWith('/');
      
      const hasValidMetadata = item.metadata && Object.keys(item.metadata).length > 0;
      const hasId = item.id !== null && item.id !== undefined;
      
      return !isPlaceholderFile && hasValidMetadata && hasId;
    }) || [];

    // Transform files and add metadata
    let filesWithMetadata: FileWithMetadata[] = filesOnly.map((file) => {
      // Extract metadata from filename
      const storagePath = `${user.id}/${file.name}`;
      const parts = file.name.split('_');
      // const timestamp = parts[0]; // Unused for now
      const originalName = parts.slice(1).join('_');
      
      // Determine file type from metadata or extension
      const mimeType = file.metadata?.mimetype || 'application/octet-stream';
      const category = categorizeFile(mimeType);
      
      return {
        id: file.id || file.name,
        name: file.name,
        storagePath,
        size: file.metadata?.size || 0,
        type: mimeType,
        uploadedAt: file.created_at || new Date().toISOString(),
        userId: user.id,
        originalName: originalName || file.name,
        category
      };
    });

    // Filter by category if specified
    if (category && category !== 'all') {
      filesWithMetadata = filesWithMetadata.filter(file => file.category === category);
    }

    // Apply pagination
    const totalFiles = filesWithMetadata.length;
    const totalPages = Math.ceil(totalFiles / limit);
    const paginatedFiles = filesWithMetadata.slice(offset, offset + limit);

    const response: FilesResponse = {
      files: paginatedFiles,
      pagination: {
        page,
        limit,
        totalFiles,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Files API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}