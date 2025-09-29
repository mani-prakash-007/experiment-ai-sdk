import { useState, useCallback } from 'react';
import { createClientForBrowser } from '@/utils/supabase/client';

export interface DocumentData {
  title: string;
  content: string;
  extra?: {
    wordCount?: number;
    estimatedReadTime?: string;
    tags?: string[];
    category?: string;
  };
}
export interface Document extends DocumentData {
  id: string;
  user_id: string;
  version_number: number;
  created_at: string;
  updated_at: string;
}
export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  title: string;
  content: string;
  extra?: DocumentData['extra'];
  change_summary?: string;
  created_at: string;
  created_by: string;
}
export interface VersionMeta {
  version_number: number;
  created_at: string;
  created_by: string;
  change_summary?: string;
}


export function useDocuments({ userId }: { userId?: string } = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientForBrowser();
  
  const getDocument = useCallback(async (documentId: string): Promise<Document | null> => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();
    setLoading(false);
    if (err) setError(err.message);
    return data || null;
  }, []);

  const getDocumentVersion = useCallback(async (documentId: string, version: number): Promise<DocumentVersion | null> => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .eq('version_number', version)
      .single();
    setLoading(false);
    if (err) setError(err.message);
    return data || null;
  }, []);

  const getVersionMetaList = useCallback(async (documentId: string): Promise<VersionMeta[]> => {
    setLoading(true);
    setError(null);
    
    // Query both tables in parallel
    const [currentDocResult, historicalVersionsResult] = await Promise.all([
      supabase
        .from('documents')
        .select('version_number,updated_at,user_id')
        .eq('id', documentId)
        .single(),
      supabase
        .from('document_versions')
        .select('version_number,created_at,created_by,change_summary')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false })
    ]);
    
    const { data: currentDoc, error: currentDocError } = currentDocResult;
    const { data: historicalVersions, error: historicalError } = historicalVersionsResult;
    
    setLoading(false);
    
    if (currentDocError && historicalError) {
      setError(currentDocError.message || historicalError.message);
      return [];
    }
    
    const versionsList: VersionMeta[] = [];
    
    // Add current version (live document)
    if (currentDoc) {
      versionsList.push({
        version_number: currentDoc.version_number,
        created_at: currentDoc.updated_at,
        created_by: currentDoc.user_id,
        change_summary: 'Current version'
      });
    }
    
    // Add all historical versions
    if (historicalVersions && historicalVersions.length > 0) {
      versionsList.push(...(historicalVersions as VersionMeta[]));
    }
    
    // Sort by version number descending (current version first, then historical)
    return versionsList.sort((a, b) => b.version_number - a.version_number);
  }, []);

  const getAllDocumentVersions = useCallback(async (documentId: string): Promise<DocumentVersion[]> => {
    setLoading(true);
    setError(null);
    
    // Query both tables in parallel
    const [currentDocResult, historicalVersionsResult] = await Promise.all([
      supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single(),
      supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false })
    ]);
    
    const { data: currentDoc, error: currentDocError } = currentDocResult;
    const { data: historicalVersions, error: historicalError } = historicalVersionsResult;
    
    setLoading(false);
    
    if (currentDocError && historicalError) {
      setError(currentDocError.message || historicalError.message);
      return [];
    }
    
    const allVersions: DocumentVersion[] = [];
    
    // Add current version (live document) converted to DocumentVersion format
    if (currentDoc) {
      allVersions.push({
        id: currentDoc.id,
        document_id: currentDoc.id,
        version_number: currentDoc.version_number,
        title: currentDoc.title,
        content: currentDoc.content,
        extra: currentDoc.extra,
        change_summary: 'Current version',
        created_at: currentDoc.updated_at,
        created_by: currentDoc.user_id
      });
    }
    
    // Add all historical versions
    if (historicalVersions && historicalVersions.length > 0) {
      allVersions.push(...(historicalVersions as DocumentVersion[]));
    }
    
    // Sort by version number descending (current version first, then historical)
    return allVersions.sort((a, b) => b.version_number - a.version_number);
  }, []);

  const saveDocument = useCallback(async (
    documentId: string,
    data: Partial<DocumentData>,
  ): Promise<Document | null> => {
    setLoading(true);
    setError(null);
    const { data: updated, error: err } = await supabase
      .from('documents')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single();
    setLoading(false);
    if (err) setError(err.message);
    return updated as Document || null;
  }, []);

  const createDocument = useCallback(async (data: DocumentData): Promise<Document | null> => {
    setLoading(true);
    setError(null);
    const { data: inserted, error: err } = await supabase
      .from('documents')
      .insert({ ...data, user_id: userId })
      .select()
      .single();
    setLoading(false);
    if (err) setError(err.message);
    return inserted as Document || null;
  }, [userId]);

  return {
    loading,
    error,
    getDocument,
    getDocumentVersion,
    getVersionMetaList,
    getAllDocumentVersions,
    saveDocument,
    createDocument
  };
}
