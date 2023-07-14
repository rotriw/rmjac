const esbuild = require('esbuild');
const fs = require('fs');
let map = {};
require('source-map-support').install({
    handleUncaughtExceptions: false,
    environment: 'node',
    retrieveSourceMap(file) {
        if (map[file]) {
            return {
                url: file,
                map: map[file],
            };
        }
        return null;
    },
});

const major = +process.version.split('.')[0].split('v')[1];
const minor = +process.version.split('.')[1];

const tsconfigRaw = `{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "moduleResolution": "node",
    "sourceMap": false,
    "composite": true,
    "strictBindCallApply": true,
    "experimentalDecorators": true,
//    "emitDecoratorMetadata": true,
    "incremental": true
  }
}
`;

function transform(filename) {
    const code = fs.readFileSync(filename, 'utf-8');
    const result = esbuild.transformSync(code, {
        sourcefile: filename,
        tsconfigRaw: tsconfigRaw,
        sourcemap: 'both',
        format: 'cjs',
        loader: 'tsx',
        target: `node${major}.${minor}`,
        jsx: 'transform',
    });
    map[filename] = result.map;
    if (result.warnings.length) console.warn(result.warnings);
    return result.code;
}

require.extensions['.ts'] = require.extensions['.tsx'] = function loader(module, filename) {
    return module._compile(transform(filename), filename);
};
