import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import python from "react-syntax-highlighter/dist/cjs/languages/prism/python";
import bash from "react-syntax-highlighter/dist/cjs/languages/prism/bash";
import yaml from "react-syntax-highlighter/dist/cjs/languages/prism/yaml";
import json from "react-syntax-highlighter/dist/cjs/languages/prism/json";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import type { Components } from "react-markdown";

SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("yaml", yaml);
SyntaxHighlighter.registerLanguage("json", json);

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  if (!content) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-3/4"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-5/6"></div>
      </div>
    );
  }

  const components: Components = {
    h1: ({ children }) => (
      <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-12 mb-6">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mt-10 mb-5">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground mt-8 mb-4">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="font-body text-muted-foreground leading-relaxed mb-5">
        {children}
      </p>
    ),
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "";
      const isInline = !className;

      if (isInline) {
        return (
          <code
            className="font-mono text-sm px-1.5 py-0.5 rounded bg-muted text-foreground"
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <div className="my-6 rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 text-xs font-mono text-muted-foreground border-b border-border flex items-center justify-between">
            <span>{language || "code"}</span>
          </div>
          <SyntaxHighlighter
            style={oneDark}
            language={language || "text"}
            PreTag="div"
            className="!my-0 !rounded-none !bg-[#282c34]"
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      );
    },
    pre: ({ children }) => <>{children}</>,
    ul: ({ children }) => (
      <ul className="font-body text-muted-foreground list-disc list-inside mb-5 space-y-2">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="font-body text-muted-foreground list-decimal list-inside mb-5 space-y-2">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">{children}</li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-primary/40 pl-5 my-6 italic text-muted-foreground font-body">
        {children}
      </blockquote>
    ),
    a: ({ children, href }) => (
      <a
        href={href}
        className="text-primary hover:underline transition-colors"
        target={href?.startsWith("http") ? "_blank" : undefined}
        rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    ),
    hr: () => <hr className="my-10 border-border" />,
    table: ({ children }) => (
      <div className="my-6 overflow-x-auto">
        <table className="w-full border-collapse font-body">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-muted/50">{children}</thead>
    ),
    th: ({ children }) => (
      <th className="border border-border px-4 py-3 text-left font-display font-semibold text-foreground">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-border px-4 py-3 text-muted-foreground">
        {children}
      </td>
    ),
    strong: ({ children }) => (
      <strong className="text-foreground font-semibold">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
