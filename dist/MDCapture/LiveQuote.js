"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LiveQuote = (function () {
    function LiveQuote(_symbol, _reqID, _brokerName, _bid, _ask, _fpoint, _timeStamp, _spread, _sumSpread, _avgSpread, _spreadCount, _lqFlag, _avgFlag) {
        if (_fpoint === void 0) { _fpoint = 5; }
        if (_timeStamp === void 0) { _timeStamp = null; }
        if (_spread === void 0) { _spread = 0; }
        if (_sumSpread === void 0) { _sumSpread = 0; }
        if (_avgSpread === void 0) { _avgSpread = 0; }
        if (_spreadCount === void 0) { _spreadCount = 0; }
        if (_lqFlag === void 0) { _lqFlag = false; }
        if (_avgFlag === void 0) { _avgFlag = false; }
        this._symbol = _symbol;
        this._reqID = _reqID;
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
    Object.defineProperty(LiveQuote.prototype, "reqID", {
        get: function () { return this._reqID; },
        set: function (v) { this._reqID = v; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LiveQuote.prototype, "timeStamp", {
        get: function () { return this._timeStamp; },
        set: function (v) { this._timeStamp = v; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LiveQuote.prototype, "symbol", {
        get: function () { return this._symbol; },
        set: function (v) { this._symbol = v; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LiveQuote.prototype, "brokerName", {
        get: function () { return this._brokerName; },
        set: function (v) { this._brokerName = v; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LiveQuote.prototype, "bid", {
        get: function () { return this._bid; },
        set: function (v) { this._bid = v; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LiveQuote.prototype, "ask", {
        get: function () { return this._ask; },
        set: function (v) { this._ask = v; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LiveQuote.prototype, "fpoint", {
        get: function () { return this._fpoint; },
        set: function (v) { this._fpoint = v; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LiveQuote.prototype, "spread", {
        get: function () { return this._spread; },
        set: function (v) { this._spread = v; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LiveQuote.prototype, "sumSpread", {
        get: function () { return this._sumSpread; },
        set: function (v) { this._sumSpread = v; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LiveQuote.prototype, "avgSpread", {
        get: function () { return this._avgSpread; },
        set: function (v) { this._avgSpread = v; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LiveQuote.prototype, "msgCount", {
        get: function () { return this._spreadCount; },
        set: function (v) { this._spreadCount = v; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LiveQuote.prototype, "lqFlag", {
        get: function () { return this._lqFlag; },
        set: function (v) { this._lqFlag = v; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LiveQuote.prototype, "avgFlag", {
        get: function () { return this._avgFlag; },
        set: function (v) { this._avgFlag = v; },
        enumerable: true,
        configurable: true
    });
    LiveQuote.prototype.reset = function () {
        this._spreadCount = 0;
        this._avgFlag = false;
    };
    LiveQuote.prototype.addSum = function () {
        if (!this._avgFlag)
            this._avgFlag = true;
        this._sumSpread += this._spread;
        this._spreadCount++;
    };
    LiveQuote.prototype.avgCalc = function () {
        if (this._spreadCount)
            this._avgSpread = this.sumSpread / this._spreadCount;
    };
    LiveQuote.prototype.spreadCalc = function () {
        if (this._ask && this._bid && this._fpoint) {
            this._spread = (this._ask - this._bid) * Math.pow(10, this._fpoint - 1);
            return true;
        }
        else {
            this._spread = 0;
            return false;
        }
    };
    LiveQuote.prototype.update = function (liveQuote) {
        if ((liveQuote.symbol == this._symbol || liveQuote.reqID == this._reqID) && liveQuote.timeStamp && liveQuote.ask && liveQuote.bid) {
            this._timeStamp = liveQuote.timeStamp;
            this._bid = liveQuote.bid === -1 ? this._bid : liveQuote.bid;
            this._ask = liveQuote.ask === -1 ? this._ask : liveQuote.ask;
            if (this.spreadCalc()) {
                this.addSum();
                if (!this._lqFlag)
                    this._lqFlag = true;
            }
            return true;
        }
        return false;
    };
    return LiveQuote;
}());
exports.LiveQuote = LiveQuote;
