import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations like generating presigned URLs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const { storagePath, expiresIn = 3600 } = await request.json();

    if (!storagePath) {
      return NextResponse.json(
        { error: 'Storage path is required' },
        { status: 400 }
      );
    }

    // Generate presigned URL for private access
    const { data, error } = await supabase.storage
      .from('chat-files')
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      console.error('Error creating presigned URL:', error);
      return NextResponse.json(
        { error: 'Failed to generate presigned URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      signedUrl: data.signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
    });

  } catch (error) {
    console.error('Presigned URL generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}