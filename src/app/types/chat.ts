import { string, stringFormat } from "zod";

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
  role: string;
  content: string;
  file?: UploadedFile,
  document?: {
    title?: string;
    content: string;
    extra?: {
      estimatedReadTime?: string;
      tags?: string[];
      category?: string;
    };
  };
}
