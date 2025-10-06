import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { createPortal } from 'react-dom';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Heading from '@tiptap/extension-heading';
import {
  MdFormatBold as Bold,
  MdFormatItalic as Italic,
  MdFormatUnderlined as UnderlineIcon,
  MdFormatStrikethrough as Strikethrough,
  MdFormatListBulleted as List,
  MdFormatListNumbered as ListOrdered,
  MdCode as Code,
  MdUndo as Undo2,
  MdRedo as Redo2,
  MdFormatQuote as Quote,
  MdSave as Save,
  MdClose as X,
  MdAdd as Add,
  MdClose as TagRemove,
  MdEdit as EditIcon,
  MdVisibility as ViewIcon,
  MdKeyboardArrowDown as ChevronDown,
  MdHistory as History,
} from 'react-icons/md';
import {
  RiH1 as Heading1,
  RiH2 as Heading2,
  RiH3 as Heading3
} from 'react-icons/ri';
import { toast } from 'sonner';
import { useDocuments } from '@/app/hooks/useDocument';
import { Book } from 'lucide-react';

type EditorDocumentContent = {
  title: string;
  extra: {
    estimatedReadTime?: string;
    category?: string;
    tags?: string[];
  };
  content: string;
};

type Props = {
  documentId: string;
  documentVersion?: number; // Specific version to load, null/undefined means latest
  onSave: (newValue: EditorDocumentContent) => void;
  onClose?: () => void;
  isStreaming?: boolean;
};

function estimateReadingTime(html: string): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const words = text.trim().split(' ').filter(Boolean).length;
  const minutes = Math.ceil(words / 100);
  return `${minutes || 1} minute${minutes > 1 ? 's' : ''}`;
}

function arraysEqual(a: string[] = [], b: string[] = []) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

function isDocEdited(cur: EditorDocumentContent, orig: EditorDocumentContent) {
  return (
    cur.title !== orig.title ||
    (cur.extra?.category || '') !== (orig.extra?.category || '') ||
    !arraysEqual(cur.extra?.tags || [], orig.extra?.tags || []) ||
    cur.content !== orig.content
  );
}

function MenuBar({ editor, editable }: { editor: Editor | null, editable: boolean }) {
  if (!editor) return null;
  const buttonClass = "mx-1 p-2 rounded flex items-center justify-center transition-all duration-200 border border-transparent";
  const activeClass = editable
    ? "bg-indigo-600 text-white border-indigo-400 shadow shadow-indigo-500/30"
    : "bg-zinc-900 text-indigo-300 border-indigo-700 opacity-60 cursor-not-allowed";
  const inactiveClass = editable
    ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:border-zinc-600 hover:text-zinc-200"
    : "bg-zinc-900 text-zinc-500 opacity-60 cursor-not-allowed";
  const disabledClass = "bg-zinc-900 text-zinc-600 cursor-not-allowed opacity-60";
  const iconClass = "w-5 h-5";
  return (
    <div className="flex flex-wrap gap-1 w-full" aria-disabled={!editable}>
      {FORMATTING_BUTTONS.map(({ icon: Icon, command, title, exec, isActive }) => {
        const _active = isActive ? isActive(editor) : editor.isActive(command.replace(/-\d/, ''));
        return (
          <button
            key={command}
            onMouseDown={e => {
              e.preventDefault();
              if (!editable) return;
              exec
                ? exec(editor)
                : (editor.chain().focus() as any)[`toggle${command.charAt(0).toUpperCase() + command.slice(1)}`]?.().run();
            }}
            disabled={!editable}
            className={`${buttonClass} ${_active ? activeClass : inactiveClass}`}
            title={title}
            type="button"
            tabIndex={editable ? 0 : -1}
          >
            <Icon className={iconClass} />
          </button>
        );
      })}
      <div className="w-px bg-zinc-600 mx-2" />
      {ACTION_BUTTONS.map(({ icon: Icon, command, title, exec, canExec }) => {
        const isDisabled = !editable || !canExec?.(editor);
        return (
          <button
            key={command}
            onMouseDown={e => {
              e.preventDefault();
              if (isDisabled) return;
              exec?.(editor);
            }}
            className={`${buttonClass} ${isDisabled ? disabledClass : inactiveClass}`}
            title={title}
            type="button"
            tabIndex={editable ? 0 : -1}
            disabled={isDisabled}
          >
            <Icon className={iconClass} />
          </button>
        );
      })}
    </div>
  );
}

const FORMATTING_BUTTONS = [
  { icon: Bold, command: 'bold', title: "Bold" },
  { icon: Italic, command: 'italic', title: "Italic" },
  { icon: UnderlineIcon, command: 'underline', title: "Underline" },
  { icon: Strikethrough, command: 'strike', title: "Strikethrough" },
  { icon: Heading1, command: 'heading-1', title: "Heading 1", exec: (ed: Editor) => ed.chain().focus().toggleHeading({ level: 1 }).run(), isActive: (ed: Editor) => ed.isActive('heading', { level: 1 }) },
  { icon: Heading2, command: 'heading-2', title: "Heading 2", exec: (ed: Editor) => ed.chain().focus().toggleHeading({ level: 2 }).run(), isActive: (ed: Editor) => ed.isActive('heading', { level: 2 }) },
  { icon: Heading3, command: 'heading-3', title: "Heading 3", exec: (ed: Editor) => ed.chain().focus().toggleHeading({ level: 3 }).run(), isActive: (ed: Editor) => ed.isActive('heading', { level: 3 }) },
  { icon: List, command: 'bulletList', title: "Bulleted List" },
  { icon: ListOrdered, command: 'orderedList', title: "Ordered List" },
  { icon: Quote, command: 'blockquote', title: "Blockquote" },
  { icon: Code, command: 'codeBlock', title: "Code Block" },
];

const ACTION_BUTTONS = [
  { icon: Undo2, command: 'undo', title: "Undo", exec: (ed: Editor) => ed.chain().focus().undo().run(), canExec: (ed: Editor) => ed.can().undo() },
  { icon: Redo2, command: 'redo', title: "Redo", exec: (ed: Editor) => ed.chain().focus().redo().run(), canExec: (ed: Editor) => ed.can().redo() },
];

const CanvasTextEditor: React.FC<Props> = ({ documentId, documentVersion , onSave, onClose, isStreaming = false }) => {
  const { getDocument, getDocumentVersion, getVersionMetaList, loading: documentLoading, error: documentError } = useDocuments();
  
  const [transitionOpacity, setTransitionOpacity] = useState(1);
  const [currentDocumentId, setCurrentDocumentId] = useState(documentId);
  
  const [editable, setEditable] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [content, setContent] = useState('');
  const [pristine, setPristine] = useState<EditorDocumentContent>({
    title: '',
    content: '',
    extra: {}
  });
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [isStreamingActive, setIsStreamingActive] = useState(false);
  const [documentNotFound, setDocumentNotFound] = useState(false);
  const [documentFetched, setDocumentFetched] = useState(false);
  const [versions, setVersions] = useState<{ version_number: number; created_at: string; created_by: string; change_summary?: string; }[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);
  const [isViewingVersion, setIsViewingVersion] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const [dropdownButtonRef, setDropdownButtonRef] = useState<HTMLButtonElement | null>(null);

  // Auto-save states
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const [countdownTimer, setCountdownTimer] = useState<NodeJS.Timeout | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [shouldAutoSave, setShouldAutoSave] = useState(false);
  
  // Ref to prevent duplicate saves and toasts
  const isSavingRef = useRef(false);
  const autoSaveToastShownRef = useRef(false);

  const estimatedReadTime = estimateReadingTime(content);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      Link.configure({ openOnClick: false }),
      TextStyle,
      Heading.configure({ levels: [1, 2, 3] }),
    ],
    content: content,
    editable: editable,
    onUpdate: ({ editor }) => setContent(editor.getHTML()),
    autofocus: true,
    editorProps: {
      attributes: {
        class: editable
          ? 'tiptap-editor dark w-full min-h-[180px] bg-transparent text-zinc-100 focus:outline-none transition-opacity duration-300'
          : 'tiptap-editor dark w-full min-h-[180px] bg-transparent text-zinc-100 pointer-events-none select-text transition-opacity duration-300',
        spellCheck: 'true',
        autoCorrect: 'on',
        autoCapitalize: 'sentences'
      }
    },
    immediatelyRender: false
  });

  // Smooth document transition when documentId changes
  useEffect(() => {
    if (documentId !== currentDocumentId && currentDocumentId) {
      setTransitionOpacity(0);
      
      // Small delay to allow fade out
      const transitionTimer = setTimeout(() => {
        // Reset states for new document
        setEditable(false);
        setTitle('');
        setCategory('');
        setTags([]);
        setNewTag('');
        setContent('');
        setPristine({
          title: '',
          content: '',
          extra: {}
        });
        setHasUnsaved(false);
        setIsStreamingActive(false);
        setDocumentNotFound(false);
        setDocumentFetched(false);
        setVersions([]);
        setCurrentVersion(null);
        setIsVersionDropdownOpen(false);
        setIsViewingVersion(false);
        setDropdownPosition(null);
        
        // Clear editor content smoothly
        if (editor) {
          editor.commands.setContent('');
        }
        
        setCurrentDocumentId(documentId);
        
        // Fade back in
        setTimeout(() => {
          setTransitionOpacity(1);
        }, 50);
      }, 200);

      return () => clearTimeout(transitionTimer);
    } else if (!currentDocumentId) {
      setCurrentDocumentId(documentId);
    }
  }, [documentId, currentDocumentId, editor]);

  // Fetch document data when currentDocumentId or documentVersion changes
  useEffect(() => {
    const fetchDocument = async () => {
      if (!currentDocumentId) {
        setDocumentFetched(false);
        return;
      }
      
      try {
        let doc;
        let isVersionedView = false;
        
        // Check if we need to fetch a specific version
        if (documentVersion !== undefined && documentVersion !== null) {
          // Fetch specific version
          const versionDoc = await getDocumentVersion(currentDocumentId, documentVersion);
          if (versionDoc) {
            doc = {
              id: versionDoc.document_id,
              user_id: '', // Not needed for display
              version_number: versionDoc.version_number,
              title: versionDoc.title,
              content: versionDoc.content,
              extra: versionDoc.extra,
              created_at: versionDoc.created_at,
              updated_at: versionDoc.created_at
            };
            isVersionedView = true;
            setCurrentVersion(documentVersion);
          }
        } else {
          // Fetch latest version - reset currentVersion to null first
          setCurrentVersion(null);
          doc = await getDocument(currentDocumentId);
          isVersionedView = false;
        }
        
        if (doc) {
          setTitle(doc.title || '');
          setCategory(doc.extra?.category || '');
          setTags(doc.extra?.tags || []);
          setContent(doc.content || '');
          
          const documentContent = {
            title: doc.title || '',
            content: doc.content || '',
            extra: {
              estimatedReadTime: doc.extra?.estimatedReadTime,
              category: doc.extra?.category,
              tags: doc.extra?.tags
            }
          };
          setPristine(documentContent);
          setDocumentNotFound(false);
          setDocumentFetched(true);
          setIsViewingVersion(isVersionedView);

          // Update editor content without delay to prevent flickering
          if (editor) {
            editor.commands.setContent(doc.content || '', { emitUpdate: false });
          }
        } else {
          if (!isStreaming) {
            setDocumentNotFound(true);
            setDocumentFetched(true);
          }
        }
      } catch (error) {
        console.error('Error fetching document:', error);
        if (!isStreaming) {
          setDocumentNotFound(true);
          setDocumentFetched(true);
        }
      }
    };

    fetchDocument();
  }, [currentDocumentId, documentVersion, getDocument, getDocumentVersion, isStreaming, editor]);

  // Fetch versions when document loads (use currentDocumentId)
  useEffect(() => {
    const fetchVersions = async () => {
      if (!currentDocumentId || !documentFetched) return;
      
      try {
        const versionsList = await getVersionMetaList(currentDocumentId);
        setVersions(versionsList);
        
        // Set current version based on what was passed or default to latest
        if (versionsList.length > 0) {
          if (documentVersion !== undefined && documentVersion !== null) {
            // Use the specific version that was requested
            setCurrentVersion(documentVersion);
          } else {
            // Default to latest version when documentVersion is null/undefined
            const latestVersion = Math.max(...versionsList.map(v => v.version_number));
            setCurrentVersion(latestVersion);
          }
        }
      } catch (error) {
        console.error('Error fetching versions:', error);
      }
    };

    fetchVersions();
  }, [currentDocumentId, documentVersion, getVersionMetaList, documentFetched, currentVersion]);

  // Handle streaming state changes
  useEffect(() => {
    if (isStreaming) {
      setIsStreamingActive(true);
      setEditable(false);
    } else if (isStreamingActive) {
      setIsStreamingActive(false);
      const refetchDocument = async () => {
        const doc = await getDocument(currentDocumentId);
        if (doc) {
          setTitle(doc.title || '');
          setCategory(doc.extra?.category || '');
          setTags(doc.extra?.tags || []);
          setContent(doc.content || '');
          
          const documentContent = {
            title: doc.title || '',
            content: doc.content || '',
            extra: {
              estimatedReadTime: doc.extra?.estimatedReadTime,
              category: doc.extra?.category,
              tags: doc.extra?.tags
            }
          };
          setPristine(documentContent);
          
          if (editor && editor.getHTML() !== doc.content) {
            editor.commands.setContent(doc.content || '');
          }
        }
      };
      refetchDocument();
    }
  }, [isStreaming, isStreamingActive, currentDocumentId, getDocument, editor]);

  // When entering edit mode, remember pristine
  const enterEdit = () => {
    setPristine({
      title,
      extra: { category, tags },
      content
    });
    setEditable(true);
  };

  // Compare against pristine on every edit (not value, not toggling)
  useEffect(() => {
    setHasUnsaved(isDocEdited(
      { title, extra: { category, tags }, content },
      pristine
    ));
  }, [title, category, tags, content, pristine]);


  // Handle streaming state changes
  useEffect(() => {
    const isNewStreamingSession = isStreaming && !isStreamingActive;
    const isStreamingEnd = !isStreaming && isStreamingActive;
    
    // Starting a new streaming session
    if (isNewStreamingSession) {
      setTitle('Generating Document...');
      setEditable(false);
      setIsStreamingActive(true);
    }
    // Streaming has ended
    else if (isStreamingEnd) {
      setIsStreamingActive(false);
      setEditable(false);
    }
  }, [isStreaming, isStreamingActive]);


  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Auto-save: Track user activity
  const resetActivity = useCallback(() => {
    setLastActivity(Date.now());
    
    // Clear existing timers
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      setInactivityTimer(null);
    }
    if (countdownTimer) {
      clearInterval(countdownTimer);
      setCountdownTimer(null);
    }
    
    setIsCountingDown(false);
    setCountdownSeconds(0);
    setShouldAutoSave(false);
    autoSaveToastShownRef.current = false;
  }, []); // Remove dependencies that cause re-renders

  // Auto-save: Start countdown when inactive
  const startCountdown = useCallback(() => {
    setIsCountingDown(true);
    setCountdownSeconds(20);
    autoSaveToastShownRef.current = false;
    
    const timer = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          // Clear timer first
          clearInterval(timer);
          setCountdownTimer(null);
          setIsCountingDown(false);
          setCountdownSeconds(0);
          
          // Schedule auto-save to happen after render
          setShouldAutoSave(true);
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setCountdownTimer(timer);
  }, []);

  // Auto-save: Handle the actual save action outside of render cycles
  useEffect(() => {
    if (!shouldAutoSave || isSavingRef.current) return;

    const performAutoSave = async () => {
      if (!hasUnsaved || !editable || isSavingRef.current) {
        setShouldAutoSave(false);
        return;
      }

      isSavingRef.current = true;

      try {
        const updatedDoc: EditorDocumentContent = {
          title: title.trim() || 'Untitled Document',
          content,
          extra: {
            estimatedReadTime,
            category: category.trim(),
            tags: tags.filter(Boolean)
          }
        };

        onSave(updatedDoc);
        setEditable(false);
        setPristine(updatedDoc);
        
        // Show success toast only once
        if (!autoSaveToastShownRef.current) {
          autoSaveToastShownRef.current = true;
        }

        // Clear auto-save timers after successful save
        setLastActivity(Date.now());
        setIsCountingDown(false);
        setCountdownSeconds(0);

        // Re-fetch versions after save
        setTimeout(async () => {
          try {
            const versionsList = await getVersionMetaList(currentDocumentId);
            setVersions(versionsList);
            if (versionsList.length > 0) {
              const latestVersion = Math.max(...versionsList.map(v => v.version_number));
              setCurrentVersion(latestVersion);
              setIsViewingVersion(false);
            }
          } catch (error) {
            console.error('Error re-fetching versions after save:', error);
          }
        }, 1000);
      } catch (error) {
        console.error('Auto-save failed:', error);
        toast.error('Auto-save failed');
      } finally {
        isSavingRef.current = false;
        setShouldAutoSave(false);
      }
    };

    // Use setTimeout to ensure this runs after current render cycle
    const timeoutId = setTimeout(performAutoSave, 0);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [shouldAutoSave]); // Minimal dependencies

  // Auto-save: Monitor inactivity when in edit mode with unsaved changes
  useEffect(() => {
    if (!editable || !hasUnsaved || isStreaming || isStreamingActive) {
      // Clear timers if not in valid auto-save state
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        setInactivityTimer(null);
      }
      if (countdownTimer) {
        clearInterval(countdownTimer);
        setCountdownTimer(null);
      }
      setIsCountingDown(false);
      setCountdownSeconds(0);
      setShouldAutoSave(false);
      autoSaveToastShownRef.current = false;
      return;
    }

    // Clear existing inactivity timer
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }

    // Start new inactivity timer
    const timer = setTimeout(() => {
      if (hasUnsaved && editable && !isStreaming && !isStreamingActive && !isSavingRef.current) {
        startCountdown();
      }
    }, 5000); // 5 seconds of inactivity

    setInactivityTimer(timer);

    return () => {
      clearTimeout(timer);
    };
  }, [lastActivity, editable, hasUnsaved, isStreaming, isStreamingActive, startCountdown]); // Fixed dependencies

  // Auto-save: Add event listeners for user activity
  useEffect(() => {
    if (!editable || !hasUnsaved) return;

    const handleActivity = () => {
      resetActivity();
    };

    const events = ['keydown', 'keyup', 'mousedown', 'mousemove', 'touchstart', 'scroll', 'focus', 'blur'];
    
    // Add listeners to document for global activity detection
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [editable, hasUnsaved, resetActivity]);

  // Auto-save: Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (countdownTimer) clearInterval(countdownTimer);
    };
  }, [inactivityTimer, countdownTimer]);

  // Update save handler to use currentDocumentId
  const handleSave = async () => {
    if (!hasUnsaved || isSavingRef.current) return;
    
    isSavingRef.current = true;
    
    try {
      const updatedDoc: EditorDocumentContent = {
        title: title.trim() || 'Untitled Document',
        content,
        extra: {
          estimatedReadTime,
          category: category.trim(),
          tags: tags.filter(Boolean)
        }
      };
      
      await onSave(updatedDoc);
      setEditable(false);
      setPristine(updatedDoc);
      
      // Clear auto-save timers after successful save
      setLastActivity(Date.now());
      setIsCountingDown(false);
      setCountdownSeconds(0);
      setShouldAutoSave(false);
      autoSaveToastShownRef.current = false;
      
      setTimeout(async () => {
        try {
          const versionsList = await getVersionMetaList(currentDocumentId);
          setVersions(versionsList);
          if (versionsList.length > 0) {
            const latestVersion = Math.max(...versionsList.map(v => v.version_number));
            setCurrentVersion(latestVersion);
            setIsViewingVersion(false);
          }
        } catch (error) {
          console.error('Error re-fetching versions after save:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save document');
    } finally {
      isSavingRef.current = false;
    }
  };

  const handleDiscard = () => {
    setTitle(pristine.title || '');
    setCategory(pristine.extra?.category || '');
    setTags(pristine.extra?.tags || []);
    setContent(pristine.content || '');
    setEditable(false);
    if (editor) {
      editor.commands.setContent(pristine.content);
    }
    toast('Discarded changes & switched to reading mode', { icon: <ViewIcon /> });
  };

  const handleTagAdd = () => {
    const tag = newTag.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag('');
    }
  };

  const handleTagRemove = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const tryToggleEditable = () => {
    if (isStreaming || isStreamingActive) {
      toast.error('Cannot edit while document is being generated');
      return;
    }
    
    if (editable && hasUnsaved) {
      toast.error('Please save or discard changes before switching to reading mode');
      return;
    }
    
    if (editable) {
      setEditable(false);
      setTitle(pristine.title);
      setCategory(pristine.extra?.category || '');
      setTags(pristine.extra?.tags || []);
      setContent(pristine.content);
      if (editor) {
        editor.commands.setContent(pristine.content);
      }
      toast('Switched to reading mode', { icon: <ViewIcon /> });
    } else {
      enterEdit();
      toast('Switched to edit mode', { icon: <EditIcon /> });
    }
  };

  // Handle version switching
  const switchToVersion = async (versionNumber: number) => {
    if (versionNumber === currentVersion) return;
    
    if (editable && hasUnsaved) {
      toast.error('Please save or discard changes before switching versions');
      return;
    }

    try {
      const isLatestVersion = versionNumber === Math.max(...versions.map(v => v.version_number));
      
      if (isLatestVersion) {
        // Switch to live/latest version
        const doc = await getDocument(currentDocumentId);
        if (doc) {
          setTitle(doc.title || '');
          setCategory(doc.extra?.category || '');
          setTags(doc.extra?.tags || []);
          setContent(doc.content || '');
          
          const documentContent = {
            title: doc.title || '',
            content: doc.content || '',
            extra: {
              estimatedReadTime: doc.extra?.estimatedReadTime,
              category: doc.extra?.category,
              tags: doc.extra?.tags
            }
          };
          setPristine(documentContent);
          
          if (editor && editor.getHTML() !== doc.content) {
            editor.commands.setContent(doc.content || '');
          }
          setIsViewingVersion(false);
        }
      } else {
        // Switch to specific version
        const versionDoc = await getDocumentVersion(currentDocumentId, versionNumber);
        if (versionDoc) {
          setTitle(versionDoc.title || '');
          setCategory(versionDoc.extra?.category || '');
          setTags(versionDoc.extra?.tags || []);
          setContent(versionDoc.content || '');
          
          const documentContent = {
            title: versionDoc.title || '',
            content: versionDoc.content || '',
            extra: {
              estimatedReadTime: versionDoc.extra?.estimatedReadTime,
              category: versionDoc.extra?.category,
              tags: versionDoc.extra?.tags
            }
          };
          setPristine(documentContent);
          
          if (editor && editor.getHTML() !== versionDoc.content) {
            editor.commands.setContent(versionDoc.content || '');
          }
          setIsViewingVersion(true);
        }
      }
      
      setCurrentVersion(versionNumber);
      setEditable(false);
      setIsVersionDropdownOpen(false);
      
      const latestVersion = Math.max(...versions.map(v => v.version_number));
      const isLatest = versionNumber === latestVersion;
      toast.success(`Switched to ${isLatest ? 'latest version' : `version ${versionNumber}`}`);
    } catch (error) {
      console.error('Error switching version:', error);
      toast.error('Failed to switch version');
    }
  };

  const formatVersionDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate dropdown position when it opens
  useEffect(() => {
    if (isVersionDropdownOpen && dropdownButtonRef) {
      const rect = dropdownButtonRef.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8, // 8px gap (mt-2)
        right: window.innerWidth - rect.right
      });
    } else {
      setDropdownPosition(null);
    }
  }, [isVersionDropdownOpen, dropdownButtonRef]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isVersionDropdownOpen && dropdownButtonRef && !dropdownButtonRef.contains(event.target as Node)) {
        const dropdown = document.getElementById('version-dropdown-portal');
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setIsVersionDropdownOpen(false);
        }
      }
    };

    if (isVersionDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVersionDropdownOpen, dropdownButtonRef]);

  if (documentNotFound) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-zinc-900 to-gray-800 rounded-xl shadow-xl border border-zinc-800">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-red-400 mb-2">Document not found</div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (documentLoading) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-zinc-900 to-gray-800 rounded-xl shadow-xl border border-zinc-800">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading document...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state during streaming when document doesn't exist yet
  if ((isStreaming || isStreamingActive) && (!documentFetched || (!title && !content))) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-zinc-900 to-gray-800 rounded-xl shadow-xl border border-zinc-800">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full mb-4">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-blue-300 text-sm font-medium">
                {documentFetched ? "Generating document..." : "Preparing document..."}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-zinc-900 to-gray-800 rounded-xl shadow-xl border border-zinc-800 transition-all duration-300"
      style={{ opacity: transitionOpacity }}
    >
      {/* HEADER */}
      <div className="border-b bg-gray-800/60 backdrop-blur-xl rounded-t-xl border-gray-700 p-6 transition-all duration-300">
        <div className="flex items-center justify-between gap-4">
          {editable ? (
            <input
              className="text-2xl font-extrabold text-white bg-transparent outline-none border-b-2 border-transparent focus:border-indigo-400 transition-all duration-300 w-full max-w-lg"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Untitled Document"
              spellCheck={false}
            />
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-2xl font-extrabold text-indigo-100 tracking-wide mb-1 select-text break-words transition-all duration-300">
                {title || "Untitled Document"}
              </div>
              {(isStreaming || isStreamingActive) && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full animate-fade-in">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-blue-300 text-sm font-medium">Generating...</span>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center space-x-2">
            {/* Version Dropdown - Only show in read mode and when versions exist */}
            {!editable && versions.length > 0 && !isStreaming && !isStreamingActive && (
              <div className="relative">
                <button
                  ref={setDropdownButtonRef}
                  onClick={() => setIsVersionDropdownOpen(!isVersionDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 rounded-lg border border-zinc-600 hover:border-zinc-500 transition-all text-sm"
                  disabled={isStreaming || isStreamingActive}
                >
                  <History className="w-4 h-4" />
                  <span>
                    {versions.length > 0 && currentVersion === Math.max(...versions.map(v => v.version_number)) 
                      ? 'Latest' 
                      : currentVersion ? `v${currentVersion}` : 'Latest'
                    }
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isVersionDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )}
            <button
              onClick={tryToggleEditable}
              disabled={isStreaming || isStreamingActive || isViewingVersion}
              className={`flex items-center rounded-lg px-3 py-2 font-semibold text-sm transition-colors ${
                isStreaming || isStreamingActive || isViewingVersion
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-60'
                  : editable
                  ? 'bg-gray-700 hover:bg-gray-800 text-white'
                  : 'bg-indigo-700 hover:bg-indigo-800 text-white'
              }`}
              title={
                isStreaming || isStreamingActive 
                  ? "Cannot edit while generating" 
                  : isViewingVersion
                  ? "Cannot edit version - switch to latest first"
                  : editable 
                  ? "Switch to Read Mode" 
                  : "Edit Document"
              }
            >
              {editable ? <ViewIcon className="w-5 h-5 mr-2" /> : <EditIcon className="w-5 h-5 mr-2" />}
              {editable ? "Read" : "Edit"}
            </button>
            {editable && (
              <>
                <button
                  onClick={handleSave}
                  disabled={!hasUnsaved}
                  className={`px-3 py-2 text-white rounded-lg transition-colors flex items-center space-x-2 text-sm ${
                    hasUnsaved ? 'bg-green-600 hover:bg-green-700 cursor-pointer' : 'bg-gray-600 cursor-not-allowed opacity-60'
                  }`}
                  type="button"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={handleDiscard}
                  disabled={!hasUnsaved}
                  className={`px-3 py-2 rounded-lg text-white text-sm transition-colors ${
                    hasUnsaved ? 'bg-red-700 hover:bg-red-800 cursor-pointer' : 'bg-gray-600 cursor-not-allowed opacity-60'
                  }`}
                  type="button"
                >
                  Discard
                </button>
              </>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg cursor-pointer"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-2 mt-5 transition-all duration-300">
          {editable ? (
            <input
              className="px-2 py-1 bg-blue-600 text-blue-100 text-xs rounded-full max-w-xs outline-none border border-transparent focus:border-blue-200 transition"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="Add category"
              spellCheck={false}
            />
          ) : (
            category && (
              <span className="px-2 py-1 bg-blue-700 text-blue-100 text-xs rounded-full font-semibold">{category}</span>
            )
          )}
          {tags.map(tag => (
            <span key={tag} className="px-2 py-1 bg-indigo-700 text-indigo-100 text-xs rounded-full flex items-center shadow-md">
              #{tag}
              {editable && (
                <button
                  className="ml-1 cursor-pointer active:scale-90"
                  style={{ lineHeight: 0 }}
                  onClick={() => handleTagRemove(tag)}
                  title="Remove"
                >
                  <TagRemove className="w-3 h-3 " />
                </button>
              )}
            </span>
          ))}
          {editable && (
            <>
              <input
                className="px-2 py-1 text-xs bg-gray-800 text-gray-200 rounded-full outline-none border border-transparent focus:border-blue-200 transition"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                placeholder="Add tag"
                onKeyDown={e => (e.key === 'Enter' ? (handleTagAdd(), e.preventDefault()) : undefined)}
                spellCheck={false}
              />
              <button
                className="ml-1 px-2 py-1 bg-indigo-700 hover:bg-indigo-800 text-white rounded-full text-xs cursor-pointer active:scale-90"
                title="Add tag"
                onClick={handleTagAdd}
                disabled={!newTag.trim()}
                type="button"
              >
                <Add className="w-3 h-3 " />
              </button>
            </>
          )}
        </div>
        <div className="flex mt-5 text-sm text-gray-400 items-center transition-all duration-300">
           <div className="flex items-center gap-2 px-3 py-1 bg-green-600/20 border border-green-500/30 rounded-full mx-1">
              <Book className="w-4 h-4 text-green-300" />
              <span className="text-green-300 text-sm font-medium">Reading Time: {estimatedReadTime}</span>
            </div>
              {isViewingVersion && (
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-600/20 border border-amber-500/30 rounded-full mx-1">
                  <History className="w-4 h-4 text-amber-300" />
                  <span className="text-amber-300 text-sm font-medium">Viewing Version {currentVersion}</span>
                </div>
              )}
        </div>
      </div>

      {/* Rich Text Editor Scrollable Main */}
      <div className="flex flex-col flex-1 min-h-0 transition-all duration-300">
        {editable && 
          <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 transition-all duration-300">
            <MenuBar editor={editor} editable={editable} />
          </div>
        }
        <div className={`${editable ? '' : 'select-text'} px-4 pt-6 pb-2 flex-1 min-h-0 overflow-y-auto transition-all duration-300`}>
          <div style={{ opacity: transitionOpacity }}>
            <EditorContent editor={editor} />
          </div>
        </div>
        <div className="border-t border-zinc-800 px-4 py-2 bg-zinc-900 rounded-b-lg shrink-0">
          <div className="flex justify-between items-center text-sm text-zinc-400">
            <div>
              {isStreaming || isStreamingActive ? (
                <span className="text-blue-300 flex items-center animate-pulse">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-300 mr-2" />
                  Generating content...
                </span>
              ) : !editable ? (
                <span className="italic text-zinc-400">Read mode</span>
              ) : editable && hasUnsaved ? (
                <span className="text-yellow-300 flex items-center animate-pulse">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-300 mr-2" />
                  Unsaved changes
                </span>
              ) : null}
            </div>
            
            {/* Auto-save countdown timer */}
            {isCountingDown && editable && hasUnsaved && (
              <div className="flex items-center gap-2 px-3 py-1 bg-orange-600/20 border border-orange-500/30 rounded-full animate-pulse">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                <span className="text-orange-300 text-sm font-medium">
                  Auto-saving in {countdownSeconds}s
                </span>
                <button
                  onClick={resetActivity}
                  className="text-orange-300 hover:text-orange-100 transition-colors"
                  title="Cancel auto-save"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Version Dropdown Portal - Rendered at document level */}
      {isVersionDropdownOpen && dropdownPosition && typeof window !== 'undefined' && createPortal(
        <div
          id="version-dropdown-portal"
          className="fixed w-80 bg-zinc-950 border border-zinc-700 rounded-lg shadow-2xl max-h-64 overflow-y-auto backdrop-blur-sm z-[99999]"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`
          }}
        >
          <div className="p-2">
            <div className="text-xs text-zinc-400 px-2 py-1 border-b border-zinc-700 mb-1">
              Document Versions
            </div>
            {versions
              .sort((a, b) => b.version_number - a.version_number)
              .map((version) => {
                const isLatest = version.version_number === Math.max(...versions.map(v => v.version_number));
                const isCurrent = version.version_number === currentVersion;
                return (
                  <button
                    key={version.version_number}
                    onClick={() => switchToVersion(version.version_number)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm ${
                      isCurrent
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'hover:bg-zinc-800/80 text-zinc-300 hover:text-zinc-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          Version {version.version_number}
                        </span>
                        {isLatest && (
                          <span className="px-2 py-0.5 bg-green-600/20 text-green-300 text-xs rounded-full border border-green-500/30">
                            Latest
                          </span>
                        )}
                      </div>
                      {isCurrent && (
                        <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                      {formatVersionDate(version.created_at)}
                    </div>
                    {version.change_summary && (
                      <div className="text-xs text-zinc-500 mt-1 truncate">
                        {version.change_summary}
                      </div>
                    )}
                  </button>
                );
              })}
          </div>
        </div>,
        document.body
      )}

      {/* Enhanced Styles with transitions */}
      <style>{`
        .tiptap-editor p, .tiptap-editor ul, .tiptap-editor ol, .tiptap-editor blockquote, .tiptap-editor pre, .tiptap-editor h1, .tiptap-editor h2, .tiptap-editor h3 {
          margin: 0;
          padding: 8px 0;
          transition: all 0.3s ease;
        }
        .tiptap-editor ul { list-style-type: disc; padding-left: 1.15em; }
        .tiptap-editor ol { list-style-type: decimal; padding-left: 1.2em; }
        .tiptap-editor li { margin: 4px 0; }
        .tiptap-editor h1 { font-size: 2em; font-weight: bold; }
        .tiptap-editor h2 { font-size: 1.5em; font-weight: bold; }
        .tiptap-editor h3 { font-size: 1.25em; font-weight: bold; }
        .tiptap-editor blockquote { border-left: 3px solid #6366f1; padding-left: 1em; color: #a5b4fc; font-style: italic;}
        .tiptap-editor pre { background: #232324; color: #facc15; border-radius: 6px; padding: 12px; }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .transition-all {
          transition-property: all;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
};

export default CanvasTextEditor;
