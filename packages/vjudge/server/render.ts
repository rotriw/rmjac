/**
 * HTML 渲染模块 — 高雅稳重设计
 *
 * 去掉 Blueprint.js，完全自定义 CSS。
 * 使用 Inter + 衬线字体混排，深灰色调，细线分割，克制留白。
 * KaTeX 渲染数学公式，marked 渲染 Markdown。
 */

import type { CoreProblem, CoreProblemStatement } from "./app.ts";

const KATEX_CSS = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
const KATEX_JS = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
const KATEX_AUTO = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js";
const MARKED_JS = "https://cdn.jsdelivr.net/npm/marked@12/marked.min.js";

/* ------------------------------------------------------------------ */
/*  Layout                                                             */
/* ------------------------------------------------------------------ */

function layout(title: string, body: string, opts?: { head?: string; noNav?: boolean }): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — Problem Viewer</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${KATEX_CSS}">
<style>
/* ===== Reset ===== */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}

/* ===== Palette ===== */
:root{
  --bg:#fafaf9;
  --bg-card:#ffffff;
  --bg-muted:#f5f5f4;
  --border:#e7e5e4;
  --border-light:#f0eeec;
  --text:#1c1917;
  --text-secondary:#57534e;
  --text-muted:#a8a29e;
  --accent:#292524;
  --accent-subtle:#44403c;
  --link:#78716c;
  --link-hover:#1c1917;
  --serif:'Source Serif 4',Georgia,'Times New Roman',serif;
  --sans:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
  --mono:'JetBrains Mono','SF Mono',Monaco,Consolas,monospace;
  --radius:8px;
  --shadow:0 1px 2px rgba(0,0,0,.05), 0 1px 3px rgba(0,0,0,.03);
  --shadow-md:0 4px 12px rgba(0,0,0,.07), 0 1px 3px rgba(0,0,0,.04);
  --shadow-lg:0 8px 30px rgba(0,0,0,.08), 0 4px 12px rgba(0,0,0,.04), 0 1px 3px rgba(0,0,0,.03);
  --shadow-xl:0 16px 48px rgba(0,0,0,.10), 0 8px 20px rgba(0,0,0,.05), 0 2px 6px rgba(0,0,0,.03);
  --shadow-float:0 20px 60px rgba(0,0,0,.12), 0 8px 24px rgba(0,0,0,.06), 0 2px 4px rgba(0,0,0,.02);
}

body{
  font-family:var(--sans);
  font-size:14px;
  color:var(--text);
  background:var(--accent);
  line-height:1.6;
  min-height:100vh;
}

a{color:var(--link);text-decoration:none;transition:color .15s}
a:hover{color:var(--link-hover)}

/* ===== Navigation — glass ===== */
.nav{
  position:sticky;top:0;z-index:50;
  background:rgba(255,255,255,.6);
  backdrop-filter:blur(28px) saturate(1.8);
  -webkit-backdrop-filter:blur(28px) saturate(1.8);
  border-bottom:1px solid rgba(255,255,255,.3);
  box-shadow:0 1px 0 rgba(255,255,255,.6), 0 4px 24px rgba(0,0,0,.05), inset 0 -1px 0 rgba(0,0,0,.03);
}
.nav-inner{
  max-width:980px;margin:0 auto;padding:0 24px;
  display:flex;align-items:center;height:56px;
}
.nav-brand{
  font-family:var(--serif);font-size:17px;font-weight:700;
  color:var(--accent);text-decoration:none;letter-spacing:-.3px;
}
.nav-links{margin-left:auto;display:flex;gap:4px}
.nav-link{
  padding:7px 16px;font-size:13px;font-weight:500;
  color:var(--text-secondary);border-radius:var(--radius);
  transition:all .2s cubic-bezier(.4,0,.2,1);
  position:relative;
}
.nav-link:hover{
  color:var(--text);background:var(--bg-muted);
  box-shadow:0 2px 8px rgba(0,0,0,.04);
  transform:translateY(-1px);
}

/* ===== Container ===== */
.container{max-width:980px;margin:0 auto;padding:0 24px}
.main{padding:40px 0 60px}
.content-area{
  background:var(--bg);
  position:relative;
}
.content-area::before{
  content:'';display:block;height:80px;
  background:linear-gradient(180deg,var(--accent),var(--bg));
  margin-top:-1px;
}

/* ===== Hero (home) — fullscreen first fold ===== */
.hero{
  min-height:100vh;
  display:flex;flex-direction:column;justify-content:center;
  padding:80px 0 0;
  background:var(--accent);
  position:relative;
  overflow:hidden;
  perspective:1200px;
}
.hero::before{
  content:'';position:absolute;inset:0;
  background:
    radial-gradient(ellipse 900px 600px at 15% 35%, rgba(168,162,158,.1), transparent),
    radial-gradient(ellipse 700px 500px at 75% 65%, rgba(168,162,158,.07), transparent),
    radial-gradient(ellipse 400px 400px at 50% 20%, rgba(214,211,209,.04), transparent);
  pointer-events:none;
}
.hero::after{
  content:'';position:absolute;inset:0;
  background:linear-gradient(180deg,transparent 40%,rgba(28,25,23,.5));
  pointer-events:none;
}
.hero-inner{
  position:relative;z-index:2;
  max-width:980px;margin:0 auto;padding:0 24px;
  transform-style:preserve-3d;
  flex:1;display:flex;flex-direction:column;justify-content:center;
}
.hero-eyebrow{
  display:inline-block;
  font-family:var(--mono);font-size:11px;font-weight:500;
  letter-spacing:2.5px;text-transform:uppercase;
  color:rgba(255,255,255,.3);
  margin-bottom:28px;
  transform:translateZ(20px);
  background:rgba(255,255,255,.04);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  padding:6px 16px;
  border-radius:20px;
  border:1px solid rgba(255,255,255,.06);
}
.hero h1{
  font-family:var(--serif);font-size:64px;font-weight:700;
  color:#fff;letter-spacing:-.5px;line-height:1.05;
  margin-bottom:22px;
  text-shadow:0 2px 20px rgba(0,0,0,.25), 0 4px 40px rgba(0,0,0,.12);
  transform:translateZ(40px);
  background:linear-gradient(180deg,#fff 30%,rgba(255,255,255,.7));
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
}
.hero-desc{
  font-size:16px;line-height:1.8;
  color:rgba(255,255,255,.4);
  max-width:520px;
  margin-bottom:44px;
  transform:translateZ(15px);
}
.hero-actions{display:flex;gap:14px;flex-wrap:wrap;transform:translateZ(25px)}
.btn{
  display:inline-flex;align-items:center;gap:8px;
  padding:13px 28px;font-size:13px;font-weight:600;
  border-radius:var(--radius);border:none;cursor:pointer;
  text-decoration:none;transition:all .25s cubic-bezier(.4,0,.2,1);
  font-family:var(--sans);letter-spacing:.2px;
  position:relative;
}
.btn-light{
  background:rgba(255,255,255,.88);color:var(--accent);
  backdrop-filter:blur(20px) saturate(1.6);
  -webkit-backdrop-filter:blur(20px) saturate(1.6);
  box-shadow:0 2px 8px rgba(0,0,0,.12), 0 4px 16px rgba(0,0,0,.06), inset 0 1px 0 rgba(255,255,255,.9);
  border:1px solid rgba(255,255,255,.5);
}
.btn-light:hover{
  background:rgba(255,255,255,.95);
  transform:translateY(-3px);
  box-shadow:0 6px 20px rgba(0,0,0,.15), 0 8px 32px rgba(0,0,0,.08), inset 0 1px 0 rgba(255,255,255,.9);
}
.btn-light:active{transform:translateY(-1px);box-shadow:0 2px 6px rgba(0,0,0,.12)}
.btn-ghost{
  background:rgba(255,255,255,.05);color:rgba(255,255,255,.65);
  border:1px solid rgba(255,255,255,.1);
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
  box-shadow:0 2px 8px rgba(0,0,0,.08);
}
.btn-ghost:hover{
  color:#fff;border-color:rgba(255,255,255,.2);
  background:rgba(255,255,255,.1);
  transform:translateY(-3px);
  box-shadow:0 6px 20px rgba(0,0,0,.12);
}
.btn-ghost:active{transform:translateY(-1px)}

/* Hero Stats Bar — glass 3D floating */
.hero-stats{
  display:grid;grid-template-columns:repeat(4,1fr);
  margin-top:auto;
  position:relative;
  transform:translateZ(10px);
  background:rgba(255,255,255,.03);
  backdrop-filter:blur(20px);
  -webkit-backdrop-filter:blur(20px);
  border-top:1px solid rgba(255,255,255,.06);
  border-bottom:none;
}
.hero-stat{
  padding:32px 0;text-align:center;
  border-right:1px solid rgba(255,255,255,.04);
  transition:all .3s cubic-bezier(.4,0,.2,1);
  position:relative;
}
.hero-stat::after{
  content:'';position:absolute;inset:0;
  background:rgba(255,255,255,.03);
  opacity:0;transition:opacity .3s;
}
.hero-stat:hover::after{opacity:1}
.hero-stat:hover{transform:translateY(-2px)}
.hero-stat:last-child{border-right:none}
.hero-stat-num{
  font-family:var(--serif);font-size:36px;font-weight:700;
  color:#fff;line-height:1;
  text-shadow:0 2px 10px rgba(0,0,0,.3);
  transition:transform .3s;
  background:linear-gradient(180deg,#fff,rgba(255,255,255,.75));
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
}
.hero-stat:hover .hero-stat-num{transform:scale(1.05)}
.hero-stat-label{
  font-size:10px;font-weight:500;letter-spacing:2px;
  text-transform:uppercase;color:rgba(255,255,255,.2);
  margin-top:8px;
}

/* ===== Card — glass 3D floating ===== */
.card{
  background:rgba(255,255,255,.72);
  backdrop-filter:blur(24px) saturate(1.6);
  -webkit-backdrop-filter:blur(24px) saturate(1.6);
  border:1px solid rgba(255,255,255,.5);
  border-radius:var(--radius);
  padding:28px 32px;
  box-shadow:var(--shadow-md), inset 0 1px 0 rgba(255,255,255,.7);
  transition:all .35s cubic-bezier(.4,0,.2,1);
  position:relative;
  transform:translateY(0) translateZ(0);
  will-change:transform,box-shadow;
}
.card::before{
  content:'';position:absolute;inset:-1px;
  border-radius:var(--radius);
  background:linear-gradient(135deg,rgba(255,255,255,.6),rgba(255,255,255,0) 50%,rgba(0,0,0,.01));
  pointer-events:none;z-index:1;
  opacity:.5;transition:opacity .35s;
}
.card:hover{
  background:rgba(255,255,255,.82);
  box-shadow:var(--shadow-float), inset 0 1px 0 rgba(255,255,255,.8);
  transform:translateY(-6px);
}
.card:hover::before{opacity:1}
.card+.card{margin-top:18px}
.card-title{
  font-family:var(--serif);font-size:18px;font-weight:600;
  color:var(--accent);margin-bottom:16px;
  display:flex;align-items:center;gap:10px;
}
.card-title .line{
  flex:1;height:1px;
  background:linear-gradient(90deg,var(--border),transparent);
}

/* ===== Platform Cards (home) — 3D floating ===== */
.platform-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;perspective:800px}
.platform-card{
  display:flex;align-items:center;gap:20px;
  padding:28px 24px;
  border:1px solid rgba(255,255,255,.4);
  border-radius:var(--radius);
  background:rgba(255,255,255,.6);
  backdrop-filter:blur(16px) saturate(1.5);
  -webkit-backdrop-filter:blur(16px) saturate(1.5);
  text-decoration:none;
  transition:all .35s cubic-bezier(.4,0,.2,1);
  position:relative;
  transform-style:preserve-3d;
  transform:translateZ(0);
  box-shadow:var(--shadow), inset 0 1px 0 rgba(255,255,255,.6);
}
.platform-card::after{
  content:'';position:absolute;inset:0;
  border-radius:var(--radius);
  background:linear-gradient(135deg,rgba(255,255,255,.5) 0%,transparent 60%);
  opacity:0;transition:opacity .35s;
  pointer-events:none;
}
.platform-card:hover{
  border-color:rgba(255,255,255,.6);
  background:rgba(255,255,255,.75);
  box-shadow:var(--shadow-xl), inset 0 1px 0 rgba(255,255,255,.8);
  transform:translateY(-8px) rotateX(2deg);
}
.platform-card:hover::after{opacity:1}
.platform-card:active{transform:translateY(-3px);transition-duration:.1s}
.platform-emblem{
  width:48px;height:48px;border-radius:12px;
  display:flex;align-items:center;justify-content:center;
  font-family:var(--mono);font-size:15px;font-weight:700;
  color:#fff;flex-shrink:0;
  box-shadow:0 4px 12px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.1);
  transition:transform .35s cubic-bezier(.4,0,.2,1), box-shadow .35s;
}
.platform-card:hover .platform-emblem{
  transform:scale(1.08) translateZ(10px);
  box-shadow:0 6px 20px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.1);
}
.platform-emblem.cf{background:linear-gradient(135deg,#292524,#1c1917)}
.platform-emblem.at{background:linear-gradient(135deg,#57534e,#44403c)}
.platform-emblem.lg{background:linear-gradient(135deg,#78716c,#57534e)}
.platform-info .name{font-size:14px;font-weight:600;color:var(--text)}
.platform-info .count{
  font-family:var(--serif);font-size:30px;font-weight:700;
  color:var(--accent);line-height:1.1;margin-top:3px;
  transition:transform .35s;
}
.platform-card:hover .platform-info .count{transform:translateX(2px)}

/* ===== Tag ===== */
.tag{
  display:inline-block;
  font-size:11px;font-weight:600;letter-spacing:.4px;
  text-transform:uppercase;
  padding:3px 8px;border-radius:3px;
  background:var(--bg-muted);color:var(--text-secondary);
  border:1px solid var(--border-light);
  vertical-align:middle;
}
.tag{transition:all .2s cubic-bezier(.4,0,.2,1);box-shadow:0 1px 2px rgba(0,0,0,.04)}
.tag:hover{transform:translateY(-1px);box-shadow:0 2px 6px rgba(0,0,0,.06)}
.tag-cf{color:#44403c;background:#fafaf9;border-color:#d6d3d1}
.tag-at{color:#44403c;background:#fafaf9;border-color:#d6d3d1}
.tag-lg{color:#44403c;background:#fafaf9;border-color:#d6d3d1}

/* ===== Table ===== */
.data-table{width:100%;border-collapse:collapse;font-size:13px}
.data-table thead{border-bottom:2px solid var(--accent)}
.data-table th{
  padding:10px 12px;text-align:left;
  font-size:11px;font-weight:600;letter-spacing:.8px;
  text-transform:uppercase;color:var(--text-muted);
}
.data-table td{padding:12px;border-bottom:1px solid var(--border-light)}
.data-table tbody tr{transition:all .2s cubic-bezier(.4,0,.2,1)}
.data-table tbody tr:hover{
  background:var(--bg-muted);
  box-shadow:0 2px 12px rgba(0,0,0,.04);
  transform:scale(1.002);
}
.data-table a{color:var(--text);font-weight:500}
.data-table a:hover{color:var(--accent-subtle);text-decoration:underline}
.data-table .mono{font-family:var(--mono);font-size:12px;color:var(--text-secondary)}

/* ===== Search ===== */
.search-bar{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap}
.search-input{
  flex:1;min-width:200px;padding:9px 14px;
  font-size:13px;font-family:var(--sans);
  border:1px solid rgba(255,255,255,.4);border-radius:var(--radius);
  background:rgba(255,255,255,.6);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  color:var(--text);
  transition:border-color .15s,box-shadow .15s,transform .15s;
  outline:none;
}
.search-input:focus{
  border-color:var(--accent);
  box-shadow:0 0 0 3px rgba(28,25,23,.06), 0 2px 8px rgba(0,0,0,.04);
  transform:translateY(-1px);
}
.search-select{
  padding:9px 14px;font-size:13px;font-family:var(--sans);
  border:1px solid rgba(255,255,255,.4);border-radius:var(--radius);
  background:rgba(255,255,255,.6);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  color:var(--text);
  cursor:pointer;outline:none;
  appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2378716c' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 12px center;
  padding-right:32px;
}
.btn-search{
  padding:10px 22px;font-size:13px;font-weight:600;
  font-family:var(--sans);
  background:rgba(41,37,36,.85);color:#fff;
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,.08);
  border-radius:var(--radius);
  cursor:pointer;transition:all .25s cubic-bezier(.4,0,.2,1);
  box-shadow:0 2px 6px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.06);
  position:relative;
}
.btn-search:hover{
  background:var(--accent-subtle);
  transform:translateY(-3px);
  box-shadow:0 6px 20px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.06);
}
.btn-search:active{transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.12)}

/* ===== Pagination ===== */
.pagination{display:flex;gap:2px;justify-content:center;margin-top:28px}
.page-btn{
  padding:8px 14px;font-size:13px;font-weight:500;
  border:1px solid rgba(255,255,255,.4);border-radius:var(--radius);
  background:rgba(255,255,255,.6);
  backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);
  color:var(--text-secondary);
  text-decoration:none;transition:all .2s cubic-bezier(.4,0,.2,1);
  box-shadow:var(--shadow), inset 0 1px 0 rgba(255,255,255,.5);
}
.page-btn:hover{
  border-color:var(--accent);color:var(--text);
  transform:translateY(-2px);box-shadow:var(--shadow-md);
}
.page-btn:active{transform:translateY(0)}
.page-btn.active{
  background:rgba(41,37,36,.85);color:#fff;border-color:rgba(41,37,36,.9);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  box-shadow:0 3px 10px rgba(28,25,23,.2), inset 0 1px 0 rgba(255,255,255,.08);
}
.page-btn.disabled{color:var(--text-muted);pointer-events:none;box-shadow:none}

/* ===== Problem Detail ===== */
.problem-header{margin-bottom:8px}
.problem-title{
  font-family:var(--serif);font-size:28px;font-weight:700;
  color:var(--accent);line-height:1.25;letter-spacing:-.3px;
  text-shadow:0 1px 2px rgba(0,0,0,.04);
}
.problem-meta{
  display:flex;gap:20px;align-items:center;flex-wrap:wrap;
  margin-top:12px;padding-bottom:20px;
  border-bottom:1px solid var(--border);
}
.meta-item{
  display:flex;align-items:center;gap:6px;
  font-size:12px;color:var(--text-muted);
}
.meta-item strong{color:var(--text-secondary);font-weight:600}
.tags-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:14px}

/* ===== Tabs ===== */
.tab-bar{
  display:flex;gap:0;
  border-bottom:1px solid var(--border);
  margin-bottom:24px;
}
.tab-item{
  padding:10px 22px;
  font-size:13px;font-weight:500;color:var(--text-muted);
  cursor:pointer;border-bottom:2px solid transparent;
  margin-bottom:-1px;transition:all .2s cubic-bezier(.4,0,.2,1);user-select:none;
  position:relative;
}
.tab-item:hover{color:var(--text);transform:translateY(-1px)}
.tab-item.active{
  color:var(--accent);border-bottom-color:var(--accent);font-weight:600;
  text-shadow:0 0 20px rgba(28,25,23,.05);
}
.tab-panel{display:none}
.tab-panel.active{display:block}

/* ===== Markdown ===== */
.md-body{font-size:15px;line-height:1.8;color:var(--text)}
.md-body h2{
  font-family:var(--serif);font-size:20px;font-weight:600;
  margin:32px 0 14px;padding-bottom:8px;
  border-bottom:1px solid var(--border);color:var(--accent);
}
.md-body h3{font-family:var(--serif);font-size:17px;font-weight:600;margin:24px 0 10px;color:var(--accent)}
.md-body p{margin-bottom:12px}
.md-body pre{
  background:var(--bg-muted);border:1px solid var(--border);
  padding:16px 20px;border-radius:var(--radius);
  overflow-x:auto;font-size:13px;font-family:var(--mono);
  line-height:1.6;
}
.md-body code{
  background:var(--bg-muted);padding:2px 6px;border-radius:3px;
  font-size:13px;font-family:var(--mono);
}
.md-body pre code{background:none;padding:0}
.md-body ul,.md-body ol{margin-bottom:12px;padding-left:24px}
.md-body blockquote{
  border-left:3px solid var(--border);margin:16px 0;
  padding:12px 20px;color:var(--text-secondary);
  background:var(--bg-muted);border-radius:0 var(--radius) var(--radius) 0;
}
.md-body img{max-width:100%;border-radius:var(--radius)}
.md-body table{border-collapse:collapse;margin:12px 0;width:100%}
.md-body table th,.md-body table td{border:1px solid var(--border);padding:8px 14px;font-size:14px}
.md-body table th{background:var(--bg-muted);font-weight:600;font-size:13px}

/* ===== Samples ===== */
.sample-pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0}
.sample-label{font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px}
.sample-box{
  background:rgba(245,245,244,.6);border:1px solid rgba(255,255,255,.4);
  backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);
  padding:14px 18px;border-radius:var(--radius);
  font-size:13px;font-family:var(--mono);line-height:1.6;
  white-space:pre-wrap;word-break:break-all;
  box-shadow:inset 0 1px 4px rgba(0,0,0,.04), 0 1px 0 rgba(255,255,255,.7);
}

/* ===== Code Block (dark) — glass inset ===== */
.code-block{
  background:rgba(28,25,23,.92);color:#d6d3d1;
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
  padding:20px 24px;border-radius:var(--radius);
  overflow-x:auto;font-size:13px;font-family:var(--mono);
  line-height:1.6;margin:10px 0;white-space:pre;
  border:1px solid rgba(255,255,255,.05);
  box-shadow:inset 0 2px 8px rgba(0,0,0,.3), inset 0 1px 2px rgba(0,0,0,.2), 0 1px 0 rgba(255,255,255,.04);
}

/* ===== API Doc ===== */
.endpoint{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.method{
  font-family:var(--mono);font-size:11px;font-weight:700;
  letter-spacing:.5px;padding:4px 10px;border-radius:4px;
  box-shadow:0 1px 3px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.08);
}
.method-get{background:linear-gradient(135deg,#292524,#1c1917);color:#fff}
.method-post{background:linear-gradient(135deg,#78716c,#57534e);color:#fff}
.endpoint-path{font-family:var(--mono);font-size:14px;font-weight:600;color:var(--accent)}
.api-desc{color:var(--text-secondary);font-size:14px;margin-bottom:16px}
.param-table{width:100%;border-collapse:collapse;font-size:13px;margin:12px 0}
.param-table th{
  text-align:left;padding:8px 12px;
  font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;
  color:var(--text-muted);border-bottom:2px solid var(--accent);
}
.param-table td{padding:8px 12px;border-bottom:1px solid var(--border-light)}
.param-table code{font-family:var(--mono);font-size:12px;background:var(--bg-muted);padding:1px 5px;border-radius:3px}

/* ===== Callout — glass elevated ===== */
.callout{
  padding:22px 26px;border-radius:var(--radius);
  border:1px solid rgba(255,255,255,.4);border-left:3px solid var(--accent);
  background:rgba(245,245,244,.65);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  margin-top:20px;
  box-shadow:var(--shadow), inset 0 1px 0 rgba(255,255,255,.7);
  transition:all .3s cubic-bezier(.4,0,.2,1);
}
.callout:hover{
  box-shadow:var(--shadow-md);
  transform:translateY(-2px);
}
.callout-title{font-weight:600;font-size:14px;margin-bottom:8px;color:var(--accent)}

/* ===== Footer — glass ===== */
.footer{
  text-align:center;padding:32px;
  font-size:12px;color:var(--text-muted);
  border-top:1px solid rgba(255,255,255,.3);
  margin-top:40px;letter-spacing:.3px;
  background:rgba(255,255,255,.5);
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.6);
}

/* ===== Scrollbar ===== */
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--text-muted)}

/* ===== Details ===== */
details{margin-top:4px}
details summary{
  cursor:pointer;font-size:13px;font-weight:500;
  color:var(--text-muted);padding:8px 0;
  transition:color .15s;
}
details summary:hover{color:var(--text)}
details[open] summary{margin-bottom:12px}

/* ===== Responsive ===== */
@media(max-width:640px){
  .hero{min-height:auto;padding-top:60px;padding-bottom:0}
  .hero h1{font-size:36px}
  .hero-stats{grid-template-columns:repeat(2,1fr)}
  .hero-stat{padding:16px 0}
  .hero-stat-num{font-size:24px}
  .sample-pair{grid-template-columns:1fr}
  .nav-link span.label{display:none}
}
</style>
${opts?.head || ""}
</head>
<body>
${opts?.noNav ? "" : `<nav class="nav">
  <div class="nav-inner">
    <a href="/" class="nav-brand">Problem Viewer</a>
    <div class="nav-links">
      <a href="/problems" class="nav-link">Problems</a>
      <a href="/docs" class="nav-link">API</a>
      <a href="/api/stats" class="nav-link">Stats</a>
    </div>
  </div>
</nav>`}
${opts?.noNav ? body : `<div class="content-area">${body}</div>`}
<div class="footer">&copy; Rotriw 2026. 若您有相关疑问请联系 <a href="mailto:issue@rmj.ac" style="color:var(--text-muted);text-decoration:underline">issue@rmj.ac</a></div>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function platformTag(p: string): string {
  const k = p.toLowerCase();
  const cls = k.includes("codeforces") ? "tag-cf" : k.includes("atcoder") ? "tag-at" : "tag-lg";
  return `<span class="tag ${cls}">${esc(p)}</span>`;
}

function diffTag(d: any): string {
  if (d == null || d === 0) return `<span class="tag">—</span>`;
  return `<span class="tag">${d}</span>`;
}

function cleanName(n: string): string {
  return n.replace(/\n\t+Editorial$/i, "").replace(/\s+Editorial$/i, "").trim();
}

/* ------------------------------------------------------------------ */
/*  首页                                                               */
/* ------------------------------------------------------------------ */

export function renderHomePage(stats: {
  problems: number; translations: number;
  formalizations: number; embeddings: number;
  platforms: Record<string, number>;
}): string {
  const PN: Record<string, string> = { codeforces: "Codeforces", atcoder: "AtCoder", luogu: "Luogu" };
  const initials: Record<string, string> = { codeforces: "CF", atcoder: "AT", luogu: "LG" };

  const cards = Object.entries(stats.platforms).map(([p, c]) => {
    const name = PN[p] || p;
    const ini = initials[p] || p.slice(0, 2).toUpperCase();
    const cls = p === "codeforces" ? "cf" : p === "atcoder" ? "at" : "lg";
    return `<a href="/problems?platform=${p}" class="platform-card">
      <div class="platform-emblem ${cls}">${ini}</div>
      <div class="platform-info">
        <div class="name">${esc(name)}</div>
        <div class="count">${c.toLocaleString()}</div>
      </div>
    </a>`;
  }).join("");

  return layout("首页", `
<section class="hero">
  <div class="hero-inner">
    <div class="hero-eyebrow">Competitive Programming Archive</div>
    <h1>Problem<br>Viewer</h1>
    <p class="hero-desc">Rmjac viwer。</p>
    <div class="hero-actions">
      <a href="/problems" class="btn btn-light">浏览题目</a>
      <a href="/docs" class="btn btn-ghost">API 文档</a>
    </div>
  </div>
  <div class="hero-stats">
    <div class="hero-stat"><div class="hero-stat-num">${stats.problems.toLocaleString()}</div><div class="hero-stat-label">Problems</div></div>
    <div class="hero-stat"><div class="hero-stat-num">${stats.translations.toLocaleString()}</div><div class="hero-stat-label">Translations</div></div>
    <div class="hero-stat"><div class="hero-stat-num">${stats.formalizations.toLocaleString()}</div><div class="hero-stat-label">Formalizations</div></div>
    <div class="hero-stat"><div class="hero-stat-num">${stats.embeddings.toLocaleString()}</div><div class="hero-stat-label">Embeddings</div></div>
  </div>
</section>

<div class="content-area">
<div class="container main">
  <div class="card">
    <div class="card-title">Platforms<span class="line"></span></div>
    <div class="platform-grid">${cards}</div>
  </div>
</div>
</div>`, { noNav: true });
}

/* ------------------------------------------------------------------ */
/*  题目列表页                                                         */
/* ------------------------------------------------------------------ */

export function renderListPage(
  rows: any[],
  opts: { page: number; total: number; limit: number; platform: string; search: string },
): string {
  const PN: Record<string, string> = { codeforces: "Codeforces", atcoder: "AtCoder", luogu: "Luogu" };
  const totalPages = Math.ceil(opts.total / opts.limit);

  const trs = rows.map(r => {
    const pf = PN[r.platform as string] || (r.platform as string);
    const tl = r.time_limit || "—";
    const ml = r.memory_limit ? Math.round((r.memory_limit as number) / 1024) : "—";
    return `<tr>
      <td><a href="/problem/${esc(r.iden as string)}" class="mono">${esc(r.iden as string)}</a></td>
      <td><a href="/problem/${esc(r.iden as string)}">${esc(cleanName(r.name as string))}</a></td>
      <td>${platformTag(pf)}</td>
      <td>${diffTag(r.difficulty)}</td>
      <td style="color:var(--text-muted);font-size:12px">${tl}ms / ${ml}MB</td>
    </tr>`;
  }).join("");

  const pagi = buildPagination(opts.page, totalPages, opts.platform, opts.search);

  return layout("题目列表", `
<div class="container main">
  <div class="card">
    <div style="display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:20px">
      <h1 style="font-family:var(--serif);font-size:24px;font-weight:700;color:var(--accent)">Problems</h1>
      <span style="font-size:12px;color:var(--text-muted);font-weight:500;letter-spacing:.5px">${opts.total.toLocaleString()} RESULTS</span>
    </div>
    <form class="search-bar" method="GET" action="/problems">
      <input class="search-input" type="text" name="search" placeholder="Search by identifier or name…" value="${esc(opts.search)}">
      <select class="search-select" name="platform">
        <option value="">All Platforms</option>
        <option value="codeforces" ${opts.platform === "codeforces" ? "selected" : ""}>Codeforces</option>
        <option value="atcoder" ${opts.platform === "atcoder" ? "selected" : ""}>AtCoder</option>
        <option value="luogu" ${opts.platform === "luogu" ? "selected" : ""}>Luogu</option>
      </select>
      <button type="submit" class="btn-search">Search</button>
    </form>
    <table class="data-table">
      <thead><tr><th>Iden</th><th>Name</th><th>Platform</th><th>Difficulty</th><th>Limits</th></tr></thead>
      <tbody>${trs}</tbody>
    </table>
    ${pagi}
  </div>
</div>`);
}

function buildPagination(page: number, total: number, platform: string, search: string): string {
  if (total <= 1) return "";
  const qs = (p: number) => {
    const parts = [`page=${p}`];
    if (platform) parts.push(`platform=${encodeURIComponent(platform)}`);
    if (search) parts.push(`search=${encodeURIComponent(search)}`);
    return `?${parts.join("&")}`;
  };
  let h = '<div class="pagination">';
  if (page > 1) h += `<a href="/problems${qs(page - 1)}" class="page-btn">‹</a>`;
  const s = Math.max(1, page - 3), e = Math.min(total, page + 3);
  if (s > 1) { h += `<a href="/problems${qs(1)}" class="page-btn">1</a>`; if (s > 2) h += `<span class="page-btn disabled">…</span>`; }
  for (let i = s; i <= e; i++) h += i === page ? `<span class="page-btn active">${i}</span>` : `<a href="/problems${qs(i)}" class="page-btn">${i}</a>`;
  if (e < total) { if (e < total - 1) h += `<span class="page-btn disabled">…</span>`; h += `<a href="/problems${qs(total)}" class="page-btn">${total}</a>`; }
  if (page < total) h += `<a href="/problems${qs(page + 1)}" class="page-btn">›</a>`;
  h += "</div>";
  return h;
}

/* ------------------------------------------------------------------ */
/*  题目详情页                                                         */
/* ------------------------------------------------------------------ */

export function renderProblemPage(data: {
  problem: CoreProblem;
  statements: CoreProblemStatement[];
  meta: { iden: string; tags: string[]; sample_group: [string, string][]; created_at: string };
}): string {
  const { problem, statements, meta } = data;
  let diff = "—";
  if (typeof problem.difficulty === "object" && problem.difficulty !== null) {
    if ("NumberStyle" in problem.difficulty) diff = String(problem.difficulty.NumberStyle);
    if ("LuoguStyle" in problem.difficulty) diff = problem.difficulty.LuoguStyle;
  }

  const tags = meta.tags.length
    ? `<div class="tags-row">${meta.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : "";

  const tabH = statements.map((s, i) => {
    const label = s.is_translate ? `${s.language} · Translation` : `${s.language} · Original`;
    return `<div class="tab-item ${i === 0 ? "active" : ""}" data-tab="${i}">${label}</div>`;
  }).join("");

  const tabC = statements.map((s, i) =>
    `<div class="tab-panel ${i === 0 ? "active" : ""}" id="tab-${i}"><div class="md-body" data-md>${esc(s.content)}</div></div>`
  ).join("");

  let samples = "";
  if (meta.sample_group.length) {
    const items = meta.sample_group.map(([inp, out], i) =>
      `<div class="sample-pair">
        <div><div class="sample-label">Input #${i + 1}</div><pre class="sample-box">${esc(inp)}</pre></div>
        <div><div class="sample-label">Output #${i + 1}</div><pre class="sample-box">${esc(out)}</pre></div>
      </div>`
    ).join("");
    samples = `<div class="card"><div class="card-title">Samples<span class="line"></span></div>${items}</div>`;
  }

  const head = `
<script src="${KATEX_JS}"><\/script>
<script src="${KATEX_AUTO}"><\/script>
<script src="${MARKED_JS}"><\/script>`;

  return layout(problem.name, `
<div class="container main">
  <div class="card">
    <div class="problem-header">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <h1 class="problem-title">${esc(problem.name)}</h1>
        ${platformTag(problem.platform)}
      </div>
      <div class="problem-meta">
        <div class="meta-item"><strong>ID</strong><span style="font-family:var(--mono);font-size:12px">${esc(meta.iden)}</span></div>
        <div class="meta-item"><strong>Time</strong>${problem.limit.time_limit}ms</div>
        <div class="meta-item"><strong>Memory</strong>${Math.round(problem.limit.memory_limit / 1024)}MB</div>
        <div class="meta-item"><strong>Difficulty</strong>${diff}</div>
      </div>
      ${tags}
    </div>
  </div>
  <div class="card">
    ${statements.length > 1 ? `<div class="tab-bar">${tabH}</div>` : ""}
    ${tabC}
  </div>
  ${samples}
  <div class="card">
    <details>
      <summary>API Response (JSON)</summary>
      <pre class="code-block">${esc(JSON.stringify({ problem, statements: statements.map(s => ({ ...s, content: s.content.slice(0, 200) + "..." })) }, null, 2))}</pre>
      <div style="margin-top:10px;display:flex;gap:8px">
        <a href="/api/problems/${esc(meta.iden)}" class="btn-search" style="font-size:12px;padding:6px 14px">Full JSON</a>
        <a href="/api/problems/${esc(meta.iden)}/raw" class="btn-search" style="font-size:12px;padding:6px 14px;background:var(--text-secondary)">Raw Segments</a>
      </div>
    </details>
  </div>
</div>
<script>
document.querySelectorAll('.tab-item').forEach(t=>{
  t.addEventListener('click',()=>{
    const i=t.dataset.tab;
    document.querySelectorAll('.tab-item').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('tab-'+i).classList.add('active');
  });
});
document.querySelectorAll('[data-md]').forEach(el=>{
  const raw=el.textContent;
  el.innerHTML=marked.parse(raw);
  renderMathInElement(el,{
    delimiters:[
      {left:'$$',right:'$$',display:true},
      {left:'$',right:'$',display:false},
      {left:'\\\\(',right:'\\\\)',display:false},
      {left:'\\\\[',right:'\\\\]',display:true},
    ],
    throwOnError:false,
  });
});
<\/script>`, { head });
}

/* ------------------------------------------------------------------ */
/*  API 文档页                                                         */
/* ------------------------------------------------------------------ */

export function renderApiDocsPage(): string {
  return layout("API Documentation", `
<div class="container main">
  <div class="card">
    <h1 style="font-family:var(--serif);font-size:28px;font-weight:700;color:var(--accent);margin-bottom:6px">API Documentation</h1>
    <p style="color:var(--text-secondary);font-size:14px">RESTful API · JSON responses · Compatible with <code style="font-family:var(--mono);font-size:12px;background:var(--bg-muted);padding:2px 5px;border-radius:3px">packages/core</code> Rust types</p>
  </div>

  <div class="card">
    <div class="endpoint"><span class="method method-get">GET</span><span class="endpoint-path">/api/problems</span></div>
    <p class="api-desc">Paginated problem list with filtering.</p>
    <table class="param-table">
      <thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><code>page</code></td><td>number</td><td>1</td><td>Page number</td></tr>
        <tr><td><code>limit</code></td><td>number</td><td>20</td><td>Items per page (1–100)</td></tr>
        <tr><td><code>platform</code></td><td>string</td><td>—</td><td>Filter by platform</td></tr>
        <tr><td><code>search</code></td><td>string</td><td>—</td><td>Fuzzy search</td></tr>
      </tbody>
    </table>
    <pre class="code-block">{ "total": 35114, "page": 1, "limit": 20, "total_pages": 1756, "items": [...] }</pre>
  </div>

  <div class="card">
    <div class="endpoint"><span class="method method-get">GET</span><span class="endpoint-path">/api/problems/:iden</span></div>
    <p class="api-desc">Problem detail in core-compatible format. Returns suggestions on 404.</p>
    <pre class="code-block">{ "problem": {...}, "statements": [...], "meta": { "iden", "tags", "sample_group" } }</pre>
  </div>

  <div class="card">
    <div class="endpoint"><span class="method method-get">GET</span><span class="endpoint-path">/api/problems/:iden/raw</span></div>
    <p class="api-desc">Raw segmented data (paragraphs, samples, translations, formalizations).</p>
  </div>

  <div class="card">
    <div class="endpoint"><span class="method method-get">GET</span><span class="endpoint-path">/api/stats · /api/platforms</span></div>
    <p class="api-desc">Database statistics and platform listing.</p>
  </div>

  <div class="card">
    <div class="endpoint"><span class="method method-post">POST</span><span class="endpoint-path">/api/fetch/codeforces</span></div>
    <p class="api-desc">Fetch from Codeforces via browser proxy (Cloudflare bypass).</p>
    <pre class="code-block">{ "url": "CF1A" }   // or { "urls": ["CF1A","CF2B"] }</pre>
  </div>

  <div class="card">
    <div class="endpoint"><span class="method method-post">POST</span><span class="endpoint-path">/api/fetch/atcoder</span></div>
    <p class="api-desc">Fetch from AtCoder.</p>
    <pre class="code-block">{ "url": "abc300_a" }   // or { "urls": [...] }</pre>
  </div>

  <div class="card">
    <div class="endpoint"><span class="method method-post">POST</span><span class="endpoint-path">/api/fetch/codeforces/contest · /api/fetch/atcoder/contest</span></div>
    <p class="api-desc">Batch fetch by contest ID.</p>
    <pre class="code-block">{ "contest_id": 566 }   // CF: number, AT: string e.g. "abc300"</pre>
  </div>

  <div class="card">
    <div class="card-title">Type Definitions<span class="line"></span></div>
    <pre class="code-block">interface Problem {
  name: string;
  description: { content: string; description_type: "Markdown" | "Html" | "Typst" };
  platform: string;
  limit: { time_limit: number; memory_limit: number };  // ms / KB
  difficulty: { NumberStyle: number } | { LuoguStyle: string } | "None";
  is_remote: boolean; is_sync: boolean; sync_url: string | null; sign: string | null;
}

interface ProblemStatement {
  statement_type: "Markdown" | "Html" | "Pdf" | "Typst";
  content: string;
  is_translate: boolean;
  language: "Chinese" | "English" | "Japanese" | "Russian";
}</pre>
  </div>

  <div class="callout">
    <div class="callout-title">Notes</div>
    <ul style="margin:0 0 0 16px;line-height:1.9;color:var(--text-secondary);font-size:14px">
      <li><strong>limit</strong> — time_limit (ms), memory_limit (KB)</li>
      <li><strong>difficulty</strong> — Rust serde externally-tagged enum format</li>
      <li><strong>Math</strong> — LaTeX, rendered with KaTeX on the client</li>
      <li><strong>CF fetch</strong> — Uses puppeteer-real-browser with auto-retry</li>
    </ul>
  </div>
</div>`);
}