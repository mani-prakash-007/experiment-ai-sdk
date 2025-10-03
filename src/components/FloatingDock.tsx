import React, { useState, useRef, useEffect } from "react";
import { 
  Loader2,  
  Sparkles, 
  ChevronDown, 
  Upload, 
  X, 
  FileText, 
  Image, 
  File,
  Check,
  Folder,
  Edit3
} from "lucide-react";
import { FloatingDockProps, ModelOption, UploadedFile, DocumentReference, Message } from '@/app/types/chat';
import { useAuth } from '@/app/hooks/useAuth';
import { toast } from "sonner";

const MODEL_OPTIONS: { [key: string]: ModelOption[] } = {
  'Google': [
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google" },
  ],
  //   OpenAI: [
  //   { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  //   { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI" },
  // ],
  // 'Claude': [
  //   { id: "claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic" },
  //   { id: "claude-3-sonnet", name: "Claude 3 Sonnet", provider: "Anthropic" },
  //   { id: "claude-3-haiku", name: "Claude 3 Haiku", provider: "Anthropic" },
  // ],
// 'Perplexity': [
//   { id: "sonar", name: "Sonar — Lightweight Search", provider: "Perplexity" },
//   { id: "sonar-reasoning", name: "Sonar Reasoning — Fast Problem-Solving", provider: "Perplexity" },
//   { id: "sonar-deep-research", name: "Sonar Deep Research — Comprehensive Reports", provider: "Perplexity" },
// ],
};

// File type detection
const getFileTypeFromMime = (mimeType: string): 'image' | 'pdf' | 'text' | 'markdown' => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'text/markdown' || mimeType === 'text/x-markdown') return 'markdown';
  if (mimeType === 'text/plain') return 'text';
  return 'text'; // fallback
};

const getFileIcon = (mimeType: string) => {
  const type = getFileTypeFromMime(mimeType);
  switch (type) {
    case 'image': return <Image className="w-4 h-4" />;
    case 'pdf': return <File className="w-4 h-4 text-red-400" />;
    case 'markdown': return <FileText className="w-4 h-4 text-blue-400" />;
    case 'text': return <FileText className="w-4 h-4 text-green-400" />;
    default: return <File className="w-4 h-4" />;
  }
};

// Utility functions
// Validation function with your specific allowed types
const validateFile = (file: File) => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  // Your specific allowed MIME types
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/x-markdown',
    // Image types (image/*)
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff'
  ];

  if (file.size > maxSize) {
    throw new Error('File size must be less than 5MB');
  }

  // Check if file type is allowed
  const isImageType = file.type.startsWith('image/');
  const isExactMatch = allowedTypes.includes(file.type);
  
  if (!isImageType && !isExactMatch) {
    throw new Error(`File type "${file.type}" is not allowed. Allowed types: PDF, Text, Markdown, and Images`);
  }

  // Additional validation for specific file types
  if (file.type === 'application/pdf' && file.size > 10 * 1024 * 1024) {
    throw new Error('PDF files must be less than 10MB');
  }

  return true;
};

export const FloatingDock: React.FC<FloatingDockProps> = ({
  input,
  setInput,
  onSubmit,
  isLoading = false,
  selectedModel,
  onModelChange,
  uploadedFile,
  onFileUpload,
  onFileRemove,
  messageFiles,
  documentReference,
  onDocumentReference,
  onDocumentReferenceRemove,
  messagesWithDocuments,
  allAvailableVersions = []
}) => {
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);
  const [showKeywordRefDropdown, setShowKeywordRefDropdown] = useState(false);
  const [showFilesList, setShowFilesList] = useState(false);
  const [showDocumentsList, setShowDocumentsList] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const uploadDropdownRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
      if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(event.target as Node)) {
        setShowUploadDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (input[input.length - 1] === '/') {
      setShowKeywordRefDropdown(true);
    } else {
      setShowKeywordRefDropdown(false);
      setShowFilesList(false);
      setShowDocumentsList(false);
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as any);
    }
  };

  // Updated file upload handler with specific file type handling
  const handleFileUpload = async (uploadType: 'image' | 'pdf' | 'text' | 'markdown') => {
    if (!user) {
      setUploadError('You must be signed in to upload files');
      return;
    }

    if(uploadedFile){
      toast.error('Only one file allowed. Remove the file to upload new file !')
      return
    }

    if(documentReference){
      toast.error('Cannot upload files while editing a document. Remove document reference first.')
      return
    }

    setUploadError(null);

    if (fileInputRef.current) {
      // Set specific accept attributes based on your allowed types
      const acceptMap = {
        image: 'image/*',
        pdf: 'application/pdf,.pdf',
        text: 'text/plain,.txt',
        markdown: 'text/markdown,.md,.markdown'
      };
      
      fileInputRef.current.accept = acceptMap[uploadType];

      fileInputRef.current.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files[0]) {
          const file = files[0];

          try {
            // Validate file locally
            validateFile(file);

            // Additional type-specific validation
            if (uploadType === 'image' && !file.type.startsWith('image/')) {
              throw new Error('Please select an image file');
            }
            if (uploadType === 'pdf' && file.type !== 'application/pdf') {
              throw new Error('Please select a PDF file');
            }
            if (uploadType === 'text' && file.type !== 'text/plain') {
              throw new Error('Please select a plain text file');
            }
            if (uploadType === 'markdown' && !['text/markdown', 'text/x-markdown', 'text/plain'].includes(file.type)) {
              throw new Error('Please select a Markdown file');
            }

            setIsUploading(true);
            setUploadError(null);

            // Create FormData for file upload
            const formData = new FormData();
            formData.append('file', file);
            
            // Upload via API
            const response = await fetch('/api/files/upload', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(`Upload failed: ${errorData.error}`);
            }

            const uploadedFile = await response.json();

            if (onFileUpload) {
              onFileUpload(uploadedFile);
            }
            toast.success('File uploaded')

          } catch (error) {
            console.error('Upload error:', error);
            setUploadError(error instanceof Error ? error.message : 'Failed to upload file');
          } finally {
            setIsUploading(false);
          }
        }

        setShowUploadDropdown(false);

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };

      fileInputRef.current.click();
    }
  };

  //Handle File Reference
  const handleFileReference = (file: UploadedFile) => {
    onFileUpload?.(file);
    setShowKeywordRefDropdown(false);
    setShowFilesList(false);
    setInput(input.slice(0, -1));
  };

  //Handle Document Reference
  const handleDocumentReference = (message: Message) => {
    if (!message.document) return;

    if (uploadedFile) {
      toast.error('Cannot reference documents while file is uploaded. Remove file first.');
      return;
    }
    
    const docRef: DocumentReference = {
      messageId: message.id,
      documentId: message.document.doc_id,
      title: message.document.doc_title,
      version: message.document.doc_version
    };
    
    onDocumentReference?.(docRef);
    setShowKeywordRefDropdown(false);
    setShowDocumentsList(false);
    setInput(input.slice(0, -1));
  };

  //Handle Version Reference (for new comprehensive version selection)
  const handleVersionReference = (docId: string, docTitle: string, version: any) => {
    if (uploadedFile) {
      toast.error('Cannot reference documents while file is uploaded. Remove file first.');
      return;
    }
    
    const docRef: DocumentReference = {
      messageId: '', // No specific message for version references
      documentId: docId,
      title: docTitle,
      version: version.is_current ? undefined : version.version_number // undefined means latest
    };
    
    onDocumentReference?.(docRef);
    setShowKeywordRefDropdown(false);
    setShowDocumentsList(false);
    setInput(input.slice(0, -1));
  };  

  // Handle file removal
  const handleFileRemove = async () => {
    if (!uploadedFile || !user) return;
    onFileRemove?.();
  };

  // Handle document reference removal
  const handleDocumentReferenceRemove = () => {
    onDocumentReferenceRemove?.();
  };

  function prettySize( bytes : number) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed (2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
  }

  return (
    <div>
      {/* Error Display */}
      {uploadError && (
        <div className="mb-3 p-2 bg-red-900/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{uploadError}</p>
          <button 
            onClick={() => setUploadError(null)}
            className="text-red-300 hover:text-red-100 text-xs mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Uploaded Files Display */}
      {uploadedFile && (
        <div className="mb-3">
          <div title={`${uploadedFile.fileName} (${uploadedFile.metadata.type})`} className="relative bg-slate-800/70 backdrop-blur-sm border border-slate-600/50 rounded-lg p-2 pr-8 flex items-center space-x-2 max-w-xs cursor-default">
            {uploadedFile.metadata?.type?.startsWith('image/') ? (
              <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center text-slate-300">
                <Image className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center text-slate-300">
                {getFileIcon(uploadedFile.metadata.type)}
              </div>
            )}
            <div className="flex-1 truncate">
              <span className="text-sm text-slate-300 block truncate">
                {uploadedFile.fileName}
              </span>
              <span className="text-xs text-slate-500">
                {getFileTypeFromMime(uploadedFile.metadata.type).toUpperCase()} • {prettySize(uploadedFile.metadata.size)}
              </span>
            </div>
            <button
              onClick={handleFileRemove}
              className="absolute right-1 top-1 transition-opacity p-1 hover:bg-slate-700 rounded cursor-pointer"
            >
             { isRemoving ? 
              <Loader2 className="w-3 h-3 text-slate-400 animate-spin"/> :
              <X className="w-3 h-3 text-slate-400" />
             }
            </button>
          </div>
        </div>
      )}

      {/* Document Reference Display */}
      {documentReference && (
        <div className="mb-3">
          <div title={`Referenced Document: ${documentReference.title}`} className="relative bg-purple-800/70 backdrop-blur-sm border border-purple-600/50 rounded-lg p-2 pr-8 flex items-center space-x-2 max-w-xs cursor-default">
            <div className="w-8 h-8 bg-purple-700 rounded flex items-center justify-center text-purple-300">
              <Edit3 className="w-4 h-4" />
            </div>
            <div className="flex-1 truncate">
              <span className="text-sm text-purple-300 block truncate">
                {documentReference.title}
              </span>
              <span className="text-xs text-purple-500">
                Document Reference • Edit Mode
              </span>
            </div>
            <button
              onClick={handleDocumentReferenceRemove}
              className="absolute right-1 top-1 transition-opacity p-1 hover:bg-purple-700 rounded cursor-pointer"
            >
              <X className="w-3 h-3 text-purple-400" />
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl" />

        {/* Form */}
        <form onSubmit={onSubmit} className="relative p-3">
          <div className="flex items-center space-x-3">
            {/* Left side controls */}
            <div className="flex flex-col">
              {/* Model Selection Dropdown */}
              <div className="relative my-1" ref={modelDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className="px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 hover:border-slate-500/70 rounded-lg text-slate-300 text-sm flex items-center space-x-1 transition-all duration-200"
                >
                  <Sparkles className="w-4 h-4" />
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showModelDropdown && (
                  <div className="absolute bottom-full mb-2 left-0 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl py-2 min-w-48 z-50">
                    {Object.entries(MODEL_OPTIONS).map(([provider, models]) => (
                      <div key={provider}>
                        <div className="px-3 py-1 text-xs font-medium text-slate-400 uppercase tracking-wide">
                          {provider}
                        </div>
                        {models.map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              onModelChange?.(model);
                              setShowModelDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center justify-between transition-colors duration-150"
                          >
                            <span>{model.name}</span>
                            {selectedModel?.id === model.id && (
                              <Check className="w-4 h-4 text-blue-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* File Upload Dropdown - Updated with your specific file types */}
              <div className="relative my-1" ref={uploadDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowUploadDropdown(!showUploadDropdown)}
                  disabled={isUploading || !user}
                  className="px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 hover:border-slate-500/70 rounded-lg text-slate-300 text-sm flex items-center space-x-1 transition-all duration-200 disabled:opacity-50"
                  title={!user ? "Sign in to upload files" : "Upload files"}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showUploadDropdown && user && (
                  <div className="absolute bottom-full mb-2 left-0 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl py-2 min-w-40 z-50">
                    <div className="px-3 py-1 text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Upload Files (Max 5MB)
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFileUpload('image')}
                      disabled={isUploading}
                      className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center space-x-2 transition-colors duration-150 disabled:opacity-50"
                    >
                      <Image className="w-4 h-4" />
                      <span>Images</span>
                      {/* <span className="text-xs text-slate-500 ml-auto">JPG, PNG, GIF, WebP</span> */}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFileUpload('pdf')}
                      disabled={isUploading}
                      className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center space-x-2 transition-colors duration-150 disabled:opacity-50"
                    >
                      <File className="w-4 h-4 text-red-400" />
                      <span>PDF</span>
                      {/* <span className="text-xs text-slate-500 ml-auto">PDF files</span> */}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFileUpload('text')}
                      disabled={isUploading}
                      className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center space-x-2 transition-colors duration-150 disabled:opacity-50"
                    >
                      <FileText className="w-4 h-4 text-green-400" />
                      <span>Text</span>
                      {/* <span className="text-xs text-slate-500 ml-auto">TXT files</span> */}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Input area */}
            <div className="flex-1 relative group flex justify-center items-center">
                {showKeywordRefDropdown && (
                  <div className="absolute bottom-full mb-2 left-0 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl min-w-48 z-50">
                  <div 
                    className="relative"
                  >
                    <div 
                      className="flex items-center  px-3 py-3 text-xs font-medium text-slate-400 uppercase hover:bg-slate-700/50 cursor-pointer rounded-xl"
                      onClick={() => {
                        setShowKeywordRefDropdown(false)
                        setShowUploadDropdown(true)
                      }}
                    >
                      <Upload className="h-4 w-4 mx-3"/>
                    Upload Files
                    </div>
                    <div 
                      className="flex items-center px-3 py-3 text-xs font-medium text-slate-400 uppercase hover:bg-slate-700/50 cursor-pointer rounded-xl"
                      onClick={() => {
                        setShowKeywordRefDropdown(false)
                        setShowModelDropdown(true)
                      }}
                    >
                      <Sparkles className="h-4 w-4 mx-3"/>
                    Models
                    </div>
                    <div 
                      className="flex items-center px-3 py-3 text-xs font-medium text-slate-400 uppercase hover:bg-slate-700/50 cursor-pointer rounded-xl"
                      onClick={() => setShowFilesList(!showFilesList)}
                    >
                      <Folder className="h-4 w-4 mx-3"/>
                    Files
                    </div>
                    <div 
                      className="flex items-center px-3 py-3 text-xs font-medium text-slate-400 uppercase hover:bg-slate-700/50 cursor-pointer rounded-xl"
                      onClick={() => setShowDocumentsList(!showDocumentsList)}
                    >
                      <Edit3 className="h-4 w-4 mx-3"/>
                    Edit Document
                    </div>
                    
                    {/* Files dropdown */}
                    {showFilesList && (
                      <div className="absolute left-full bottom-0 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl py-2 min-w-48 ml-2">
                      {messageFiles && messageFiles.length > 0 ? (
                        messageFiles.map((file, index) => (
                        <div 
                          key={index}
                          className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 cursor-pointer flex items-center gap-2"
                          onClick={() => handleFileReference(file)}
                        >
                          {getFileIcon(file.metadata.type)}
                          <span className="truncate">{file.fileName}</span>
                        </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-slate-400">
                        No files available
                        </div>
                      )}
                      </div>
                    )}

                    {/* Documents dropdown */}
                    {showDocumentsList && (
                      <div className="absolute left-full bottom-0 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl py-2 min-w-64 ml-2 max-h-64 overflow-y-auto">
                      {allAvailableVersions && allAvailableVersions.length > 0 ? (
                        allAvailableVersions.map((doc) => (
                          <div key={doc.doc_id} className="mb-2">
                            <div className="px-3 py-1 text-xs font-medium text-slate-400 bg-slate-700/30">
                              {doc.doc_title}
                            </div>
                            {doc.versions.map((version: any) => (
                              <div 
                                key={`${doc.doc_id}-v${version.version_number}`}
                                className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 cursor-pointer flex items-center gap-2 border-l-2 border-slate-600 ml-2"
                                onClick={() => handleVersionReference(doc.doc_id, doc.doc_title, version)}
                              >
                                <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="truncate font-medium">
                                    Version {version.version_number}
                                    {version.is_current && (
                                      <span className="ml-2 text-xs text-green-400">(Latest)</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {new Date(version.created_at).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-slate-400">
                        No documents available for editing
                        </div>
                      )}
                      </div>
                    )}
                  </div>
                  </div>
                )}
              <textarea
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  !user ? "Sign in to chat..." :
                  documentReference ? "Describe how you'd like to edit the document..." :
                  uploadedFile ? "Ask questions about your file or create a document..." :
                  "Ask me to create a document..."
                }
                disabled={isLoading || !user}
                autoFocus={!!user}
                rows={1}
                className="
                  w-full bg-slate-800/50 text-slate-100 placeholder-slate-400
                  px-4 py-3 pr-12 rounded-xl border border-slate-600/50
                  focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20
                  transition-all duration-300 resize-none overflow-y-auto
                  disabled:opacity-50 disabled:cursor-not-allowed
                  group-hover:border-slate-500/70
                  min-h-[5rem] max-h-32
                "
                autoComplete="off"
                spellCheck="false"
              />
            </div>

            {/* Send button */}
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !user}
              className="
                relative overflow-hidden px-4 py-3 rounded-xl
                bg-gradient-to-r from-blue-500 to-purple-600
                hover:from-blue-600 hover:to-purple-700
                active:from-blue-700 active:to-purple-800
                disabled:from-slate-600 disabled:to-slate-700
                text-white transition-all duration-200
                transform hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                shadow-lg hover:shadow-xl
                focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-slate-900
                min-w-[3rem] h-12
              "
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <div className="flex items-center">
                  <span>Send</span>
                </div>
              )}
            </button>
          </div>
        </form>

        {/* Selected Model Tag */}
        {selectedModel && (
          <div className="relative px-3 pb-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">{selectedModel.id === 'gemini-2.5-flash' ? 'Default Model :' : 'Model :'}</span>
              <div className="inline-flex items-center px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
                <Sparkles className="w-3 h-3 mr-1" />
                {selectedModel.provider} {selectedModel.name}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
      />

      <div className="h-6 sm:h-0" />
    </div>
  );
};
