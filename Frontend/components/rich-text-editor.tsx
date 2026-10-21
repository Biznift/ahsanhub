"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Unlink } from "lucide-react";
import { cn } from "@/lib/format";

export function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (html: string, textLength: number) => void; placeholder?: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true, defaultProtocol: "https" } }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { class: "prose-listing px-4 py-4 text-[15px]", "aria-label": "Description" } },
    onUpdate: ({ editor: current }) => onChange(current.getHTML(), current.getText().trim().length),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      h2: current?.isActive("heading", { level: 2 }) ?? false,
      h3: current?.isActive("heading", { level: 3 }) ?? false,
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      bullet: current?.isActive("bulletList") ?? false,
      ordered: current?.isActive("orderedList") ?? false,
      quote: current?.isActive("blockquote") ?? false,
      link: current?.isActive("link") ?? false,
    }),
  });

  const tools = editor
    ? [
        { icon: Heading2, label: "Heading", active: state?.h2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
        { icon: Heading3, label: "Subheading", active: state?.h3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
        { divider: true },
        { icon: Bold, label: "Bold", active: state?.bold, run: () => editor.chain().focus().toggleBold().run() },
        { icon: Italic, label: "Italic", active: state?.italic, run: () => editor.chain().focus().toggleItalic().run() },
        { divider: true },
        { icon: List, label: "Bullet list", active: state?.bullet, run: () => editor.chain().focus().toggleBulletList().run() },
        { icon: ListOrdered, label: "Numbered list", active: state?.ordered, run: () => editor.chain().focus().toggleOrderedList().run() },
        { icon: Quote, label: "Quote", active: state?.quote, run: () => editor.chain().focus().toggleBlockquote().run() },
        { divider: true },
        {
          icon: state?.link ? Unlink : Link2,
          label: state?.link ? "Remove link" : "Add link",
          active: state?.link,
          run: () => {
            if (editor.isActive("link")) return editor.chain().focus().unsetLink().run();
            const href = window.prompt("Link address (https://…)");
            if (href) editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
          },
        },
      ]
    : [];

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-bg transition focus-within:border-brand">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-band px-1.5 py-1.5" role="toolbar" aria-label="Formatting">
        {tools.map((tool, index) =>
          "divider" in tool ? (
            <span key={`d${index}`} className="mx-1 h-5 w-px bg-line-strong" aria-hidden="true" />
          ) : (
            <button
              key={tool.label}
              type="button"
              title={tool.label}
              aria-label={tool.label}
              aria-pressed={tool.active}
              onClick={tool.run}
              className={cn("grid h-8 w-8 place-items-center rounded-md text-ink-soft transition hover:bg-surface hover:text-ink", tool.active && "bg-surface text-brand-text shadow-[inset_0_0_0_1px_var(--brand-line)]")}
            >
              <tool.icon size={16} />
            </button>
          ),
        )}
      </div>
      {editor ? <EditorContent editor={editor} /> : <div className="min-h-[292px]" />}
    </div>
  );
}
