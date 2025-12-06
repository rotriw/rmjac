import { JSDOM } from "jsdom";
import { convertCodeforcesDomToTypst, convertHTML } from "../../vjudge/codeforces/parse/tools.ts";

const statement1 = `
<html>
<body>
    <div class="problem-statement">
        <p></p>
        <p>You are given a sequence of $$$n$$$ integers $$$a_1,a_2,\\ldots,a_n$$$.</p>
        <p>
            You would like to partition $$$a$$$ into several <span class="tex-font-style-bf">subsequences</span>$$$^{\\text{∗}}$$$ $$$b_1,b_2,\\ldots,b_k$$$,
            satisfying the following conditions:
        </p>
        <ul>
            <li>Each element in $$$a$$$ belongs to exactly one of $$$b_i$$$.</li>
            <li>
                For each sequence $$$b_i$$$, let its elements be $$$b_{i,1},b_{i,2},\\ldots,b_{i,p_i}$$$. For every $$$1\\le j&lt;p_i$$$, $$$|b_{i,j}-b_{i,j+1}|=1$$$
                should hold.
            </li>
        </ul>
        <p>Please calculate the minimum number of subsequences you can partition $$$a$$$ into.</p>
        <div class="statement-footnote">
            <p>
                $$$^{\\text{∗}}$$$A sequence $$$b_i$$$ is a subsequence of a sequence $$$a$$$ if $$$b_i$$$ can be obtained from $$$a$$$ by the deletion of several
                (possibly, zero or all) element from arbitrary positions.
            </p>
        </div>
    </div>
   </body></html>
`;

const statement2 = `<html>
<body>
    <div class="problem-statement">
<p>$$$a \\over b$$$ You are given two integers $$$a$$$ and $$$b$$$. Print $$$a+b$$$.$$$^{\\text{∗}}$$$$$$^{\\text{†}}$$$$$$^{\\text{‡}}$$$$$$^{\\text{§}}$$$$$$^{\\text{¶}}$$$$$$^{\\text{∥}}$$$</p><p></p><div class="statement-footnote"><p>$$$^{\\text{∗}}$$$first</p><p>$$$^{\\text{†}}$$$second</p><p>$$$^{\\text{‡}}$$$third</p><p>$$$^{\\text{§}}$$$third</p><p>$$$^{\\text{¶}}$$$fourth</p><p>$$$^{\\text{∥}}$$$fifth</p>
</div>
    </div>
   </body></html>`;

const statementWithImg = `<html>
<body>
    <div class="problem-statement">
    <p>In the first test case of the first input set, the <span class="tex-font-style-it">spectacle</span> of the following sub-squares is summed:</p><center> <img class="tex-graphics" src="https://espresso.codeforces.com/2b5720d298ae459a1a0537c1a313e1d97a00f238.png" style="max-width: 100.0%;max-height: 100.0%;" /> <span class="tex-font-size-small">Yellow color corresponds to the sub-squares, green — to the rest of the grid squares.</span> </center><p>The picture shows the optimal arrangement of the gorillas. The <span class="tex-font-style-it">spectacle</span> of the arrangement is $$$4 + 4 + 3 + 3 + 4 + 3 = 21$$$.</p></div></div><p>  </p>
   </body></html>`;


const done = `
<html>
<body>
<div class="problemindexholder" problemindex="A" data-uuid="ps_e2154ea1b0deae8025e1333d2432fed2bd08b576">
    <div class="ttypography">
        <div class="problem-statement">
            <div class="header">
                <div class="title">A. Shizuku Hoshikawa and Farm Legs</div>
                <div class="time-limit">
                    <div class="property-title">time limit per test</div>
                    1 second
                </div>
                <div class="memory-limit">
                    <div class="property-title">memory limit per test</div>
                    256 megabytes
                </div>
                <div class="input-file input-standard">
                    <div class="property-title">input</div>
                    standard input
                </div>
                <div class="output-file output-standard">
                    <div class="property-title">output</div>
                    standard output
                </div>
            </div>
            <div>
                <div class="epigraph">
                    <div class="epigraph-text"><span class="tex-font-style-it">Nothing's ever been the same since... that summer with her.</span></div>
                    <div class="epigraph-source">— Shizuku Hoshikawa</div>
                </div>
                <p>
                    <span class="tex-font-style-it"
                        >Kaori wants to spend the day with Shizuku! However, the zoo is closed, so they are visiting Farmer John's farm instead.</span
                    >
                </p>
                <p>
                    At Farmer John's farm, Shizuku counts $$$n$$$ legs. <a href="https://codeforces.com/contest/1996/problem/A">It is known that</a> only
                    chickens and cows live on the farm; a chicken has $$$2$$$ legs, while a cow has $$$4$$$.
                </p>
                <p>
                    Count how many different configurations of Farmer John's farm are possible. Two configurations are considered different if they contain
                    either a different number of chickens, a different number of cows, or both.
                </p>
                <p>Note that Farmer John's farm may contain zero chickens or zero cows.</p>
            </div>
            <div class="input-specification">
                <div class="section-title">Input</div>
                <p>The first line contains a single integer $$$t$$$ ($$$1 \leq t \leq 100$$$) — the number of test cases.</p>
                <p>The only line of each test case contains a single integer $$$n$$$ ($$$1\leq n \leq 100$$$).</p>
            </div>
            <div class="output-specification">
                <div class="section-title">Output</div>
                <p>For each test case, output a single integer, the number of different configurations of Farmer John's farm that are possible.</p>
            </div>
            <div class="sample-tests">
                <div class="section-title">Example</div>
                <div class="sample-test">
                    <div class="input">
                        <div class="title">Input</div>
                        <pre>
<div class="test-example-line test-example-line-even test-example-line-0">5</div><div class="test-example-line test-example-line-odd test-example-line-1">2</div><div class="test-example-line test-example-line-even test-example-line-2">3</div><div class="test-example-line test-example-line-odd test-example-line-3">4</div><div class="test-example-line test-example-line-even test-example-line-4">6</div><div class="test-example-line test-example-line-odd test-example-line-5">100</div></pre>
                    </div>
                    <div class="output">
                        <div class="title">Output</div>
                        <pre>
<div class="test-example-line test-example-line-odd test-example-line-1">1</div><div class="test-example-line test-example-line-even test-example-line-2">0</div><div class="test-example-line test-example-line-odd test-example-line-3">2</div><div class="test-example-line test-example-line-even test-example-line-4">2</div><div class="test-example-line test-example-line-odd test-example-line-5">26</div></pre>
                    </div>
                </div>
            </div>
            <div class="note">
                <div class="section-title">Note</div>
                <p>For $$$n=4$$$, there are two possible configurations of Farmer John's farm:</p>
                <ul>
                    <li>he can have two chickens and zero cows, or</li>
                    <li>he can have zero chickens and one cow.</li>
                </ul>
                It can be shown that these are the only possible configurations of Farmer John's farm.
                <p>For $$$n=3$$$, it can be shown that there are no possible configurations of Farmer John's farm.</p>
            </div>
        </div>
        <p></p>
    </div>
</div>
   </body></html>

`;

const done2 = `
<html>
<body>

<div class="problemindexholder" problemindex="B" data-uuid="ps_87729d311b0a81b32aff764cc38ec0f05e1e5ea9">
    <div style="display: none; margin:1em 0;text-align: center; position: relative;" class="alert alert-info diff-notifier">
        <div>The problem statement has recently been changed. <a class="view-changes" href="#">View the changes.</a></div>
        <span class="diff-notifier-close" style="position: absolute; top: 0.2em; right: 0.3em; cursor: pointer; font-size: 1.4em;">&times;</span>
    </div>
        <div class="ttypography"><div class="problem-statement"><div class="header"><div class="title">B. Yuu Koito and Minimum Absolute Sum</div><div class="time-limit"><div class="property-title">time limit per test</div>2 seconds</div><div class="memory-limit"><div class="property-title">memory limit per test</div>256 megabytes</div><div class="input-file input-standard"><div class="property-title">input</div>standard input</div><div class="output-file output-standard"><div class="property-title">output</div>standard output</div></div><div><div class="epigraph"><div class="epigraph-text"><span class="tex-font-style-it">The words in shoujo manga and love songs... they're always sparkling brightly. I don't need a dictionary to understand the meaning... but I've never felt them for myself.</span></div><div class="epigraph-source">— Yuu Koito</div></div><p><span class="tex-font-style-it">Yuu is trying out the student council! Unfortunately, she is being forced to do clerical work... Touko wants her to fill out the blanks in various student council documents.</span></p><p>You are given a partially filled array of nonnegative integers $$$a_1, a_2, \\dots, a_n$$$, where blank elements are denoted with $$$-1$$$. You would like to fill in the blank elements with nonnegative integers, such that the absolute value of the sum of the elements in its difference array is minimized.</p><p>More formally, let $$$b$$$ be the array of length $$$n-1$$$ such that $$$b_i = a_{i+1} - a_i$$$ for all $$$1\\leq i\\leq n-1$$$. Find the minimum possible value of $$$|b_1 + b_2 + \\dots + b_{n-1}|$$$, across all possible ways to fill in the blank elements of $$$a$$$.</p><p>Additionally, output the array that achieves this minimum. If there are multiple such arrays, output the one that is <span class="tex-font-style-bf">lexicographically smallest</span>$$$^{\\text{∗}}$$$.</p><div class="statement-footnote"><p>$$$^{\\text{∗}}$$$For two arbitrary arrays $$$c$$$ and $$$d$$$ of length $$$n$$$, we say that $$$c$$$ is <span class="tex-font-style-it">lexicographically smaller</span> than $$$d$$$ if there exists an index $$$i$$$ ($$$1\\leq i\\leq n$$$) such that $$$c_j = d_j$$$ for all $$$j&lt;i$$$, and $$$c_i &lt; d_i$$$. In other words, $$$c$$$ and $$$d$$$ differ in at least one index, and at the first index at which they differ, $$$c_i$$$ is smaller than $$$d_i$$$.</p></div></div><div class="input-specification"><div class="section-title">Input</div><p>The first line contains a single integer $$$t$$$ ($$$1 \leq t \leq 10^4$$$)  — the number of test cases.</p><p>The first line of each test case contains a single integer $$$n$$$ ($$$2\\leq n\\leq 2\\cdot 10^5$$$).</p><p>The second line of each test case contains $$$n$$$ integers, $$$a_1, a_2, \\dots, a_n$$$ ($$$-1\\leq a_i \\leq 10^6$$$).</p><p>It is guaranteed that the sum of $$$n$$$ over all test cases does not exceed $$$2\\cdot 10^5$$$.</p></div><div class="output-specification"><div class="section-title">Output</div><p>For each test case, on the first line, output the minimum possible value of $$$|b_1 + b_2 + \\dots + b_{n-1}|$$$. Then, on the second line, output $$$n$$$ integers, the values of $$$a_1, a_2, \\dots, a_n$$$ in the lexicographically smallest array achieving this minimum.</p></div><div class="sample-tests"><div class="section-title">Example</div><div class="sample-test"><div class="input"><div class="title">Input</div><pre>
<div class="test-example-line test-example-line-even test-example-line-0">6</div><div class="test-example-line test-example-line-odd test-example-line-1">4</div><div class="test-example-line test-example-line-odd test-example-line-1">2 -1 7 1</div><div class="test-example-line test-example-line-even test-example-line-2">4</div><div class="test-example-line test-example-line-even test-example-line-2">-1 2 4 -1</div><div class="test-example-line test-example-line-odd test-example-line-3">8</div><div class="test-example-line test-example-line-odd test-example-line-3">2 -1 1 5 11 12 1 -1</div><div class="test-example-line test-example-line-even test-example-line-4">3</div><div class="test-example-line test-example-line-even test-example-line-4">-1 -1 -1</div><div class="test-example-line test-example-line-odd test-example-line-5">3</div><div class="test-example-line test-example-line-odd test-example-line-5">2 5 4</div><div class="test-example-line test-example-line-even test-example-line-6">2</div><div class="test-example-line test-example-line-even test-example-line-6">-1 5</div></pre></div><div class="output"><div class="title">Output</div><pre>
<div class="test-example-line test-example-line-odd test-example-line-1">1</div><div class="test-example-line test-example-line-odd test-example-line-1">2 0 7 1</div><div class="test-example-line test-example-line-even test-example-line-2">0</div><div class="test-example-line test-example-line-even test-example-line-2">0 2 4 0</div><div class="test-example-line test-example-line-odd test-example-line-3">0</div><div class="test-example-line test-example-line-odd test-example-line-3">2 0 1 5 11 12 1 2</div><div class="test-example-line test-example-line-even test-example-line-4">0</div><div class="test-example-line test-example-line-even test-example-line-4">0 0 0</div><div class="test-example-line test-example-line-odd test-example-line-5">2</div><div class="test-example-line test-example-line-odd test-example-line-5">2 5 4</div><div class="test-example-line test-example-line-even test-example-line-6">0</div><div class="test-example-line test-example-line-even test-example-line-6">5 5</div></pre></div></div></div><div class="note"><div class="section-title">Note</div><p>In the first example, we fill in the array $$$a = [2, 0, 7, 1]$$$, which yields the difference array $$$b = [-2, 7, -6]$$$.</p><p>The absolute value of the sum of the elements in $$$b$$$ is $$$1$$$. It can be proven that this is the minimum possible. Furthermore, it can be proven that this is the lexicographically smallest array $$$a$$$ that achieves this minimum.</p></div></div><p>  </p></div>
</div>
</body></html>

`;


const colorfulStatement = `<html>
<body>
    <div class="problem-statement">
        <p>$$$0\\leq a_i, b_i\\leq {\\color{red}{1}}$$$</p>
    </div>
   </body></html>
`;

const haveCode = `
<html><body><div class="problem-statement">
><p>You are given two integers $$$a$$$ and $$$b$$$. Print $$$a+b$$$.$$$^{\\text{∗}}$$$$$$^{\\text{†}}$$$$$$^{\\text{‡}}$$$$$$^{\\text{§}}$$$$$$^{\\text{¶}}$$$$$$^{\\text{∥}}$$$</p><p></p><pre class="lstlisting"><code class="prettyprint">#include &lt;iostream&gt;<br />int main() {<br />    int a, b;<br />    std::cin &gt;&gt; a &gt;&gt; b;<br />    std::cout &lt;&lt; a + b &lt;&lt; std::endl;<br />}<br /></code></pre><p></p><p></p>


</div></body></html>`;


const SpecialWordTest = `
<html><body><div class="problem-statement">

<p>$$$1 = 2 > 3 < 4  5 * 6$$$</p>

</div></body></html>`;


// let valued = new JSDOM(statement1);
// console.log(await convertHTML(valued.window.document.querySelector('.problem-statement')));

let valued2 = new JSDOM(statement2);
console.log(await convertHTML(valued2.window.document.querySelector('.problem-statement')));

// let valued3 = new JSDOM(statementWithImg);
// console.log(await convertHTML(valued3.window.document.querySelector('.problem-statement')));


// let valued4 = new JSDOM(done);
// console.log(await convertCodeforcesDomToTypst(valued4));

// let valued5 = new JSDOM(done2);
// console.log(await convertCodeforcesDomToTypst(valued5));

// let valuedColorful = new JSDOM(colorfulStatement);
// console.log(await convertHTML(valuedColorful.window.document.querySelector('.problem-statement')));

// let valuedHaveCode = new JSDOM(haveCode);
// console.log(await convertHTML(valuedHaveCode.window.document.querySelector('.problem-statement')));

// let valuedSpecialWord = new JSDOM(SpecialWordTest);
// console.log(await convertHTML(valuedSpecialWord.window.document.querySelector('.problem-statement')));
