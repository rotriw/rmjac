"use client"



import { useEffect, useRef, useState } from "react"
import type * as typst from '@myriaddreamin/typst.ts';
import { $typst } from '@myriaddreamin/typst.ts';
import { loadFonts, preloadFontAssets, preloadRemoteFonts, preloadSystemFonts } from "@myriaddreamin/typst.ts/dist/esm/options.init.mjs";
import { preloadFont } from "next/dist/server/app-render/entry-base";
import "./typst.css";

interface TypstRendererProps {
  content: string
  className?: string
}

export function TypstRenderer({ content, className = "" }: TypstRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || !content) return
    const renderTypst = async () => {
      setIsLoading(true)
      setError(null)
      try {
  /* 
        $typst.setCompilerInitOptions({
          getModule: () =>
            'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm',
        });
        $typst.setRendererInitOptions({
          getModule: () =>
            'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm',
        }); */
        // convert content image src start with espress.codeforces.com to download and convert.
        let counter = 0;
        const promise = [];
        let print_content = content.replaceAll(/image\("(.*?)(.png|.jpg)",/g, (_match, p1, p2) => {
            const download_url = `${p1}${p2}`;
            const now_counter = counter ++;
            const fetchImage = async(count: number, ext: string, url: string) => {
                console.log(url);
                const nowImage = await (await fetch(url)).arrayBuffer();
                console.log("done");
                console.log(nowImage);
                console.log($typst);
                console.log(`/local/${count}${ext}`);
                $typst.mapShadow(`/local/${count}${ext}`, new Uint8Array(nowImage));
            };
            promise.push(fetchImage(now_counter, p2, download_url));
            console.log(download_url);
            return `image("/local/${now_counter}${p2}",`;
        });
        await Promise.all(promise);
        console.log("qwqqq");
        console.log(print_content);
        $typst.setCompilerInitOptions({
          getModule: async () => {
            const wasmUrl = new URL(
              "@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm",
              import.meta.url,
            );
            const wasmResponse = await fetch(wasmUrl);
            if (!wasmResponse.ok) {
              throw new Error(
                `Failed to fetch compiler WASM: ${wasmResponse.status}`,
              );
            }
            return await wasmResponse.arrayBuffer();
          },
          beforeBuild: [
            // Set dummy access model to allow file access from shadow filesystem
            async (_, { builder }) => {
              console.log("Setting dummy access model for file access...");
              builder.set_dummy_access_model();
            },
            preloadRemoteFonts([
              // Roboto font family (Regular, Bold, Italic, Bold Italic, etc.)
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
            ]),
            preloadFontAssets({
              assets: ['cjk', 'text']
            })
          ],
        
        });

      $typst.setRendererInitOptions({
        getModule: async () => {
          const wasmUrl = new URL(
            "@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm",
            import.meta.url,
          );
          const wasmResponse = await fetch(wasmUrl);
          if (!wasmResponse.ok) {
            throw new Error(
              `Failed to fetch renderer WASM: ${wasmResponse.status}`,
            );
          }
          return await wasmResponse.arrayBuffer();
        },
      });


        console.log($typst);

        const compiler = await $typst.getCompiler();
        console.log(compiler);
        const result = await $typst.svg({
          mainContent: `
          #set rect(width: 100%)
          #set page(width: 40cm,height:auto,margin:(top: 0cm,bottom: 0cm,x: 0cm,y: 0cm))
          #set text(size: 16pt)
          #set footnote(numbering: "*")
          #let bmod = math.op("mod")
          #let pmod(x) = $space (mod #x)$
          #let colored(col, content) = text(col, content)
          #let plus = symbol(
            "+",
            ("o", symbol(math.xor))
          )
          #let overset(top, base) = math.attach(base, t: top)
          #let underset(bot, base) = math.attach(base, b: bot)
          #let over(numerator, denominator) = math.frac(numerator, denominator)
          #let epigraph = (
                  wrapper: (body) => {
                    set align(right)
                    block(width: 100%, inset: (y: 1em), body)
                  },

                  text: (body) => {
                    stack(
                      dir: ttb,
                      spacing: 0.8em,
                      body,
                      line(length: 100%, stroke: 0.5pt + black)
                    )
                  },

                  source: (body) => {
                    v(0.0em)
                    align(right, body)
                  }
                )
          ${print_content}\\`,
        });
        console.log(result);
        if (containerRef.current && result) {
          
          containerRef.current.innerHTML = result
          containerRef.current.querySelectorAll("svg").forEach(svg => {
            svg.setAttribute("width", "auto")
            svg.setAttribute("height", "auto")
          }
        );
        }
      } catch (err) {
        console.error("Typst渲染错误:", err)
        setError(err instanceof Error ? err.message : "Typst渲染失败")
        if (containerRef.current) {
          containerRef.current.innerHTML = `<div class="text-red-500 text-sm p-2 border border-red-200 rounded bg-red-50">Typst渲染失败: ${err instanceof Error ? err.message : '未知错误'}</div>`
        }
      } finally {
        setIsLoading(false)
      }
    }

    renderTypst()
  }, [content])

  return (
    <div className={`typst-container ${className}`}>
      {isLoading && <div className="text-gray-500 text-sm">Typst渲染中...</div>}
      <div
        ref={containerRef}
        className="w-full"
      />
    </div>
  )
}