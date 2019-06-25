"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var AvgSpread = (function () {
    function AvgSpread(brokerName, symbol, fpoint) {
        if (fpoint === void 0) { fpoint = 5; }
        this.brokerName = brokerName;
        this.symbol = symbol;
        this.sum = 0.0;
        this.count = 0;
        this.avgSpread = 0.0;
        this.fpoint = fpoint;
    }
    AvgSpread.prototype.reset = function () {
        this.sum = 0.0;
        this.count = 0;
    };
    ;
    AvgSpread.prototype.calculate = function () {
        console.log(this.toString());
        if (this.count > 0) {
            this.avgSpread = this.sum / this.count;
        }
    };
    ;
    AvgSpread.prototype.addSum = function (s) {
        this.sum += s;
        this.count++;
    };
    return AvgSpread;
}());
exports.AvgSpread = AvgSpread;
