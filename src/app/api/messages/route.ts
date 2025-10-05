import { NextRequest, NextResponse } from 'next/server';
import { createClientForServer } from '@/utils/supabase/server';

// GET /api/messages - Fetch messages for a session with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
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

    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      messages: (data || []).reverse(),
      hasMore: (data || []).length === pageSize
    });
  } catch (error) {
    console.error('Messages fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/messages - Add a new message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, role, content, file_data, document } = body;

    if (!session_id || !role ) {
      return NextResponse.json(
        { error: 'Session ID, role, and content are required' },
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

    const { data, error } = await supabase
      .from('messages')
      .insert({
        session_id,
        role,
        content,
        file_data,
        document
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Message creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/messages - Update a message
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, content, document } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Message ID is required' },
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

    // Build update object with only provided fields
    const updateData: any = {};
    if (content !== undefined) updateData.content = content;
    if (document !== undefined) updateData.document = document;

    const { data, error } = await supabase
      .from('messages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Message update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}