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
import lowlight from "lowlight";

import Paragraph from "@tiptap/extension-paragraph";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import Strike from "@tiptap/extension-strike";
import Italic from "@tiptap/extension-italic";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import HardBreak from "@tiptap/extension-hard-break";
import Code from "@tiptap/extension-code";
import Bold from "@tiptap/extension-bold";
import Blockquote from "@tiptap/extension-blockquote";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";

const tableMap = new WeakMap();

function isInTable(node) {
  return tableMap.has(node);
}

export function renderHardBreak(state, node, parent, index) {
  const br = isInTable(parent) ? "<br>" : "\\\n";
  for (let i = index + 1; i < parent.childCount; i += 1) {
    if (parent.child(i).type !== node.type) {
      state.write(br);
      return;
    }
  }
}

export function renderOrderedList(state, node) {
  const { parens } = node.attrs;
  const start = node.attrs.start || 1;
  const maxW = String(start + node.childCount - 1).length;
  const space = state.repeat(" ", maxW + 2);
  const delimiter = parens ? ")" : ".";
  state.renderList(node, space, (i) => {
    const nStr = String(start + i);
    return `${state.repeat(" ", maxW - nStr.length) + nStr}${delimiter} `;
  });
}

const serializerMarks = {
  ...defaultMarkdownSerializer.marks,
  [Bold.name]: defaultMarkdownSerializer.marks.strong,
  [Strike.name]: {
    open: "~~",
    close: "~~",
    mixable: true,
    expelEnclosingWhitespace: true,
  },
  [Italic.name]: {
    open: "_",
    close: "_",
    mixable: true,
    expelEnclosingWhitespace: true,
  },
  [Code.name]: defaultMarkdownSerializer.marks.code,
};

const serializerNodes = {
  ...defaultMarkdownSerializer.nodes,
  [Paragraph.name]: defaultMarkdownSerializer.nodes.paragraph,
  [BulletList.name]: defaultMarkdownSerializer.nodes.bullet_list,
  [ListItem.name]: defaultMarkdownSerializer.nodes.list_item,
  [HorizontalRule.name]: defaultMarkdownSerializer.nodes.horizontal_rule,
  [OrderedList.name]: renderOrderedList,
  [HardBreak.name]: renderHardBreak,
  [CodeBlockLowlight.name]: (state, node) => {
    state.write(`\`\`\`${node.attrs.language || ""}\n`);
    state.text(node.textContent, false);
    state.ensureNewLine();
    state.write("```");
    state.closeBlock(node);
  },
  [Blockquote.name]: (state, node) => {
    if (node.attrs.multiline) {
      state.write(">>>");
      state.ensureNewLine();
      state.renderContent(node);
      state.ensureNewLine();
      state.write(">>>");
      state.closeBlock(node);
    } else {
      state.wrapBlock("> ", null, node, () => state.renderContent(node));
    }
  },
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

const Tiptap = () => {
  const [markdownInput, setMarkdownInput] = useState("");
  const [markdownOutput, setMarkdownOutput] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      // FIXME: this isn't working
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    // content: "<h1>This is a heading</h1>\n<p>This is a paragraph</p>",
    content: `
        <p>
          That’s a boring paragraph followed by a fenced code block:
        </p>
        <pre><code class="language-javascript">for (var i=1; i <= 20; i++)
{
  if (i % 15 == 0)
    console.log("FizzBuzz");
  else if (i % 3 == 0)
    console.log("Fizz");
  else if (i % 5 == 0)
    console.log("Buzz");
  else
    console.log(i);
}</code></pre>
        <p>
          Press Command/Ctrl + Enter to leave the fenced code block and continue typing in boring paragraphs.
        </p>
      `,
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
