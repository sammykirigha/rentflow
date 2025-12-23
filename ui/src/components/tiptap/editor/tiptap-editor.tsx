/* eslint-disable react-hooks/refs */
"use client";

import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";

// --- Tiptap Core Extensions ---
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Placeholder, Selection } from "@tiptap/extensions";
import { StarterKit } from "@tiptap/starter-kit";

// --- UI Primitives ---
import { Button } from "@/components/tiptap/ui-primitive/button";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap/ui-primitive/toolbar";

// --- Tiptap Node ---
import { HorizontalRule } from "@/components/tiptap/node/horizontal-rule-node/horizontal-rule-node-extension";
import { ImageUploadNode } from "@/components/tiptap/node/image-upload-node/image-upload-node-extension";

import "@/components/tiptap/node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap/node/code-block-node/code-block-node.scss";
import "@/components/tiptap/node/heading-node/heading-node.scss";
import "@/components/tiptap/node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap/node/image-node/image-node.scss";
import "@/components/tiptap/node/list-node/list-node.scss";
import "@/components/tiptap/node/paragraph-node/paragraph-node.scss";

// --- Tiptap UI ---
import { BlockquoteButton } from "@/components/tiptap/ui/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap/ui/code-block-button";
import {
  ColorHighlightPopover,
  ColorHighlightPopoverButton,
  ColorHighlightPopoverContent,
} from "@/components/tiptap/ui/color-highlight-popover";
import { HeadingDropdownMenu } from "@/components/tiptap/ui/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/tiptap/ui/image-upload-button";
import {
  LinkButton,
  LinkContent,
  LinkPopover,
} from "@/components/tiptap/ui/link-popover";
import { ListDropdownMenu } from "@/components/tiptap/ui/list-dropdown-menu";
import { MarkButton } from "@/components/tiptap/ui/mark-button";
import { TextAlignButton } from "@/components/tiptap/ui/text-align-button";
import { UndoRedoButton } from "@/components/tiptap/ui/undo-redo-button";

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap/icons/arrow-left-icon";
import { HighlighterIcon } from "@/components/tiptap/icons/highlighter-icon";
import { LinkIcon } from "@/components/tiptap/icons/link-icon";

// --- Hooks ---
import { useCursorVisibility } from "@/hooks/use-cursor-visibility";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWindowSize } from "@/hooks/use-window-size";

// --- Components ---

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils";

// --- Styles ---
import "@/components/tiptap/editor/tiptap-editor.scss";
import { cn } from '@/lib/utils';


const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
}: {
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  isMobile: boolean;
}) => {
  return (
    <>
      {/* <Spacer /> */}

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
        <ListDropdownMenu
          types={["bulletList", "orderedList", "taskList"]}
          portal={isMobile}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Add" />
      </ToolbarGroup>
    </>
  );
};

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link";
  onBack: () => void;
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
);

interface Props {
  value?: string;
  onChange?: (value: { html: string, text: string; }) => void;
  showToolbar?: boolean;
  className?: string,
  containerClasses?: string,
  placeholder?: string,
}

export function TiptapEditor({ value, onChange, showToolbar, className, containerClasses }: Props) {
  const isMobile = useIsMobile();
  const { height } = useWindowSize();
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  );
  const toolbarRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
      Placeholder.configure({
        placeholder: "Start typing here...",
      }),
    ],
    content: `<p>${value || ""}</p> `,

    onUpdate({ editor }) {
      const html = editor.getHTML();
      const text = editor.getText();
      if (onChange) {
        onChange({ html, text });
      }
    },
  });

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  });

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && value !== undefined) {
      const currentContent = editor.getHTML();
      // Only update if the content is actually different to avoid unnecessary updates
      if (currentContent !== value) {
        editor.commands.setContent(value);
      }
    }
  }, [editor, value]);

  useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main");
    }
  }, [isMobile, mobileView]);

  return (
    <div className={cn("border rounded-md h-[300px] w-full overflow-x-auto", containerClasses)}>
      <div className="simple-editor-wrapper border border-border rounded-lg">
        <EditorContext.Provider value={{ editor }}>
          {
            showToolbar ? (
              <Toolbar
                ref={toolbarRef}
                style={{
                  ...(isMobile
                    ? {
                      bottom: `calc(100% - ${height - rect.y}px)`,
                    }
                    : {}),
                }}
                className='justify-start'
              >
                {mobileView === "main" ? (
                  <MainToolbarContent
                    onHighlighterClick={() => setMobileView("highlighter")}
                    onLinkClick={() => setMobileView("link")}
                    isMobile={isMobile}
                  />
                ) : (
                  <MobileToolbarContent
                    type={mobileView === "highlighter" ? "highlighter" : "link"}
                    onBack={() => setMobileView("main")}
                  />
                )}
              </Toolbar>
            ) : null
          }


          <EditorContent
            editor={editor}
            role="presentation"
            className={cn("simple-editor-content p-5", className)}
          />
        </EditorContext.Provider>
      </div>
    </div>
  );
}
