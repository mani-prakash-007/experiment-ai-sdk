import { NextRequest, NextResponse } from 'next/server';
import { createClientForServer } from '@/utils/supabase/server';

// GET /api/documents/versions/all?sessionId=xxx - Get all document versions available for editing in a specific session
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

    // Get sessionId from query parameters
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Verify that the session belongs to the authenticated user
    const { data: sessionData, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    // Use the database function to get all available versions for the session
    const { data, error } = await supabase.rpc('get_all_document_versions_for_session', {
      session_id: sessionId
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Group by document and format for UI
    interface DocumentVersion {
      doc_id: string;
      doc_title: string;
      doc_version: number;
      reference_type: string;
      is_current: boolean;
      created_at: string;
      message_id: string;
    }
    
    const groupedVersions = (data || []).reduce((acc: Record<string, {
      doc_id: string;
      doc_title: string;
      versions: Array<{
        version_number: number;
        reference_type: string;
        doc_title: string;
        is_current: boolean;
        created_at: string;
        message_id: string;
      }>;
    }>, version: unknown) => {
      const v = version as DocumentVersion;
      const docId = v.doc_id;
      
      if (!acc[docId]) {
        acc[docId] = {
          doc_id: docId,
          doc_title: v.doc_title,
          versions: []
        };
      }
      
      acc[docId].versions.push({
        version_number: v.doc_version,
        reference_type: v.reference_type,
        doc_title: v.doc_title,
        is_current: v.is_current,
        created_at: v.created_at,
        message_id: v.message_id
      });
      
      return acc;
    }, {});

    const formattedVersions = Object.values(groupedVersions);

    return NextResponse.json({ 
      versions: formattedVersions,
      total: formattedVersions.length 
    });
  } catch (error) {
    console.error('All versions fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}