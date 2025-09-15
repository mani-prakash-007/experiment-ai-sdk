export interface UploadedFile {
  fileName: string;
  fileUrl: string;
  storagePath?: string;
  metadata: {
    size: number;
    type: string;
    uploadedAt: string;
    userId?: string;
    originalName: string;
  };
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
  uploadedFile?: UploadedFile;
  onFileUpload?: (files: UploadedFile) => void;
  onFileRemove?: () => void;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  document?: {
    title: string;
    content: string;
    extra?: {
      wordCount?: number;
      estimatedReadTime?: string;
      tags?: string[];
      category?: string;
    };
  };
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

