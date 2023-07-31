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
exports.__esModule = true;
exports.apply = void 0;
var handle_1 = require("../handle");
var ProblemPageHandler = /** @class */ (function (_super) {
    __extends(ProblemPageHandler, _super);
    function ProblemPageHandler() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ProblemPageHandler;
}(handle_1.Handler));
function apply() {
    (0, handle_1.Route)('ProblemPage', '/problem/:id', ProblemPageHandler);
}
exports.apply = apply;
