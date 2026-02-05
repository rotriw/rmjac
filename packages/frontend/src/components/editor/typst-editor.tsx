"use client"

import React, { useEffect, useRef, useState } from "react"
import Editor, { OnMount } from "@monaco-editor/react"
import * as monaco from "monaco-editor"
import {
  setDiagnosticHandler,
  createPreviewTask,
  updateFileContent,
  getCompletion,
  getHover,
  openDocument,
  changeDocument,
  sendPreviewMessage,
  compileDocument
} from "@/lib/typst-lsp"

const DEFAULT_URI = "file:///main.typ"
const DIAG_MARKER_OWNER = "tinymist"
let typstHoverProviderRegistered = false

type LspPosition = { line: number; character: number }
type LspRange = { start: LspPosition; end: LspPosition }

interface TypstEditorProps {
  value: string
  onChange: (value: string) => void
  height?: string | number
  className?: string
  onRender?: (svg: string) => void
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => void
  onScroll?: (scrollTop: number, percentage?: number) => void
}

export function TypstEditor({ value, onChange, onRender, height = "300px", className = "", onMount, onScroll }: TypstEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const lspInitializedRef = useRef<Record<string, boolean>>({})
  const versionRef = useRef<Record<string, number>>({})
  const [taskId] = useState<string>("typst-main")
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    onMount?.(editor, monaco)

    editor.onDidScrollChange((e) => {
      if (onScroll) {
        const scrollHeight = editor.getScrollHeight()
        const clientHeight = editor.getLayoutInfo().height
        const scrollTop = e.scrollTop
        const maxScrollTop = scrollHeight - clientHeight
        const scrollPercentage = maxScrollTop > 0 ? scrollTop / maxScrollTop : 0
        
        onScroll(scrollTop, scrollPercentage)
      }
    })

    // Ensure the editor model uses a stable URI so diagnostics can bind to it.
    // `@monaco-editor/react` sometimes creates an in-memory model even when `path` is set.
    const mainUri = monaco.Uri.parse(DEFAULT_URI)
    const existingMainModel = monaco.editor.getModel(mainUri)
    const mainModel =
      existingMainModel ?? monaco.editor.createModel(value ?? "", "typst", mainUri)

    if (editor.getModel()?.uri.toString() !== DEFAULT_URI) {
      editor.setModel(mainModel)
    }

    // 设置诊断处理
    setDiagnosticHandler((uri, diagnostics) => {
      console.log('收到诊断信息:', uri, diagnostics);
      const uriStr = typeof uri === "string" ? uri : String(uri)

      // tinymist may publish diagnostics with different-but-equivalent URIs.
      // Example: `file:///typst/main.typ` vs our editor URI `file:///main.typ`.
      const isEntryDoc = uriStr === DEFAULT_URI || uriStr.endsWith("/main.typ")
      if (!isEntryDoc) return

      const model =
        monaco.editor.getModel(monaco.Uri.parse(DEFAULT_URI)) ??
        editor.getModel();
      if (!model) return;
      
      // 确保诊断信息对应当前文件
      // 注意：uri 可能是 file:///typst/main.typ
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markers = diagnostics.map((d: any) => {
        // 处理不同的诊断信息格式
        let startLine = 0;
        let startChar = 0;
        let endLine = 0;
        let endChar = 0;
        
        if (d.range) {
          startLine = d.range.start.line || 0;
          startChar = d.range.start.character || 0;
          endLine = d.range.end.line || 0;
          endChar = d.range.end.character || 0;
        } else if (d.position) {
          // 如果没有范围信息，只有位置信息
          startLine = d.position.line || 0;
          startChar = d.position.character || 0;
          endLine = startLine;
          endChar = startChar;
        }
        
        return {
          startLineNumber: startLine + 1,
          startColumn: startChar + 1,
          endLineNumber: endLine + 1,
          endColumn: endChar + 1,
          message: d.message || '未知错误',
          severity: d.severity === 1 ? monaco.MarkerSeverity.Error :
                   d.severity === 2 ? monaco.MarkerSeverity.Warning :
                   d.severity === 3 ? monaco.MarkerSeverity.Info :
                   monaco.MarkerSeverity.Warning,
        };
      });
      
      console.log('设置标记:', markers);
      monaco.editor.setModelMarkers(model, DIAG_MARKER_OWNER, markers);
    });

    // Register Typst language if not already registered
    if (!monaco.languages.getLanguages().some(lang => lang.id === 'typst')) {
      monaco.languages.register({ id: 'typst' })

      // Basic syntax highlighting (very simplified)
      monaco.languages.setMonarchTokensProvider('typst', {
        tokenizer: {
          root: [
            [/[#][a-zA-Z]+/, "keyword"],
            [/[\[\]\{\}\(\)]/, "delimiter"],
            [/"[^"]*"/, "string"],
            [/\/\/.*/, "comment"],
            [/[0-9]+/, "number"],
          ]
        }
      })

      // Register Completion Item Provider
      monaco.languages.registerCompletionItemProvider('typst', {
        provideCompletionItems: async (model, position) => {
          try {
            const modelId = model.id;
            const uri = DEFAULT_URI;
            
            // 仅在第一次打开时发送 didOpen
            if (!lspInitializedRef.current[modelId]) {
              await openDocument(uri, "typst", model.getValue());
              lspInitializedRef.current[modelId] = true;
              // 初始打开后给一点时间让 LSP 处理
              await new Promise(resolve => setTimeout(resolve, 100));
            } else {
              // 后续同步使用 didChange
              const nextVersion = (versionRef.current[modelId] || 1) + 1;
              versionRef.current[modelId] = nextVersion;
              await changeDocument(uri, model.getValue(), nextVersion);
            }

            const result = await getCompletion(uri, {
              line: position.lineNumber - 1,
              character: position.column - 1,
            });

            if (!result || !result.items) return { suggestions: [] };

            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn
            };

            const suggestions = result.items.map((item: {
              label: string;
              kind?: number;
              documentation?: string | { value: string };
              insertText?: string;
              insertTextFormat?: number;
            }) => ({
              label: item.label,
              kind: item.kind || monaco.languages.CompletionItemKind.Text,
              documentation: item.documentation,
              insertText: item.insertText || item.label,
              range: range,
              insertTextRules: item.insertTextFormat === 2 ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
            }));

            return { suggestions };
          } catch (e) {
            console.error("LSP Completion error:", e);
            return { suggestions: [] };
          }
        }
      })
    }

    if (!typstHoverProviderRegistered) {
      monaco.languages.registerHoverProvider('typst', {
        provideHover: async (model, position, token) => {
          try {
            if (token.isCancellationRequested) return null

            const modelId = model.id
            const uri = DEFAULT_URI

            if (!lspInitializedRef.current[modelId]) {
              await openDocument(uri, "typst", model.getValue())
              lspInitializedRef.current[modelId] = true
              versionRef.current[modelId] = 1
            }

            const hover = await getHover(uri, {
              line: position.lineNumber - 1,
              character: position.column - 1,
            })

            if (!hover || !hover.contents) return null

            const asMarkdown = (value: string): monaco.IMarkdownString => ({ value })
            const toContents = (c: unknown): monaco.IMarkdownString[] => {
              if (typeof c === "string") return [asMarkdown(c)]
              if (Array.isArray(c)) {
                return c
                  .map((item) => {
                    if (typeof item === "string") return asMarkdown(item)
                    if (item && typeof item === "object") {
                      const it = item as Record<string, unknown>
                      if (typeof it.language === "string" && typeof it.value === "string") {
                        return asMarkdown(`\n\n\`\`\`${it.language}\n${it.value}\n\`\`\``)
                      }
                      if (typeof it.value === "string") return asMarkdown(it.value)
                    }
                    return null
                  })
                  .filter((x): x is monaco.IMarkdownString => Boolean(x))
              }
              if (c && typeof c === "object") {
                const it = c as Record<string, unknown>
                if (typeof it.value === "string") return [asMarkdown(it.value)]
              }
              return []
            }

            const contents = toContents(hover.contents)
            if (contents.length === 0) return null

            let range: monaco.IRange | undefined
            const maybeRange = (hover as { range?: unknown }).range
            if (maybeRange && typeof maybeRange === "object") {
              const r = maybeRange as Partial<LspRange>
              if (
                r.start &&
                r.end &&
                typeof r.start.line === "number" &&
                typeof r.start.character === "number" &&
                typeof r.end.line === "number" &&
                typeof r.end.character === "number"
              ) {
                range = new monaco.Range(
                  r.start.line + 1,
                  r.start.character + 1,
                  r.end.line + 1,
                  r.end.character + 1,
                )
              }
            }

            return { contents, range }
          } catch (e) {
            console.error("LSP Hover error:", e)
            return null
          }
        },
      })

      typstHoverProviderRegistered = true
    }
  }

  // 初始化预览任务
  useEffect(() => {
    const initializePreview = async () => {
      try {
        // 创建预览任务
        await createPreviewTask(taskId);
        console.log("预览任务初始化成功:", taskId);
      } catch (e) {
        console.error("预览任务初始化失败:", e);
      }
    };

    initializePreview();
  }, [taskId]);

  // Diagnostics (LSP-like error reporting) and Preview
  useEffect(() => {
    const model = editorRef.current?.getModel()
    if (!model) return

    let timeoutId: NodeJS.Timeout | null = null
    let isDisposed = false

    const validate = async () => {
      if (isDisposed) return

      try {
        const modelId = model.id;
        const uri = DEFAULT_URI;

        if (!lspInitializedRef.current[modelId]) {
          console.log("LSP: didOpen", uri);
          await openDocument(uri, "typst", model.getValue());
          lspInitializedRef.current[modelId] = true;
          versionRef.current[modelId] = 1;
          // Give it a moment to process
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          // 更新文件内容
          const nextVersion = (versionRef.current[modelId] || 1) + 1;
          versionRef.current[modelId] = nextVersion;
          await changeDocument(uri, model.getValue(), nextVersion);
        }

        // 更新内存中的文件内容
        await updateFileContent("/main.typ", model.getValue());

        // 在WASM环境中编译文档并获取诊断信息
        try {
          // 清理旧 owner，避免历史残留
          monaco.editor.setModelMarkers(model, DIAG_MARKER_OWNER, []);
          await compileDocument(uri, model.getValue());
        } catch (compileError) {
          console.error("WASM编译失败:", compileError);
        }

        // 实时预览：使用新的 preview 功能
        if (onRender) {
          try {
            // 发送更新消息到预览任务
            await sendPreviewMessage(taskId, {
              type: "update",
              content: model.getValue()
            });
            
            console.log("预览更新消息发送成功");
          } catch (previewError) {
            console.error("预览更新失败:", previewError);
          }
        }
      } catch (e) {
        console.error("LSP Validation/Preview error:", e)
      }
    }

    // 防抖处理，减少编译频率
    const debouncedValidate = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      // 连续输入结束时编译（3-5s）
      timeoutId = setTimeout(validate, 3000)
    }

    // 监听内容变化
    const disposable = model.onDidChangeContent(() => {
      // 输入开始时停止诊断（清除之前的定时器）
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      debouncedValidate()
    })

    return () => {
      isDisposed = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      disposable.dispose()
    }
  }, [value, onRender, taskId])

  return (
    <div className={`border rounded-md overflow-hidden ${className}`}>
      <Editor
        height={height}
        language="typst"
        path={DEFAULT_URI}
        value={value}
        onChange={(val) => onChange(val || "")}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
        }}
      />
    </div>
  )
}