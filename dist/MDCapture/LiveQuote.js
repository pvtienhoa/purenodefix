"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
class LiveQuote {
    constructor(_symbol, _brokerName, _bid, _ask, _fpoint = 5, _timeStamp = null, _spread = 0, _sumSpread = 0, _avgSpread = 0, _spreadCount = 0, _lqFlag = false, _avgFlag = false) {
        this._symbol = _symbol;
        this._brokerName = _brokerName;
        this._bid = _bid;
        this._ask = _ask;
        this._fpoint = _fpoint;
        this._timeStamp = _timeStamp;
        this._spread = _spread;
        this._sumSpread = _sumSpread;
        this._avgSpread = _avgSpread;
        this._spreadCount = _spreadCount;
        this._lqFlag = _lqFlag;
        this._avgFlag = _avgFlag;
    }
    get timeStamp() { return this._timeStamp; }
    set timeStamp(v) { this._timeStamp = v; }
    get symbol() { return this._symbol; }
    set symbol(v) { this._symbol = v; }
    get brokerName() { return this._brokerName; }
    set brokerName(v) { this._brokerName = v; }
    get bid() { return this._bid; }
    set bid(v) { this._bid = v; }
    get ask() { return this._ask; }
    set ask(v) { this._ask = v; }
    get fpoint() { return this._fpoint; }
    set fpoint(v) { this._fpoint = v; }
    get spread() { return this._spread; }
    set spread(v) { this._spread = v; }
    get sumSpread() { return this._sumSpread; }
    set sumSpread(v) { this._sumSpread = v; }
    get avgSpread() { return this._avgSpread; }
    set avgSpread(v) { this._avgSpread = v; }
    get msgCount() { return this._spreadCount; }
    set msgCount(v) { this._spreadCount = v; }
    get lqFlag() { return this._lqFlag; }
    set lqFlag(v) { this._lqFlag = v; }
    get avgFlag() { return this._avgFlag; }
    set avgFlag(v) { this._avgFlag = v; }
    reset() {
        this._spreadCount = 0;
        this._avgSpread = 0;
        this._avgFlag = false;
    }
    addSum() {
        if (!this._avgFlag)
            this._avgFlag = true;
        this._sumSpread += this._spread;
        this._spreadCount++;
    }
    avgCalc() {
        if (this._spreadCount)
            this._avgSpread = this.sumSpread / this._spreadCount;
    }
    spreadCalc() {
        if (this._ask && this._bid && this._fpoint)
            this._spread = common_1.Common.roundToFixed((this._ask - this._bid) * Math.pow(10, this._fpoint - 1), 1);
        else {
            this._spread = 0;
            throw new Error('Error on spreadCalc');
        }
    }
    update(liveQuote) {
        if (!this._lqFlag)
            this._lqFlag = true;
        if (liveQuote.symbol == this._symbol && liveQuote.timeStamp && liveQuote.ask && liveQuote.bid) {
            this._timeStamp = liveQuote.timeStamp;
            this._bid = liveQuote.bid;
            this._ask = liveQuote.ask;
            this.spreadCalc();
            this.addSum();
            return true;
        }
        return false;
    }
}
exports.LiveQuote = LiveQuote;
//# sourceMappingURL=LiveQuote.js.map