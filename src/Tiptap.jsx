import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  MarkdownSerializer as ProseMirrorMarkdownSerializer,
  defaultMarkdownSerializer,
} from "prosemirror-markdown/src/to_markdown";
import { marked } from "marked";
import { DOMParser as ProseMirrorDOMParser } from "prosemirror-model";
import "./TipTap.css";

import Paragraph from "@tiptap/extension-paragraph";

const serializerMarks = {
  ...defaultMarkdownSerializer.marks,
};

const serializerNodes = {
  ...defaultMarkdownSerializer.nodes,
  [Paragraph.name]: defaultMarkdownSerializer.nodes.paragraph,
};

function serialize(schema, content) {
  const proseMirrorDocument = schema.nodeFromJSON(content);
  const serializer = new ProseMirrorMarkdownSerializer(
    serializerNodes,
    serializerMarks
  );

  return serializer.serialize(proseMirrorDocument, {
    tightLists: true,
  });
}

function deserialize(schema, content) {
  const html = marked.parse(content);

  if (!html) return null;

  const parser = new DOMParser();
  const { body } = parser.parseFromString(html, "text/html");

  // append original source as a comment that nodes can access
  body.append(document.createComment(content));

  const state = ProseMirrorDOMParser.fromSchema(schema).parse(body);

  return state.toJSON();
}

const starterKit = StarterKit.configure({
  blockquote: false,
  bold: false,
  bulletList: false,
  code: false,
  codeBlock: false,
  dropcursor: false,
  hardBreak: false,
  history: false,
  horizontalRule: false,
  italic: false,
  listItem: false,
  orderedList: false,
  strike: false,

  // Basically just enable headings
  paragraph: true,
  heading: true,
  text: true,
});

const Tiptap = () => {
  const [markdownInput, setMarkdownInput] = useState("");
  const [markdownOutput, setMarkdownOutput] = useState("");

  const editor = useEditor({
    extensions: [starterKit],
    content: "<h1>This is a heading</h1>\n<p>This is a paragraph</p>",
    onCreate({ editor }) {
      setMarkdownOutput(serialize(editor.schema, editor.getJSON()));
    },
    onUpdate: ({ editor }) => {
      setMarkdownOutput(serialize(editor.schema, editor.getJSON()));
    },
  });

  function loadMarkdownInput() {
    const deserialized = deserialize(editor.schema, markdownInput);
    editor.commands.setContent(deserialized);
    setMarkdownInput("");
    // FIXME: setConent() doesn't trigger onUpdagte ...
    setMarkdownOutput(serialize(editor.schema, editor.getJSON()));
  }

  return (
    <div className="container">
      <h3 className="heading">TipTap editor:</h3>
      <EditorContent className="section" editor={editor} />
      <h3 className="heading">Markdown → TipTap:</h3>
      <div className="section">
        <textarea
          className="input"
          value={markdownInput}
          onChange={(e) => setMarkdownInput(e.target.value)}
        ></textarea>
        <div className="flex">
          <button
            // style={{ marginLeft: "auto", marginRight: 0 }}
            className="button"
            onClick={loadMarkdownInput}
          >
            Load
          </button>
        </div>
      </div>
      <h3 className="heading">TipTap → Markdown</h3>
      <pre className="section">{markdownOutput}</pre>
    </div>
  );
};

export default Tiptap;
