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
exports.run = void 0;
var fs = require("fs");
var path = require("path");
var compare_versions_1 = require("compare-versions");
var log4js = require("log4js");
var _ = require("lodash");
var loggerUpdated = log4js.getLogger('updated');
function updatedVersion(from, to) {
    return __awaiter(this, void 0, void 0, function () {
        var pathT, version, UpdatedDir, pack, sorted, i;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pathT = path.join(global.Project.core, 'updated');
                    version = [];
                    return [4 /*yield*/, fs.readdirSync(pathT)];
                case 1:
                    UpdatedDir = _a.sent();
                    for (pack in UpdatedDir) {
                        version.push(_.trim(UpdatedDir[pack].toString(), '.ts'));
                    }
                    sorted = version.sort(compare_versions_1.compareVersions);
                    i = 0;
                    _a.label = 2;
                case 2:
                    if (!(i < sorted.length)) return [3 /*break*/, 5];
                    if (!((0, compare_versions_1.compare)(from, sorted[i], '<') && (0, compare_versions_1.compare)(to, sorted[i], '<='))) return [3 /*break*/, 4];
                    loggerUpdated.info("Updated Log: v".concat(i === 0 ? from : sorted[i - 1], " => v").concat(sorted[i]));
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    return [4 /*yield*/, require(path.join(process.cwd(), global.Project.core, 'updated', "".concat(sorted[i], ".ts"))).apply()];
                case 3:
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    _a.sent();
                    _a.label = 4;
                case 4:
                    i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var nowVersion, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    loggerUpdated.level = global.Project.loglevel;
                    if (!fs.existsSync(path.join(global.Project.core, 'version.local'))) return [3 /*break*/, 7];
                    nowVersion = fs.readFileSync(path.join(global.Project.core, 'version.local')).toString();
                    if (!~(0, compare_versions_1.compareVersions)(nowVersion, global.Project.CoreJSON.version)) return [3 /*break*/, 1];
                    loggerUpdated.info('The latest version, No updated required.');
                    return [3 /*break*/, 6];
                case 1:
                    loggerUpdated.info("Need Updated. Version:  v".concat(nowVersion, " => v").concat(global.Project.CoreJSON.version));
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, updatedVersion(nowVersion, global.Project.CoreJSON.version)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _a.sent();
                    loggerUpdated.error('Updated:error');
                    loggerUpdated.error(err_1);
                    return [3 /*break*/, 5];
                case 5:
                    loggerUpdated.info('Updated done.');
                    _a.label = 6;
                case 6:
                    fs.writeFileSync(path.join(global.Project.core, 'version.local'), global.Project.CoreJSON.version);
                    return [3 /*break*/, 8];
                case 7:
                    fs.writeFileSync(path.join(global.Project.core, 'version.local'), global.Project.CoreJSON.version);
                    _a.label = 8;
                case 8: return [2 /*return*/];
            }
        });
    });
}
exports.run = run;
