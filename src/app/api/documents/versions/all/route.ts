import { NextRequest, NextResponse } from 'next/server';
import { createClientForServer } from '@/utils/supabase/server';

// GET /api/documents/versions/all - Get all document versions available for editing
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

    // Use the database function to get all available versions
    const { data, error } = await supabase.rpc('get_all_document_versions_for_user', {
      user_id: user.id
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Group by document and format for UI
    const groupedVersions = (data || []).reduce((acc: any, version: any) => {
      const docId = version.doc_id;
      
      if (!acc[docId]) {
        acc[docId] = {
          doc_id: docId,
          doc_title: version.doc_title,
          versions: []
        };
      }
      
      acc[docId].versions.push({
        version_number: version.doc_version,
        reference_type: version.reference_type,
        is_current: version.is_current,
        created_at: version.created_at,
        message_id: version.message_id
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