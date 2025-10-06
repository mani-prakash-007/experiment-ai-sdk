export interface UploadedFile {
  fileName: string;
  storagePath: string;
  metadata: {
    size: number;
    type: string;
    uploadedAt: string;
    userId: string;
    originalName: string;
  };
}

export interface UploadedFileWithUrl extends UploadedFile {
  fileUrl: string;
  urlExpiresAt?: string;
}

export interface FileWithMetadata {
  id: string;
  name: string;
  storagePath: string;
  size: number;
  type: string;
  uploadedAt: string;
  userId: string;
  originalName: string;
  category: 'image' | 'document' | 'other';
}

export interface FilesResponse {
  files: FileWithMetadata[];
  pagination: {
    page: number;
    limit: number;
    totalFiles: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
}

export interface DocumentReference {
  messageId: string;
  documentId: string;
  title?: string;
  version?: number;
}

export interface DocumentMetadata {
  doc_id: string;
  doc_title: string;
  doc_version?: number; // null/undefined means "latest"
  reference_type: 'latest' | 'versioned';
  created_at: string;
}

export interface FloatingDockProps {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: (e: React.FormEvent) => void;
  isLoading?: boolean;
  selectedModel?: ModelOption;
  onModelChange?: (model: ModelOption) => void;
  uploadedFile?: UploadedFile | UploadedFileWithUrl;
  onFileUpload?: (files: UploadedFile) => void;
  onFileRemove?: () => void;
  messageFiles: UploadedFile[];
  documentReference?: DocumentReference;
  onDocumentReference?: (doc: DocumentReference) => void;
  onDocumentReferenceRemove?: () => void;
  messagesWithDocuments: Message[];
  allAvailableVersions?: any[];
  onFetchDocumentVersions?: () => Promise<any[]>;
  isDocumentVersionsLoading?: boolean;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  document?: DocumentMetadata; // JSONB document metadata
  file_data?: UploadedFile;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

