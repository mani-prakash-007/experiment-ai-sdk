import { useState, useCallback } from 'react';

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
  
  const getDocument = useCallback(async (documentId: string): Promise<Document | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }
      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err: unknown) {
      setError((err as Error).message);
      setLoading(false);
      return null;
    }
  }, []);

  const getDocumentVersion = useCallback(async (documentId: string, version: number): Promise<DocumentVersion | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/versions/${version}`);
      if (!response.ok) {
        throw new Error('Failed to fetch document version');
      }
      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err: unknown) {
      setError((err as Error).message);
      setLoading(false);
      return null;
    }
  }, []);

  const getVersionMetaList = useCallback(async (documentId: string): Promise<VersionMeta[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/versions?metaOnly=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch version metadata');
      }
      const { versionMeta } = await response.json();
      setLoading(false);
      return versionMeta || [];
    } catch (err: unknown) {
      setError((err as Error).message);
      setLoading(false);
      return [];
    }
  }, []);

  const getAllDocumentVersions = useCallback(async (documentId: string): Promise<DocumentVersion[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/versions`);
      if (!response.ok) {
        throw new Error('Failed to fetch document versions');
      }
      const { versions } = await response.json();
      setLoading(false);
      return versions || [];
    } catch (err: unknown) {
      setError((err as Error).message);
      setLoading(false);
      return [];
    }
  }, []);

  const saveDocument = useCallback(async (
    documentId: string,
    data: Partial<DocumentData>,
  ): Promise<Document | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to save document');
      }
      const updated = await response.json();
      setLoading(false);
      return updated;
    } catch (err: unknown) {
      setError((err as Error).message);
      setLoading(false);
      return null;
    }
  }, []);

  const createDocument = useCallback(async (data: DocumentData): Promise<Document | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create document');
      }
      const inserted = await response.json();
      setLoading(false);
      return inserted;
    } catch (err: unknown) {
      setError((err as Error).message);
      setLoading(false);
      return null;
    }
  }, []);

  const getDocumentByReference = useCallback(async (
    docId: string, 
    referenceType: 'latest' | 'versioned',
    docVersion?: number
  ): Promise<Document | null> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        referenceType,
        ...(docVersion && { docVersion: docVersion.toString() })
      });
      
      const response = await fetch(`/api/documents/${docId}/by-reference?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch document by reference');
      }
      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err: unknown) {
      setError((err as Error).message);
      setLoading(false);
      return null;
    }
  }, []);

  const getAllUserDocumentsWithVersions = useCallback(async (sessionId?: string): Promise<Array<{
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
  }>> => {
    if (!userId || !sessionId) return [];
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/versions/all?sessionId=${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch all user documents with versions');
      }
      const data = await response.json();
      setLoading(false);
      return data.versions || [];
    } catch (err: unknown) {
      setError((err as Error).message);
      setLoading(false);
      return [];
    }
  }, [userId]);

  return {
    loading,
    error,
    getDocument,
    getDocumentVersion,
    getVersionMetaList,
    getAllDocumentVersions, // Gets versions for ONE specific document
    saveDocument,
    createDocument,
    getDocumentByReference,
    getAllUserDocumentsWithVersions // Gets ALL documents with their versions for dropdown (requires sessionId)
  };
}
