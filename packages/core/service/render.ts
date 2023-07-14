import * as fs from 'fs';
import * as path from 'path';

export const templateHTML = {
    RenderHTML: '',
};
export let manifest = {};

export async function RenderFromPage(datas = {}) {
    const html = templateHTML['RenderHTML'].replace(
        '<!--DEVSERVER-->',
        global.Project.env === 'prod'
            ? `
        <link rel="stylesheet" href="/${manifest['src/main.css'].file}" />
        <link rel="stylesheet" href="/${manifest['src/main.tsx'].css[0]}" />
        <script type="module" src="/${manifest['src/main.tsx'].file}"></script>
        <script>window.web = ${JSON.stringify(datas)}</script>
        `
            : `
            <script type="module">
                import RefreshRuntime from 'http://localhost:${global.Project.uiport}/@react-refresh'
                RefreshRuntime.injectIntoGlobalHook(window)
                window.$RefreshReg$ = () => {}
                window.$RefreshSig$ = () => (type) => type
                window.__vite_plugin_react_preamble_installed__ = true
            </script>
            <script>window.web = ${JSON.stringify(datas)}</script>
            <script type="module" src="http://localhost:${global.Project.uiport}/src/main.tsx"></script>
            <script type="module" src="http://localhost:${global.Project.uiport}/@vite/client"></script>
        `
    );
    return html;
}

export async function apply() {
    templateHTML['RenderHTML'] = (await fs.readFileSync(path.join(__dirname, '..', '..', 'ui', 'index.html'))).toString();
    if (global.Project.env === 'prod') {
        manifest = JSON.parse(await fs.readFileSync(path.join(__dirname, '..', '..', 'ui', 'dist', 'manifest.json')).toString());
        // console.log(manifest);
    }
}
