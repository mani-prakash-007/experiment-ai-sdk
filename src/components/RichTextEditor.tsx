import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-icons/md';

import { 
  RiH1 as Heading1,
  RiH2 as Heading2,
  RiH3 as Heading3
} from 'react-icons/ri';

type Props = {
  input: string;
  setInput: (newValue: string) => void;
};

// Function to count characters in HTML content (excluding HTML tags)
const countTextCharacters = (html: string): number => {
  // Remove HTML tags using regex
  const text = html.replace(/<[^>]*>/g, '');
  // Decode HTML entities and return character count
  const temp = document.createElement('textarea');
  temp.innerHTML = text;
  return temp.value.length;
};

const BUTTONS = [
  {
    icon: Bold,
    feature: 'bold',
    isActive: (editor: Editor) => editor.isActive('bold'),
    enable: (editor: Editor) => editor.chain().focus().setBold().run(),
    disable: (editor: Editor) => editor.chain().focus().unsetBold().run(),
    title: "Bold",
  },
  {
    icon: Italic,
    feature: 'italic',
    isActive: (editor: Editor) => editor.isActive('italic'),
    enable: (editor: Editor) => editor.chain().focus().setItalic().run(),
    disable: (editor: Editor) => editor.chain().focus().unsetItalic().run(),
    title: "Italic",
  },
  {
    icon: UnderlineIcon,
    feature: 'underline',
    isActive: (editor: Editor) => editor.isActive('underline'),
    enable: (editor: Editor) => editor.chain().focus().setUnderline().run(),
    disable: (editor: Editor) => editor.chain().focus().unsetUnderline().run(),
    title: "Underline",
  },
  {
    icon: Strikethrough,
    feature: 'strike',
    isActive: (editor: Editor) => editor.isActive('strike'),
    enable: (editor: Editor) => editor.chain().focus().setStrike().run(),
    disable: (editor: Editor) => editor.chain().focus().unsetStrike().run(),
    title: "Strikethrough",
  },
  {
    icon: Heading1,
    feature: 'heading-1',
    isActive: (editor: Editor) => editor.isActive('heading', { level: 1 }),
    enable: (editor: Editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
    disable: (editor: Editor) => editor.chain().focus().setParagraph().run(),
    title: "Heading 1",
  },
  {
    icon: Heading2,
    feature: 'heading-2',
    isActive: (editor: Editor) => editor.isActive('heading', { level: 2 }),
    enable: (editor: Editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
    disable: (editor: Editor) => editor.chain().focus().setParagraph().run(),
    title: "Heading 2",
  },
  {
    icon: Heading3,
    feature: 'heading-3',
    isActive: (editor: Editor) => editor.isActive('heading', { level: 3 }),
    enable: (editor: Editor) => editor.chain().focus().setHeading({ level: 3 }).run(),
    disable: (editor: Editor) => editor.chain().focus().setParagraph().run(),
    title: "Heading 3",
  },
  {
    icon: List,
    feature: 'bulletList',
    isActive: (editor: Editor) => editor.isActive('bulletList'),
    enable: (editor: Editor) => editor.chain().focus().toggleBulletList().run(),
    disable: (editor: Editor) => editor.chain().focus().setParagraph().run(),
    title: "Bullet List",
  },
  {
    icon: ListOrdered,
    feature: 'orderedList',
    isActive: (editor: Editor) => editor.isActive('orderedList'),
    enable: (editor: Editor) => editor.chain().focus().toggleOrderedList().run(),
    disable: (editor: Editor) => editor.chain().focus().setParagraph().run(),
    title: "Ordered List",
  },
  {
    icon: Quote,
    feature: 'blockquote',
    isActive: (editor: Editor) => editor.isActive('blockquote'),
    enable: (editor: Editor) => editor.chain().focus().setBlockquote().run(),
    disable: (editor: Editor) => editor.chain().focus().setParagraph().run(),
    title: "Blockquote",
  },
  {
    icon: Code,
    feature: 'codeBlock',
    isActive: (editor: Editor) => editor.isActive('codeBlock'),
    enable: (editor: Editor) => editor.chain().focus().setCodeBlock().run(),
    disable: (editor: Editor) => editor.chain().focus().setParagraph().run(),
    title: "Code Block",
  },
  {
    icon: Undo2,
    feature: 'undo',
    isActive: () => false,
    enable: (editor: Editor) => editor.chain().focus().undo().run(),
    disable: (_: Editor) => {},
    title: "Undo",
  },
  {
    icon: Redo2,
    feature: 'redo',
    isActive: () => false,
    enable: (editor: Editor) => editor.chain().focus().redo().run(),
    disable: (_: Editor) => {},
    title: "Redo",
  },
];

export const RichTextEditor: React.FC<Props> = ({ input, setInput }) => {
  const [stickyFeature, setStickyFeature] = useState<string | null>(null);
  const [characterCount, setCharacterCount] = useState(0);

  // Ref to scrollable editor main area
  const mainRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      Link.configure({ openOnClick: false }),
      TextStyle,
      Heading.configure({ levels: [1, 2, 3] }),
    ],
    content: input,
    editorProps: {
      attributes: {
        class: 'tiptap-editor dark w-full min-h-[180px] bg-transparent text-zinc-100 focus:outline-none',
        spellCheck: 'true',
        autoCorrect: 'on',
        autoCapitalize: 'sentences'
      },
    },
    immediatelyRender: false,
    onUpdate({ editor }) {
      const htmlContent = editor.getHTML();
      setInput(htmlContent);
      setCharacterCount(countTextCharacters(htmlContent));
    },
    autofocus: true,
  });

  // Sticky formatting logic: apply sticky formatting on every input if set
  useEffect(() => {
    if (!editor || !stickyFeature) return;
    const button = BUTTONS.find(b => b.feature === stickyFeature);
    if (!button) return;
    button.enable(editor);
  }, [editor, stickyFeature]);

  // Update editor content and character count if input changes from outside
  useEffect(() => {
    if (editor && editor.getHTML() !== input) {
      editor.commands.setContent(input);
      setCharacterCount(countTextCharacters(input));
    }
  }, [input, editor]);

  // Initialize character count on mount
  useEffect(() => {
    setCharacterCount(countTextCharacters(input));
  }, [input]);

  // Reset sticky feature when editor loses focus
  useEffect(() => {
    if (!editor) return;
    const onBlur = () => setStickyFeature(null);
    editor.on('blur', onBlur);
    return () => {
      editor.off('blur', onBlur);
    };
  }, [editor]);

  // Auto-scroll main area to bottom when input changes
  useEffect(() => {
    if (mainRef.current) {
      setTimeout(() => {
        mainRef.current!.scrollTop = mainRef.current!.scrollHeight;
      }, 0);
    }
  }, [input]);

  return (
    <div className="tiptap-root bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 relative flex flex-col h-full">
      {/* HEADER */}
      <div className="tiptap-header sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex-shrink-0">
        <MenuBar
          editor={editor}
          stickyFeature={stickyFeature}
          setStickyFeature={setStickyFeature}
        />
      </div>
      
      {/* MAIN (SCROLLABLE) */}
      <div
        ref={mainRef}
        className="tiptap-main px-4 pb-4 pt-0 flex-1 min-h-[180px] max-h-full overflow-y-auto"
        style={{ minHeight: 180, maxHeight: "100%" }}
      >
        <EditorContent editor={editor} />
      </div>
      
      {/* FOOTER */}
      <div className="tiptap-footer border-t border-zinc-800 px-4 py-2 bg-zinc-900 flex-shrink-0">
        <div className="text-sm text-zinc-400 text-right">
          {characterCount} characters
        </div>
      </div>
      
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

function MenuBar({
  editor,
  stickyFeature,
  setStickyFeature
}: {
  editor: Editor | null,
  stickyFeature?: string | null,
  setStickyFeature?: (feature: string | null) => void,
}) {
  if (!editor) return null;

  const base =
    "mx-1 p-2 rounded flex items-center justify-center transition-colors duration-150 border border-transparent";
  const active =
    "bg-indigo-700 text-white border-indigo-300 shadow-lg shadow-indigo-500/20 scale-110";
  const inactive =
    "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:border-zinc-500";
  const icon =
    "w-5 h-5";
  const iconActive =
    "text-white";
  const iconInactive =
    "text-zinc-400 group-hover:text-indigo-300";

  return (
    <div className="flex flex-wrap gap-1">
      {BUTTONS.map(({ icon: Icon, isActive, feature, enable, disable, title }) => {
        const currentlyActive = stickyFeature === feature;
        const editorActive = isActive(editor);
        
        return (
          <button
            key={title}
            onMouseDown={e => {
              e.preventDefault();
              if (!editor) return;
              
              // For undo/redo, just execute the command
              if (feature === 'undo' || feature === 'redo') {
                enable(editor);
                return;
              }
              
              // For other formatting, check if currently active and toggle appropriately
              if (currentlyActive || editorActive) {
                // Turn off sticky and formatting
                setStickyFeature?.(null);
                disable(editor);
              } else {
                // Turn on sticky and formatting
                setStickyFeature?.(feature);
                enable(editor);
              }
            }}
            className={`${base} group ${currentlyActive || editorActive ? active : inactive}`}
            title={title}
            type="button"
          >
            <Icon className={`${icon} ${currentlyActive || editorActive ? iconActive : iconInactive}`} />
          </button>
        );
      })}
    </div>
  );
}

export default RichTextEditor;
