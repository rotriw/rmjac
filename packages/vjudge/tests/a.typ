% Options for packages loaded elsewhere
\PassOptionsToPackage{unicode}{hyperref}
\PassOptionsToPackage{hyphens}{url}
\documentclass[
]{article}
\usepackage{xcolor}
\usepackage{amsmath,amssymb}
\setcounter{secnumdepth}{-\maxdimen} % remove section numbering
\usepackage{iftex}
\ifPDFTeX
  \usepackage[T1]{fontenc}
  \usepackage[utf8]{inputenc}
  \usepackage{textcomp} % provide euro and other symbols
\else % if luatex or xetex
  \usepackage{unicode-math} % this also loads fontspec
  \defaultfontfeatures{Scale=MatchLowercase}
  \defaultfontfeatures[\rmfamily]{Ligatures=TeX,Scale=1}
\fi
\usepackage{lmodern}
\ifPDFTeX\else
  % xetex/luatex font selection
\fi
% Use upquote if available, for straight quotes in verbatim environments
\IfFileExists{upquote.sty}{\usepackage{upquote}}{}
\IfFileExists{microtype.sty}{% use microtype if available
  \usepackage[]{microtype}
  \UseMicrotypeSet[protrusion]{basicmath} % disable protrusion for tt fonts
}{}
\makeatletter
\@ifundefined{KOMAClassName}{% if non-KOMA class
  \IfFileExists{parskip.sty}{%
    \usepackage{parskip}
  }{% else
    \setlength{\parindent}{0pt}
    \setlength{\parskip}{6pt plus 2pt minus 1pt}}
}{% if KOMA class
  \KOMAoptions{parskip=half}}
\makeatother
\setlength{\emergencystretch}{3em} % prevent overfull lines
\providecommand{\tightlist}{%
  \setlength{\itemsep}{0pt}\setlength{\parskip}{0pt}}
\usepackage{bookmark}
\IfFileExists{xurl.sty}{\usepackage{xurl}}{} % add URL line breaks if available
\urlstyle{same}
\hypersetup{
  hidelinks,
  pdfcreator={LaTeX via pandoc}}

\author{}
\date{}

\begin{document}

\begin{verbatim}
<div style="display: none; margin:1em 0;text-align: center; position: relative;" class="alert alert-info diff-notifier">
    <div>The problem statement has recently been changed. <a class="view-changes" href="#">View the changes.</a></div>
    <span class="diff-notifier-close" style="position: absolute; top: 0.2em; right: 0.3em; cursor: pointer; font-size: 1.4em;">&times;</span>
</div>
    <div class="ttypography"><div class="problem-statement"><div class="header"><div class="title">D. Locked Out</div><div class="time-limit"><div class="property-title">time limit per test</div>2 seconds</div><div class="memory-limit"><div class="property-title">memory limit per test</div>512 megabytes</div><div class="input-file input-standard"><div class="property-title">input</div>standard input</div><div class="output-file output-standard"><div class="property-title">output</div>standard output</div></div><div><div class="epigraph"><div class="epigraph-text"><span class="tex-font-style-it">Who's a good array? You're a good array! (c)</span></div></div> <p>An array $$b$$ is <span class="tex-font-style-it">good</span> if there do not exist indices $$1 \leq i &lt; j \leq |b|$$ such that $$b_j - b_i = 1$$.</p><p>You are given an integer. array $$$a_1, a_2, \ldots, a_n$$$. Determine the <span class="tex-font-style-bf">minimum number of elements</span> that need to be removed from the given array so that it becomes a good array.</p></div><div class="input-specification"><div class="section-title">Input</div><p>Each test contains multiple test cases. The first line contains the number of test cases $$$t$$$ ($$$1 \le t \le 6 \cdot 10^4$$$). The description of the test cases follows. </p><p>The first line of each test case contains an integer $$$n$$$ ($$$1 \leq n \leq 3 \cdot 10^5$$$) — the number of elements in the array.</p><p>The second line of each test case contains $$$n$$$ integers $$$a_1$$$, $$$a_2$$$, $$$\ldots$$$, $$$a_n$$$ ($$$1 \leq a_i \leq n$$$) — the elements of the array.</p><p>It is guaranteed that the sum of $$$n$$$ over all test cases does not exceed $$$3 \cdot 10^5$$$.</p></div><div class="output-specification"><div class="section-title">Output</div><p>For each test case, print a single integer — the minimum number of elements that need to be removed from the array to make it a good array.</p></div><div class="sample-tests"><div class="section-title">Example</div><div class="sample-test"><div class="input"><div class="title">Input</div><pre>
\end{verbatim}

6

1

1

5

1 2 3 4 5

5

5 4 3 2 1

5

5 5 5 4 4

7

1 7 1 2 5 7 1

6

1 2 5 6 5 5

Output

Note

In the first test case, the array is good from the very beginning, so
nothing needs to be removed from it.

In the second test case, the optimal solution is to remove the second
and fourth elements of the array, which will result in \[1\], \[3\],
\[5\] array.

In the third test case, the array is good from the very beginning.

In the fourth test case, the array is good from the very beginning.

In the fifth test case, the optimal solution is to remove the fourth
element of the array, which will result in \[$1\]\$, \[$7\]\$, \[$1\]\$,
\[$5\]\$, \[$7\]\$, \[$1\]\$ array.

In the sixth test case, one of the optimal solutions is to remove the
first and fourth elements of the array, which will result in \[$2\]\$,
\[$5\]\$, \[$5\]\$, \[$5\]\$ array.

\end{document}
