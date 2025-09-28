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

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
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
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  document_id?: string; // Changed from document object to document ID reference
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

