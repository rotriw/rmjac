import init, { TinymistLanguageServer, version } from "../typst/pkg/tinymist";

let lspInstance: TinymistLanguageServer | null = null;
let initPromise: Promise<TinymistLanguageServer> | null = null;

// Tinymist may internally use a different-but-equivalent URI for the main file
// (e.g. `file:///typst/main.typ`). Track it so callers can target the same URI.
let mainUriOverride: string | null = null;

export function resolveMainUri(fallbackUri: string) {
  return mainUriOverride ?? fallbackUri;
}

// Cache latest text for URIs so we can satisfy `tinymist/fs/watch`.
const textByUri = new Map<string, string>();

// A minimal CJK font fallback for PDF export. Tinymist can ingest font bytes via
// `initializationOptions.tinymist.webFontData` (base64).
const CJK_FONT_URLS: string[] = [
  // Noto Sans CJK SC Regular (OTF)
  "https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf",
];

function arrayBufferToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function queueMicrotaskCompat(fn: () => void) {
  if (typeof queueMicrotask === "function") return queueMicrotask(fn);
  void Promise.resolve().then(fn);
}

function cacheText(uri: string, text: string) {
  textByUri.set(uri, text);
  // Convenience: also store by common path for single-file workflows.
  if (uri.endsWith("/main.typ")) textByUri.set("/main.typ", text);
}

export interface RenderResult {
  svg: string;
}

export type ExportKind = "pdf" | "svg" | "png";

let exportEntryOpenedUri: string | null = null;
let exportEntryVersion = 1;

export type DiagnosticHandler = (uri: string, diagnostics: unknown[]) => void;
let diagnosticHandler: DiagnosticHandler | null = null;

export function setDiagnosticHandler(handler: DiagnosticHandler) {
  diagnosticHandler = handler;
}

// 获取或创建 Typst LSP 实例
export async function getTypstLsp() {
  if (lspInstance) return lspInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // 加载 WASM 模块
      await init("/typst/tinymist_bg.wasm");
      console.log("Tinymist version:", version());
      
      // 初始化 LSP 服务器
      let server: TinymistLanguageServer | null = null;

      const unpackMessage = (msgOrMethod: unknown, maybeParams: unknown) => {
        if (typeof msgOrMethod === "string") {
          return { method: msgOrMethod, params: maybeParams };
        }
        if (msgOrMethod && typeof msgOrMethod === "object") {
          const m = msgOrMethod as Record<string, unknown>;
          const method = typeof m.method === "string" ? m.method : "";
          const params = (m.params as unknown) ?? undefined;
          return { method, params };
        }
        return { method: "", params: undefined };
      };

      const transport = {
        sendEvent: (event: unknown) => {
          // Critical: pump server-side events back into wasm, otherwise notifications
          // (including publishDiagnostics) may never be delivered.
          console.log("LSP Event:", event);
          const eventId = typeof event === "number" ? event : (event as number);
          queueMicrotaskCompat(() => {
            try {
              server?.on_event(eventId);
            } catch (e) {
              console.error("LSP on_event failed:", e);
            }
          });
        },
        // Tinymist sends requests as a single object `{ method, params, ... }` (like the wasm demo).
        // Keep compatibility with an older `(method, params)` callback shape.
        sendRequest: (msgOrMethod: unknown, maybeParams?: unknown) => {
          const { method, params } = unpackMessage(msgOrMethod, maybeParams);
          console.log("LSP Request from server:", method, params);
          if (method === "workspace/configuration") {
            return Promise.resolve([{}]);
          }

          // Mirror the wasm demo: satisfy VFS requests by replying with tinymist/fsChange.
          if (method === "tinymist/fs/watch") {
            const p = (params ?? {}) as Record<string, unknown>;
            const inserts = Array.isArray(p.inserts) ? (p.inserts as unknown[]) : [];

            for (const u of inserts) {
              const uri = String(u);
              if (uri.endsWith("/main.typ")) mainUriOverride = uri;
            }

            queueMicrotaskCompat(() => {
              try {
                if (!server) return;
                for (const u of inserts) {
                  const uri = String(u);
                  const text = textByUri.get(uri) ?? textByUri.get("/main.typ") ?? "";
                  // Do not call back into Rust synchronously from a Rust->JS request.
                  void Promise.resolve(
                    server.on_request("tinymist/fsChange", {
                      inserts: [
                        {
                          uri,
                          content: { type: "ok", content: text },
                        },
                      ],
                      removes: [],
                    }),
                  ).catch((e) => console.error("tinymist/fsChange failed:", e));
                }
              } catch (e) {
                console.error("tinymist/fs/watch handler failed:", e);
              }
            });

            return Promise.resolve(null);
          }

          return Promise.resolve(null);
        },
        sendNotification: (msgOrMethod: unknown, maybeParams?: unknown) => {
          const { method, params } = unpackMessage(msgOrMethod, maybeParams);
          console.log("LSP Notification from server:", method, params);
          if (method === "textDocument/publishDiagnostics" && diagnosticHandler) {
            const p = (params ?? {}) as { uri?: string; diagnostics?: unknown };
            console.log("收到诊断通知:", p.uri, p.diagnostics);
            const diagnostics = Array.isArray(p.diagnostics) ? p.diagnostics : [];
            if (typeof p.uri === "string") {
              if (p.uri.endsWith("/main.typ")) mainUriOverride = p.uri;
              diagnosticHandler(p.uri, diagnostics);
            }
          }
        },
        resolveFn: async (path: string) => {
          console.log("LSP Resolve path:", path);
          if (path.startsWith("http")) {
            try {
              const resp = await fetch(path);
              if (resp.ok) {
                return new Uint8Array(await resp.arrayBuffer());
              }
            } catch (e) {
              console.error("LSP Resolve failed:", path, e);
            }
          }
          return new Uint8Array();
        },
      };

      server = new TinymistLanguageServer(transport);

      // Preload CJK fonts as base64 and provide them to tinymist.
      // This is a pragmatic workaround when built-in CJK assets are unavailable.
      const webFontData: string[] = [];
      for (const url of CJK_FONT_URLS) {
        try {
          const resp = await fetch(url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const buf = await resp.arrayBuffer();
          webFontData.push(arrayBufferToBase64(buf));
          console.log(`Loaded CJK font: ${url} (${buf.byteLength} bytes)`);
        } catch (e) {
          console.warn(`Failed to load CJK font: ${url}:`, e);
        }
      }

      const initOpts: Record<string, unknown> = {
        fontAssets: ["cjk", "text"],
        remoteFonts: [
          "https://fonts.gstatic.com/s/roboto/v15/7MygqTe2zs9YkP0adA9QQQ.ttf",
          "https://fonts.gstatic.com/s/roboto/v15/T1xnudodhcgwXCmZQ490TPesZW2xOQ-xsNqO47m55DA.ttf",
          "https://fonts.gstatic.com/s/roboto/v15/dtpHsbgPEm2lVWciJZ0P-A.ttf",
          "https://fonts.gstatic.com/s/roboto/v15/iE8HhaRzdhPxC93dOdA056CWcynf_cDxXwCLxiixG1c.ttf",
          "https://fonts.gstatic.com/s/roboto/v15/W5F8_SL0XFawnjxHGsZjJA.ttf",
          "https://fonts.gstatic.com/s/roboto/v15/hcKoSgxdnKlbH5dlTwKbow.ttf",
          "https://fonts.gstatic.com/s/roboto/v15/Uxzkqj-MIMWle-XP2pDNAA.ttf",
          "https://fonts.gstatic.com/s/roboto/v15/daIfzbEw-lbjMyv4rMUUTqCWcynf_cDxXwCLxiixG1c.ttf",
          "https://fonts.gstatic.com/s/roboto/v15/bdHGHleUa-ndQCOrdpfxfw.ttf",
          "https://fonts.gstatic.com/s/roboto/v15/owYYXKukxFDFjr0ZO8NXh6CWcynf_cDxXwCLxiixG1c.ttf",
          "https://fonts.gstatic.com/s/roboto/v15/H1vB34nOKWXqzKotq25pcg.ttf",
          "https://fonts.gstatic.com/s/roboto/v15/b9PWBSMHrT2zM5FgUdtu0aCWcynf_cDxXwCLxiixG1c.ttf",
        ],
        workspaceRoots: ["file:///"],
      };

      if (webFontData.length > 0) {
        initOpts.tinymist = { webFontData };
      }
      
      // 发送初始化请求
      await server.on_request("initialize", {
        processId: null,
        capabilities: {
          textDocument: {
            completion: {
              completionItem: {
                snippetSupport: true,
              },
            },
            hover: {
              contentFormat: ["markdown", "plaintext"],
            },
          },
        },
        rootUri: "file:///",
        workspaceFolders: [{
          uri: "file:///",
          name: "root"
        }],
        initializationOptions: initOpts
      });

      // 发送已初始化通知
      server.on_notification("initialized", {});
      // Mirror the wasm demo: some servers expect a config notification soon after.
      server.on_notification("workspace/didChangeConfiguration", { settings: {} });

      lspInstance = server;
      
      // 暴露到全局 window 对象以便调试
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).typstLsp = server;
      }
      
      return lspInstance;
    } catch (e) {
      initPromise = null; // 允许重试
      throw e;
    }
  })();

  return initPromise;
}

// 创建预览任务
export async function createPreviewTask(taskId: string) {
  const server = await getTypstLsp();
  try {
    // 创建 preview 任务
    const result = await server.on_request("tinymist/createPreviewTask", {
      taskId,
      options: {
        mode: "document", // 或 "slide"
      }
    });
    console.log("创建预览任务结果:", result);
    return result;
  } catch (e) {
    console.error("创建预览任务失败:", e);
    throw e;
  }
}

// 发送预览消息
export async function sendPreviewMessage(taskId: string, message: unknown) {
  const server = await getTypstLsp();
  try {
    // Tinymist WASM expects tinymist_preview::WsMessage serialized as:
    //   { t: 't', v: string } | { t: 'b', v: number[] }
    // If we pass arbitrary objects, Rust will fail with `missing field 't'`.
    type WsMessage =
      | { t: "t"; v: string }
      | { t: "b"; v: number[] }

    const asWsMessage = (input: unknown): WsMessage => {
      if (input && typeof input === "object") {
        const obj = input as Record<string, unknown>
        if ((obj.t === "t" || obj.t === "b") && "v" in obj) {
          return obj as unknown as WsMessage
        }
      }

      if (typeof input === "string") return { t: "t", v: input }

      if (input instanceof Uint8Array) return { t: "b", v: Array.from(input) }
      if (input instanceof ArrayBuffer) return { t: "b", v: Array.from(new Uint8Array(input)) }

      if (Array.isArray(input) && input.every((x) => typeof x === "number")) {
        return { t: "b", v: input as number[] }
      }

      // Fallback: send as text JSON so Rust can deserialize it.
      try {
        return { t: "t", v: JSON.stringify(input) }
      } catch {
        return { t: "t", v: String(input) }
      }
    }

    // 使用新的 on_preview_message 方法
    const wsMsg = asWsMessage(message)
    server.on_preview_message(taskId, wsMsg);
    console.log("发送预览消息成功:", taskId, wsMsg);
  } catch (e) {
    console.error("发送预览消息失败:", e);
    throw e;
  }
}

// 更新文件内容
export async function updateFileContent(filePath: string, content: string) {
  const server = await getTypstLsp();
  try {
    // Tinymist web/wasm: `tinymist/updateMemoryFiles` isn't supported in sync-lsp
    // (it will log: unhandled lsp request). Use VFS snapshot updates instead.
    const toFileUri = (p: string) => {
      if (p.startsWith("file://")) return p;
      if (p.startsWith("/")) return `file://${p}`;
      return `file:///${p}`;
    };

    // Keep cache for fs/watch; normalize single-file path.
    if (filePath === "/main.typ") cacheText("/main.typ", content);

    const uri = resolveMainUri(toFileUri(filePath));
    cacheText(uri, content);
    const result = await server.on_request("tinymist/fsChange", {
      inserts: [
        {
          uri,
          content: { type: "ok", content },
        },
      ],
      removes: [],
    });
    console.log("tinymist/fsChange ok (updateFileContent):", uri);
    return result;
  } catch (e) {
    console.error("更新文件内容失败:", e);
    throw e;
  }
}

// Tinymist VFS: provide (uri -> text) snapshot.
// This mirrors the working wasm demo's `enqueueFsChange` behavior and is the
// most reliable way to ensure the server can compile and emit diagnostics.
export async function fsChange(uri: string, content: string) {
  const server = await getTypstLsp();
  try {
    cacheText(uri, content);
    const result = await server.on_request("tinymist/fsChange", {
      inserts: [
        {
          uri,
          content: { type: "ok", content },
        },
      ],
      removes: [],
    });
    console.log("tinymist/fsChange ok:", uri);
    return result;
  } catch (e) {
    console.error("tinymist/fsChange failed:", e);
    throw e;
  }
}

// 获取编译状态
export async function getCompileStatus(taskId: string) {
  const server = await getTypstLsp();
  try {
    const result = await server.on_request("tinymist/getCompileStatus", {
      taskId
    });
    console.log("获取编译状态结果:", result);
    return result;
  } catch (e) {
    console.error("获取编译状态失败:", e);
    throw e;
  }
}

// 获取预览资源
export async function getPreviewResources(taskId: string) {
  const server = await getTypstLsp();
  try {
    const result = await server.on_request("tinymist/getPreviewResources", {
      taskId
    });
    console.log("获取预览资源结果:", result);
    return result;
  } catch (e) {
    console.error("获取预览资源失败:", e);
    throw e;
  }
}

// LSP 功能：获取自动补全
export async function getCompletion(uri: string, position: { line: number; character: number }) {
  const server = await getTypstLsp();
  try {
    const result = await server.on_request("textDocument/completion", {
      textDocument: { uri },
      position
    });
    console.log("获取自动补全结果:", result);
    return result;
  } catch (e) {
    console.error("获取自动补全失败:", e);
    throw e;
  }
}

// LSP 功能：获取悬停信息
export async function getHover(uri: string, position: { line: number; character: number }) {
  const server = await getTypstLsp();
  try {
    const result = await server.on_request("textDocument/hover", {
      textDocument: { uri },
      position
    });
    console.log("获取悬停信息结果:", result);
    return result;
  } catch (e) {
    console.error("获取悬停信息失败:", e);
    throw e;
  }
}

// LSP 功能：获取诊断信息
export async function getDiagnostics(uri: string) {
  const server = await getTypstLsp();
  try {
    const result = await server.on_request("textDocument/diagnostics", {
      textDocument: { uri }
    });
    console.log("获取诊断信息结果:", result);
    return result;
  } catch (e) {
    console.error("获取诊断信息失败:", e);
    throw e;
  }
}

// WASM 功能：编译文档并获取诊断信息
export async function compileDocument(uri: string, content: string) {
  const server = await getTypstLsp();
  try {
    type WasmCompileResult = {
      uri?: string;
      diagnostics?: unknown;
    };

    type CompileFn = (this: unknown, uri: string, content: string) => unknown;
    const anyServer = server as unknown as {
      compile_document?: CompileFn;
      compileDocument?: CompileFn;
      on_request: (method: string, params: unknown) => unknown;
    };

    const compileFn = anyServer.compile_document ?? anyServer.compileDocument;

    if (typeof compileFn === "function") {
      // wasm-bindgen class methods rely on `this.__wbg_ptr`; preserve `this`.
      const raw = compileFn.call(server, uri, content);
      const result = await Promise.resolve(raw);
      console.log("编译文档结果:", result);

      if (diagnosticHandler && result && typeof result === "object") {
        const r = result as WasmCompileResult;
        const diagnostics = r.diagnostics;
        if (Array.isArray(diagnostics)) {
          diagnosticHandler(typeof r.uri === "string" ? r.uri : uri, diagnostics);
        }
      }

      return result;
    }

    // Fallback: use LSP request-based diagnostics if the WASM export isn't present.
    const raw = await Promise.resolve(
      anyServer.on_request("textDocument/diagnostics", { textDocument: { uri } }),
    );
    console.log("diagnostics fallback result:", raw);
    if (diagnosticHandler && raw && typeof raw === "object") {
      const r = raw as WasmCompileResult;
      const diagnostics = r.diagnostics;
      if (Array.isArray(diagnostics)) diagnosticHandler(uri, diagnostics);
    }
    return raw;
  } catch (e) {
    console.error("编译文档失败:", e);
    throw e;
  }
}

// WASM export: call tinymist commands and return base64 payload.
// NOTE: In web/wasm we must use `write: false` to export into memory.
export async function exportDocument(kind: ExportKind, content: string) {
  const server = await getTypstLsp();

  const entryPath = "/main.typ";
  const fallbackUri = "file:///main.typ";
  const entryUri = resolveMainUri(fallbackUri);

  // Ensure the LSP document exists for queries/commands that rely on it.
  // Tinymist may use an overridden-but-equivalent main URI; treat URI changes as a new open.
  if (exportEntryOpenedUri !== entryUri) {
    exportEntryOpenedUri = entryUri;
    exportEntryVersion = 1;
    await openDocument(entryUri, "typst", content);
  } else {
    exportEntryVersion = (exportEntryVersion + 1) | 0;
    await changeDocument(entryUri, content, exportEntryVersion);
  }

  // Keep both internal memory files and VFS snapshots up-to-date.
  await updateFileContent(entryPath, content);

  const command =
    kind === "svg"
      ? "tinymist.exportSvg"
      : kind === "png"
        ? "tinymist.exportPng"
        : "tinymist.exportPdf";

  return await server.on_request("workspace/executeCommand", {
    command,
    arguments: [entryPath, {}, { write: false, open: false }],
  });
}

// LSP 功能：打开文档
export async function openDocument(uri: string, languageId: string, text: string) {
  const server = await getTypstLsp();
  try {
    cacheText(uri, text);
    server.on_notification("textDocument/didOpen", {
      textDocument: {
        uri,
        languageId,
        version: 1,
        text
      }
    });
    console.log("打开文档成功:", uri);
  } catch (e) {
    console.error("打开文档失败:", e);
    throw e;
  }
}

// LSP 功能：更新文档内容
export async function changeDocument(uri: string, text: string, version: number) {
  const server = await getTypstLsp();
  try {
    cacheText(uri, text);
    server.on_notification("textDocument/didChange", {
      textDocument: { uri, version },
      contentChanges: [{ text }]
    });
    console.log("更新文档内容成功:", uri);
  } catch (e) {
    console.error("更新文档内容失败:", e);
    throw e;
  }
}

// LSP 功能：保存文档
export async function saveDocument(uri: string) {
  const server = await getTypstLsp();
  try {
    server.on_notification("textDocument/didSave", {
      textDocument: { uri }
    });
    console.log("保存文档成功:", uri);
  } catch (e) {
    console.error("保存文档失败:", e);
    throw e;
  }
}