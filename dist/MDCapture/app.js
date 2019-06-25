"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var marketdata_client_1 = require("./marketdata-client");
var jspurefix_1 = require("jspurefix");
var launcher_1 = require("../launcher");
var AppNfixLauncher = (function (_super) {
    __extends(AppNfixLauncher, _super);
    function AppNfixLauncher() {
        return _super.call(this, './../config.json') || this;
    }
    AppNfixLauncher.prototype.getInitiator = function (config) {
        var _this = this;
        return jspurefix_1.initiator(config, function (c) { return new marketdata_client_1.MarketDataClient(c, _this.appConfig); }, 5000);
    };
    return AppNfixLauncher;
}(launcher_1.Launcher));
var l = new AppNfixLauncher();
l.run().then(function () {
    console.log('finished.');
});
