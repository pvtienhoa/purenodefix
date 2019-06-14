"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AvgSpread {
    constructor(brokerName, symbol, fpoint = 5) {
        this.brokerName = brokerName;
        this.symbol = symbol;
        this.sum = 0.0;
        this.count = 0;
        this.avgSpread = 0.0;
        this.fpoint = fpoint;
    }
    reset() {
        this.sum = 0.0;
        this.count = 0;
    }
    ;
    calculate() {
        console.log(this.toString());
        if (this.count > 0) {
            this.avgSpread = this.sum / this.count;
        }
    }
    ;
    addSum(s) {
        this.sum += s;
        this.count++;
    }
}
exports.AvgSpread = AvgSpread;
//# sourceMappingURL=AvgSpread.js.map