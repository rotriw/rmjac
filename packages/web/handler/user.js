"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
exports.apply = void 0;
var js_sha512_1 = require("js-sha512");
var handle_1 = require("../handle");
var user_1 = require("rmjac-core/model/user");
var render_1 = require("rmjac-core/service/render");
var decorate_1 = require("rmjac-core/utils/decorate");
var error_1 = require("rmjac-core/declare/error");
var token_1 = require("rmjac-core/model/token");
var type_1 = require("rmjac-core/declare/type");
var perm_1 = require("rmjac-core/declare/perm");
var rmjac_config_1 = require("rmjac-config");
function randomString(length) {
    var str = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i) {
        result += str[Math.floor(Math.random() * str.length)];
    }
    return result;
}
var RegisterHandler = /** @class */ (function (_super) {
    __extends(RegisterHandler, _super);
    function RegisterHandler() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RegisterHandler.prototype.postCreate = function (username, password, gender, email) {
        return __awaiter(this, void 0, void 0, function () {
            var parsedGender, randomSalt, configSalt, hashedPassword, data, err_1, tErr;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        parsedGender = 0;
                        if (typeof gender === 'string') {
                            parsedGender = gender === 'female' ? 0 : 1;
                        }
                        else {
                            parsedGender = gender;
                        }
                        randomSalt = randomString(rmjac_config_1.config.salt.strength || 8);
                        configSalt = rmjac_config_1.config.salt.salt;
                        hashedPassword = (0, js_sha512_1.sha512)(password + randomSalt + configSalt);
                        return [4 /*yield*/, user_1.user.create({
                                username: username,
                                pwd: hashedPassword,
                                salt: randomSalt,
                                email: email,
                                gender: parsedGender,
                                gravatarLink: 'default',
                                description: 'default'
                            })];
                    case 1:
                        data = _a.sent();
                        this.ctx.body = {
                            status: 'success',
                            data: data
                        };
                        return [3 /*break*/, 3];
                    case 2:
                        err_1 = _a.sent();
                        tErr = err_1;
                        this.ctx.body = {
                            status: 'error',
                            type: (tErr === null || tErr === void 0 ? void 0 : tErr.errorType) || 'unknown',
                            param: (tErr === null || tErr === void 0 ? void 0 : tErr.errorParam) || ''
                        };
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // As Interface Demo
    /* deprecated */
    // @param('username')
    // @param('password')
    // @param('gender')
    // @param('grade')
    // @param('email')
    // async postCreateUI(username: string, password: string, gender: string | number, grade: string, email: string) {
    //     try {
    // let parsedGender = 0;
    // if (typeof gender === 'string') {
    //     parsedGender = gender === 'female' ? 0 : 1;
    // } else {
    //     parsedGender = gender;
    // }
    // const numGrade = parseInt(grade);
    // const data = await user.create({
    //     username,
    //     pwd: password,
    //     email,
    //     grade: numGrade,
    //     gender: parsedGender,
    //     gravatarLink: 'default',
    //     description: 'default',
    // });
    //         this.ctx.type = 'text/html';
    //         this.ctx.body = await RenderFromPage({
    //             type: 'back',
    //             template: 'Feedback',
    //             data: {
    //                 status: 'success',
    //                 title: `成功标题`,
    //                 msg: `成功文本。`,
    //                 links: [
    //                     {
    //                         title: 'link样式',
    //                         link: '/login',
    //                         style: 'light',
    //                     },
    //                 ],
    //             },
    //         });
    //     } catch (err) {
    //         console.log(err);
    //         this.ctx.type = 'text/html';
    //         this.ctx.body = await RenderFromPage({
    //             type: 'back',
    //             template: 'Feedback',
    //             status: 'error',
    //             data: {
    //                 status: 'error',
    //                 title: `错误`,
    //                 msg: `${err.errorType} Error. \n\n 若多次尝试仍然有问题请联系工作人员。`,
    //                 links: [
    //                     {
    //                         title: '返回登录',
    //                         link: '/login',
    //                     },
    //                     {
    //                         title: '联系帮助',
    //                         link: 'mailto:smallfang@rotriw.tech',
    //                         style: 'light',
    //                     },
    //                     {
    //                         title: '返回主页',
    //                         link: '/',
    //                         style: 'light',
    //                     },
    //                 ],
    //             },
    //         });
    //     }
    // }
    RegisterHandler.prototype.get = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.ctx.type = 'text/html';
                        _a = this.ctx;
                        return [4 /*yield*/, (0, render_1.RenderFromPage)({
                                type: 'back',
                                template: 'Feedback',
                                status: 'error',
                                data: {
                                    status: 'error',
                                    title: '错误',
                                    msg: '该页面无法直接访问。',
                                    links: [
                                        {
                                            title: '登录页',
                                            link: '/login'
                                        },
                                        {
                                            title: '主页',
                                            link: '/',
                                            style: 'light'
                                        },
                                    ]
                                }
                            })];
                    case 1:
                        _a.body = _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    __decorate([
        (0, decorate_1.param)('username', new type_1.StringType([4, 20])),
        (0, decorate_1.param)('password', type_1.DefaultType.String),
        (0, decorate_1.param)('gender', type_1.DefaultType.String),
        (0, decorate_1.param)('email', type_1.DefaultType.Email)
    ], RegisterHandler.prototype, "postCreate");
    return RegisterHandler;
}(handle_1.Handler));
var LoginHandler = /** @class */ (function (_super) {
    __extends(LoginHandler, _super);
    function LoginHandler() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    LoginHandler.prototype.postLoginCheck = function (email, password) {
        return __awaiter(this, void 0, void 0, function () {
            var data, err_2, configSalt, randomSalt, hashedPassword, tokenid, err_3, tErr;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 9, , 10]);
                        data = void 0;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 5]);
                        return [4 /*yield*/, user_1.user.getbyEmail(email)];
                    case 2:
                        data = _a.sent();
                        return [3 /*break*/, 5];
                    case 3:
                        err_2 = _a.sent();
                        return [4 /*yield*/, user_1.user.getbyUsername(email)];
                    case 4:
                        data = _a.sent();
                        return [3 /*break*/, 5];
                    case 5:
                        configSalt = rmjac_config_1.config.salt.salt;
                        randomSalt = data.salt;
                        hashedPassword = (0, js_sha512_1.sha512)(password + randomSalt + configSalt);
                        if (!(hashedPassword === data.pwd)) return [3 /*break*/, 7];
                        return [4 /*yield*/, token_1.token.create(data.id, 7 * 24 * 60 * 60)];
                    case 6:
                        tokenid = _a.sent();
                        this.ctx.body = {
                            status: 'success',
                            data: {
                                username: data.username,
                                token: tokenid
                            }
                        };
                        return [3 /*break*/, 8];
                    case 7: throw new error_1.ValidationError('any');
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        err_3 = _a.sent();
                        tErr = err_3;
                        // Treat exist error as validation error to prevent brute force
                        if ((tErr === null || tErr === void 0 ? void 0 : tErr.errorType) === 'exist') {
                            this.ctx.body = {
                                status: 'error',
                                type: 'validation',
                                param: (tErr === null || tErr === void 0 ? void 0 : tErr.errorParam) || ''
                            };
                        }
                        else {
                            this.ctx.body = {
                                status: 'error',
                                type: (tErr === null || tErr === void 0 ? void 0 : tErr.errorType) || 'unknown',
                                param: (tErr === null || tErr === void 0 ? void 0 : tErr.errorParam) || ''
                            };
                        }
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    LoginHandler.prototype.get = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        this.ctx.type = 'text/html';
                        _a = this.ctx;
                        _b = render_1.RenderFromPage;
                        return [4 /*yield*/, user_1.user.getHeader(this.id)];
                    case 1: return [4 /*yield*/, _b.apply(void 0, [_c.sent()])];
                    case 2:
                        _a.body = _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    __decorate([
        (0, decorate_1.param)('email', type_1.DefaultType.String),
        (0, decorate_1.param)('password', type_1.DefaultType.String)
    ], LoginHandler.prototype, "postLoginCheck");
    __decorate([
        (0, perm_1.perm)('user', 'view')
    ], LoginHandler.prototype, "get");
    return LoginHandler;
}(handle_1.Handler));
function apply() {
    (0, handle_1.Route)('SignUp', '/register', RegisterHandler);
    (0, handle_1.Route)('SignUp-Id', '/register/:id', RegisterHandler);
    (0, handle_1.Route)('SignIn', '/login', LoginHandler);
}
exports.apply = apply;
