import { NextRequest, NextResponse } from 'next/server';
import { createClientForServer } from '@/utils/supabase/server';

// POST /api/files/upload - Upload a file to storage
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const supabase = await createClientForServer();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${user.id}/${timestamp}_${sanitizedName}`;

    // Convert file to buffer for upload
    const buffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(buffer);

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(fileName, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Create the uploaded file object
    const uploadedFile = {
      fileName: file.name,
      storagePath: fileName,
      metadata: {
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        userId: user.id,
        originalName: file.name
      }
    };

    return NextResponse.json(uploadedFile);
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}