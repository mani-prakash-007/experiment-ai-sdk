import { NextRequest, NextResponse } from 'next/server';
import { createClientForServer } from '@/utils/supabase/server';

// DELETE /api/files/[storagePath] - Remove a file from storage
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storagePath: string }> }
) {
  try {
    const { storagePath } = await params;

    if (!storagePath) {
      return NextResponse.json(
        { error: 'Storage path is required' },
        { status: 400 }
      );
    }

    // Decode the storage path (it may be URL encoded)
    const decodedStoragePath = decodeURIComponent(storagePath);

    const supabase = await createClientForServer();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Remove from Supabase storage
    const { error: removeError } = await supabase.storage
      .from('chat-files')
      .remove([decodedStoragePath]);

    if (removeError) {
      return NextResponse.json(
        { error: `Failed to remove file: ${removeError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('File removal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}