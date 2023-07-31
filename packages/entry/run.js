"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var fs = require("fs");
var path = require("path");
var log4js = require("log4js");
var Updated = require("./update");
// eslint-disable-next-line @typescript-eslint/no-var-requires
var argv = require('yargs').alias('c', 'config').alias('l', 'log').alias('d', 'debug').alias('cv', 'current').alias('t', 'test').argv;
global.Project = {
    env: 'prod',
    loglevel: 'INFO',
    config: 'config.json',
    version: '',
    core: 'packages/core',
    currentVersion: '0',
    port: '8060',
    uiport: '5173'
};
Object.assign(global.Project, argv);
if (argv.debug) {
    global.Project.env = 'dev';
    global.Project.loglevel = 'DEBUG';
}
var ctxs = {};
function run() {
    return __awaiter(this, void 0, void 0, function () {
        function RunAll(packages, paths, type) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, _b, _c, _i, pack, runner, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            _a = packages;
                            _b = [];
                            for (_c in _a)
                                _b.push(_c);
                            _i = 0;
                            _f.label = 1;
                        case 1:
                            if (!(_i < _b.length)) return [3 /*break*/, 8];
                            _c = _b[_i];
                            if (!(_c in _a)) return [3 /*break*/, 7];
                            pack = _c;
                            if (!packages[pack].endsWith('.ts') && !packages[pack].endsWith('.js')) {
                                return [3 /*break*/, 7];
                            }
                            runner = require(path.join(process.cwd(), paths, packages[pack]));
                            if (!(type === 'service')) return [3 /*break*/, 4];
                            if (!(typeof runner['apply'] !== 'undefined')) return [3 /*break*/, 3];
                            _d = ctxs;
                            _e = packages[pack];
                            return [4 /*yield*/, runner['apply'](ctxs)];
                        case 2:
                            _d[_e] = _f.sent();
                            _f.label = 3;
                        case 3: return [3 /*break*/, 6];
                        case 4:
                            if (!(typeof runner['apply'] !== 'undefined')) return [3 /*break*/, 6];
                            return [4 /*yield*/, runner['apply'](ctxs)];
                        case 5:
                            _f.sent();
                            _f.label = 6;
                        case 6:
                            logger.info("".concat(type, " ").concat(packages[pack], " Loaded."));
                            _f.label = 7;
                        case 7:
                            _i++;
                            return [3 /*break*/, 1];
                        case 8: return [2 /*return*/];
                    }
                });
            });
        }
        function RunFile(pack, packname, type) {
            return __awaiter(this, void 0, void 0, function () {
                var runner;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            runner = require(path.join(process.cwd(), pack));
                            return [4 /*yield*/, runner.apply(ctxs)];
                        case 1:
                            _a.sent();
                            logger.info("".concat(type, " ").concat(packname, " Loaded."));
                            return [2 /*return*/];
                    }
                });
            });
        }
        var logger, _a, _b, _c, files, ServiceDir, Handler, err_1;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, log4js.getLogger('main')];
                case 1:
                    logger = _d.sent();
                    logger.level = global.Project.loglevel;
                    _a = global.Project;
                    _c = (_b = JSON).parse;
                    return [4 /*yield*/, fs.readFileSync(path.join(global.Project.core, 'package.json'))];
                case 2:
                    _a.CoreJSON = _c.apply(_b, [(_d.sent()).toString()]);
                    global.Project.log = {
                        main: logger
                    };
                    global.Project.redis = {};
                    _d.label = 3;
                case 3:
                    _d.trys.push([3, 15, , 16]);
                    if (!!argv.noprepare) return [3 /*break*/, 11];
                    return [4 /*yield*/, fs.readFileSync(global.Project.config)];
                case 4:
                    files = _d.sent();
                    global.Project.config = JSON.parse(files.toString());
                    return [4 /*yield*/, fs.readdirSync(path.join(global.Project.core, 'service'))];
                case 5:
                    ServiceDir = _d.sent();
                    return [4 /*yield*/, RunAll(ServiceDir, path.join(global.Project.core, 'service'), 'service')];
                case 6:
                    _d.sent();
                    return [4 /*yield*/, Updated.run()];
                case 7:
                    _d.sent();
                    return [4 /*yield*/, RunFile(path.join(global.Project.core, 'handle'), 'handle', 'handle')];
                case 8:
                    _d.sent();
                    return [4 /*yield*/, fs.readdirSync(path.join(global.Project.core, 'handler'))];
                case 9:
                    Handler = _d.sent();
                    return [4 /*yield*/, RunAll(Handler, path.join(global.Project.core, 'handler'), 'handler')];
                case 10:
                    _d.sent();
                    return [3 /*break*/, 12];
                case 11:
                    logger.info('without prepare! do not use it in PROD.');
                    _d.label = 12;
                case 12:
                    if (!argv.test) return [3 /*break*/, 14];
                    return [4 /*yield*/, require(path.join(process.cwd(), global.Project.core, 'test', 'index.js'))];
                case 13:
                    _d.sent();
                    _d.label = 14;
                case 14: return [3 /*break*/, 16];
                case 15:
                    err_1 = _d.sent();
                    console.error(err_1);
                    return [3 /*break*/, 16];
                case 16: return [2 /*return*/];
            }
        });
    });
}
run();
