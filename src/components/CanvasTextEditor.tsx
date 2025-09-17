import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
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
} from 'react-icons/md';
import {
  RiH1 as Heading1,
  RiH2 as Heading2,
  RiH3 as Heading3
} from 'react-icons/ri';
import { toast } from 'sonner';

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
  value: EditorDocumentContent;
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

const CanvasTextEditor: React.FC<Props> = ({ value, onSave, onClose, isStreaming = false }) => {
  const [editable, setEditable] = useState(false);
  const [title, setTitle] = useState(value.title || '');
  const [category, setCategory] = useState(value.extra?.category || '');
  const [tags, setTags] = useState<string[]>(value.extra?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [content, setContent] = useState(value.content || '');
  const [pristine, setPristine] = useState<EditorDocumentContent>(value);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [isStreamingActive, setIsStreamingActive] = useState(false);

  const estimatedReadTime = estimateReadingTime(content);

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
          ? 'tiptap-editor dark w-full min-h-[180px] bg-transparent text-zinc-100 focus:outline-none'
          : 'tiptap-editor dark w-full min-h-[180px] bg-transparent text-zinc-100 pointer-events-none select-text',
        spellCheck: 'true',
        autoCorrect: 'on',
        autoCapitalize: 'sentences'
      }
    },
    immediatelyRender: false
  });

    // Handle both regular updates and streaming updates
  useEffect(() => {
    const isNewStreamingSession = isStreaming && !isStreamingActive;
    const isStreamingUpdate = isStreaming && isStreamingActive;
    const isStreamingEnd = !isStreaming && isStreamingActive;
    
    // Starting a new streaming session
    if (isNewStreamingSession) {
      setTitle(value.title || 'Generating Document...');
      setCategory(value.extra?.category || '');
      setTags(value.extra?.tags || []);
      setContent(value.content || '');
      setEditable(false);
      setIsStreamingActive(true);
      
      if (editor && editor.getHTML() !== value.content) {
        editor.commands.setContent(value.content || '');
      }
    }
    // Continuing streaming updates
    else if (isStreamingUpdate) {
      setTitle(value.title || 'Generating Document...');
      setCategory(value.extra?.category || '');
      setTags(value.extra?.tags || []);
      setContent(value.content || '');
      
      if (editor && editor.getHTML() !== value.content) {
        editor.commands.setContent(value.content || '');
      }
    }
    // Streaming has ended
    else if (isStreamingEnd) {
      setTitle(value.title || '');
      setCategory(value.extra?.category || '');
      setTags(value.extra?.tags || []);
      setContent(value.content || '');
      setIsStreamingActive(false);
      setPristine(value);
      
      if (editor && editor.getHTML() !== value.content) {
        editor.commands.setContent(value.content || '');
      }
    }
    // Regular document switch (not streaming)
    else if (!isStreaming && !isStreamingActive) {
      setTitle(value.title || '');
      setCategory(value.extra?.category || '');
      setTags(value.extra?.tags || []);
      setContent(value.content || '');
      setEditable(false);
      setPristine(value);
      
      if (editor && value.content !== editor.getHTML()) {
        editor.commands.setContent(value.content || '');
      }
    }
  }, [value, isStreaming, isStreamingActive, editor]);


  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  const handleSave = () => {
    if (!hasUnsaved) return;
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

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-zinc-900 to-gray-800 rounded-xl shadow-xl border border-zinc-800">
      {/* HEADER */}
      <div className="border-b bg-gray-800/60 backdrop-blur-xl rounded-t-xl border-gray-700 p-6">
        <div className="flex items-center justify-between gap-4">
          {editable ? (
            <input
              className="text-2xl font-extrabold text-white bg-transparent outline-none border-b-2 border-transparent focus:border-indigo-400 transition w-full max-w-lg"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Untitled Document"
              spellCheck={false}
            />
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-2xl font-extrabold text-indigo-100 tracking-wide mb-1 select-text break-words">
                {title || "Untitled Document"}
              </div>
              {(isStreaming || isStreamingActive) && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full">
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
            <button
              onClick={tryToggleEditable}
              disabled={isStreaming || isStreamingActive}
              className={`flex items-center rounded-lg px-3 py-2 font-semibold text-sm transition-colors ${
                isStreaming || isStreamingActive
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-60'
                  : editable
                  ? 'bg-gray-700 hover:bg-gray-800 text-white'
                  : 'bg-indigo-700 hover:bg-indigo-800 text-white'
              }`}
              title={
                isStreaming || isStreamingActive 
                  ? "Cannot edit while generating" 
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
        <div className="flex items-center flex-wrap gap-2 mt-5">
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
        <div className="flex mt-5 text-sm text-gray-400">
          <span className="font-bold pr-2">Reading Time:</span>
          <span>{estimatedReadTime}</span>
        </div>
      </div>

      {/* Rich Text Editor Scrollable Main */}
      <div className="flex flex-col flex-1 min-h-0">
          {
            editable && 
            <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2">
               <MenuBar editor={editor} editable={editable} />
            </div>
          }
        <div className={`${editable ? '' : 'select-text'} px-4 pt-6 pb-2 flex-1 min-h-0 overflow-y-auto`}>
          <EditorContent editor={editor} />
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
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .tiptap-editor p, .tiptap-editor ul, .tiptap-editor ol, .tiptap-editor blockquote, .tiptap-editor pre, .tiptap-editor h1, .tiptap-editor h2, .tiptap-editor h3 {
          margin: 0;
          padding: 8px 0;
        }
        .tiptap-editor ul { list-style-type: disc; padding-left: 1.15em; }
        .tiptap-editor ol { list-style-type: decimal; padding-left: 1.2em; }
        .tiptap-editor li { margin: 4px 0; }
        .tiptap-editor h1 { font-size: 2em; font-weight: bold; }
        .tiptap-editor h2 { font-size: 1.5em; font-weight: bold; }
        .tiptap-editor h3 { font-size: 1.25em; font-weight: bold; }
        .tiptap-editor blockquote { border-left: 3px solid #6366f1; padding-left: 1em; color: #a5b4fc; font-style: italic;}
        .tiptap-editor pre { background: #232324; color: #facc15; border-radius: 6px; padding: 12px; }
      `}</style>
    </div>
  );
};

export default CanvasTextEditor;
