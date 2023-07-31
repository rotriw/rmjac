import * as fs from 'fs';
import * as path from 'path';
import { runModel } from 'rmjac-config';

export const templateHTML = {
    RenderHTML: '',
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let manifest: Record<string, any> = {};

export async function RenderFromPage(datas = {}) {
    Object.assign(datas);
    const html = templateHTML['RenderHTML'].replace(
        '<!--DEVSERVER-->',
        runModel.env === 'prod'
            ? `
        <link rel="stylesheet" href="/${manifest['src/main.css'].file}" />
        <link rel="stylesheet" href="/${manifest['src/main.tsx'].css[0]}" />
        <script type="module" src="/${manifest['src/main.tsx'].file}"></script>
        <script>window.web = ${JSON.stringify(datas)}</script>
        `
            : `
            <script type="module">
                import RefreshRuntime from 'http://localhost:${runModel.uiport}/@react-refresh'
                RefreshRuntime.injectIntoGlobalHook(window)
                window.$RefreshReg$ = () => {}
                window.$RefreshSig$ = () => (type) => type
                window.__vite_plugin_react_preamble_installed__ = true
            </script>
            <script>window.web = ${JSON.stringify(datas)}</script>
            <script type="module" src="http://localhost:${runModel.uiport}/src/main.tsx"></script>
            <script type="module" src="http://localhost:${runModel.uiport}/@vite/client"></script>
        `
    );
    return html;
}

export async function apply() {
    templateHTML['RenderHTML'] = (await fs.readFileSync(path.join(__dirname, '..', '..', 'ui', 'index.html'))).toString();
    if (runModel.env === 'prod') {
        manifest = JSON.parse(await fs.readFileSync(path.join(__dirname, '..', '..', 'ui', 'dist', 'manifest.json')).toString());
    }
}
