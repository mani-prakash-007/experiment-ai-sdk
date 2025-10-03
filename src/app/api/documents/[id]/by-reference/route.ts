import { NextRequest, NextResponse } from 'next/server';
import { createClientForServer } from '@/utils/supabase/server';

// GET /api/documents/[id]/by-reference - Get document content based on reference type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const referenceType = searchParams.get('referenceType') || 'latest';
    const docVersion = searchParams.get('docVersion');

    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
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

    // Use the database function to get content based on reference type
    const { data, error } = await supabase.rpc('get_document_content', {
      doc_id: id,
      reference_type: referenceType,
      doc_version: docVersion ? parseInt(docVersion) : null
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Verify user owns the document
    if (referenceType === 'latest') {
      const { data: ownerCheck, error: ownerError } = await supabase
        .from('documents')
        .select('user_id')
        .eq('id', id)
        .single();

      if (ownerError || ownerCheck?.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Document not found or access denied' },
          { status: 404 }
        );
      }
    } else {
      // For versioned documents, check ownership through the parent document
      const { data: ownerCheck, error: ownerError } = await supabase
        .from('documents')
        .select('user_id')
        .eq('id', id)
        .single();

      if (ownerError || ownerCheck?.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Document not found or access denied' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('Document fetch by reference error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}