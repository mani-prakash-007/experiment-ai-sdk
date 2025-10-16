import { NextRequest, NextResponse } from 'next/server';
import { createClientForServer } from '@/utils/supabase/server';

// GET /api/documents/[id]/versions - Get version metadata or all versions for a document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const metaOnly = searchParams.get('metaOnly') === 'true';

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

    // Query both tables in parallel
    const [currentDocResult, historicalVersionsResult] = await Promise.all([
      supabase
        .from('documents')
        .select(metaOnly ? 'version_number,updated_at,user_id' : '*')
        .eq('id', id)
        .eq('user_id', user.id) // Ensure user owns the document
        .single(),
      supabase
        .from('document_versions')
        .select(metaOnly ? 'version_number,created_at,created_by,change_summary' : '*')
        .eq('document_id', id)
        .order('version_number', { ascending: false })
    ]);
    
    const { data: currentDoc, error: currentDocError } = currentDocResult;
    const { data: historicalVersions, error: historicalError } = historicalVersionsResult;
    
    if (currentDocError && historicalError) {
      return NextResponse.json(
        { error: currentDocError.message || historicalError.message },
        { status: 500 }
      );
    }
    
    interface VersionMeta {
      version_number: number;
      created_at: string;
      created_by: string;
      change_summary: string;
    }
    
    interface VersionFull extends VersionMeta {
      id: string;
      document_id: string;
      title: string;
      content: string;
      extra?: Record<string, unknown>;
    }
    
    const versionsList: Array<VersionMeta | VersionFull> = [];
    
    // Add current version (live document)
    if (currentDoc && !currentDocError) {
      const doc = currentDoc as unknown as Record<string, unknown>;
      if (metaOnly) {
        versionsList.push({
          version_number: doc.version_number as number,
          created_at: doc.updated_at as string,
          created_by: doc.user_id as string,
          change_summary: 'Current version'
        });
      } else {
        versionsList.push({
          id: doc.id as string,
          document_id: doc.id as string,
          version_number: doc.version_number as number,
          title: doc.title as string,
          content: doc.content as string,
          extra: doc.extra as Record<string, unknown> | undefined,
          change_summary: 'Current version',
          created_at: doc.updated_at as string,
          created_by: doc.user_id as string
        });
      }
    }
    
    // Add all historical versions
    if (historicalVersions && Array.isArray(historicalVersions) && historicalVersions.length > 0) {
      versionsList.push(...(historicalVersions as unknown as Array<VersionMeta | VersionFull>));
    }
    
    // Sort by version number descending (current version first, then historical)
    const sortedVersions = versionsList.sort((a, b) => b.version_number - a.version_number);

    return NextResponse.json(metaOnly ? { versionMeta: sortedVersions } : { versions: sortedVersions });
  } catch (error) {
    console.error('Document versions fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}