"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Unlink } from "lucide-react";
import { cn } from "@/components/ui";

export function RichText({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true } })],
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { class: "rich-body min-h-[220px] px-4 py-3 outline-none" } },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
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

  if (!editor) return <div className="min-h-[264px] rounded-lg border border-[var(--line)] bg-white" />;

  const tools = [
    { icon: Heading2, label: "Heading", active: state?.h2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: Heading3, label: "Subheading", active: state?.h3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { icon: Bold, label: "Bold", active: state?.bold, run: () => editor.chain().focus().toggleBold().run() },
    { icon: Italic, label: "Italic", active: state?.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { icon: List, label: "Bullet list", active: state?.bullet, run: () => editor.chain().focus().toggleBulletList().run() },
    { icon: ListOrdered, label: "Numbered list", active: state?.ordered, run: () => editor.chain().focus().toggleOrderedList().run() },
    { icon: Quote, label: "Quote", active: state?.quote, run: () => editor.chain().focus().toggleBlockquote().run() },
    {
      icon: state?.link ? Unlink : Link2,
      label: state?.link ? "Remove link" : "Link",
      active: state?.link,
      run: () => {
        if (editor.isActive("link")) return editor.chain().focus().unsetLink().run();
        const href = window.prompt("Link address");
        if (href) editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
      },
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white focus-within:ring-2 focus-within:ring-[#0b6e4f]">
      <div className="flex flex-wrap gap-0.5 border-b border-[var(--line)] bg-[#f9fafb] p-1">
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.label}
            aria-label={tool.label}
            onClick={tool.run}
            className={cn("rounded-md p-2 text-[#475467] hover:bg-white", tool.active && "bg-white text-[#0b6e4f] shadow-[inset_0_0_0_1px_#cfe5db]")}
          >
            <tool.icon size={16} />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
