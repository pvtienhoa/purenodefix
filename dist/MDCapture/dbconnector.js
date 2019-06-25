"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
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
Object.defineProperty(exports, "__esModule", { value: true });
var mariadb = require("mariadb");
var jspurefix_1 = require("jspurefix");
var common_1 = require("./common");
var AvgSpread_1 = require("./AvgSpread");
var DBConnector = (function () {
    function DBConnector(opt, logFactory) {
        this.logger = logFactory.logger('dbconnector');
        this.options = opt;
        debugger;
        if (this.options.DBHost) {
            this.pool = mariadb.createPool({
                host: this.options.DBHost,
                user: this.options.DBUserName,
                password: this.options.DBPassword,
                database: this.options.DBDatabase,
                connectionLimit: 20
            });
        }
        else {
            this.pool = mariadb.createPool({
                socketPath: this.options.DBSocketPath,
                user: this.options.DBUserName,
                password: this.options.DBPassword,
                database: this.options.DBDatabase,
                connectionLimit: 20
            });
        }
    }
    DBConnector.prototype.querySymbols = function () {
        return __awaiter(this, void 0, void 0, function () {
            var rows;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.pool.query("Select * From " + this.options.TblSymbols + " Where LiveQuotes = ?", [1])];
                    case 1:
                        rows = _a.sent();
                        if (rows) {
                            return [2, rows];
                        }
                        else {
                            this.logger.error(new Error('Cannot get Rows!'));
                            return [2, undefined];
                        }
                        ;
                        return [2];
                }
            });
        });
    };
    DBConnector.prototype.queryLastAvgSpreads = function () {
        return __awaiter(this, void 0, void 0, function () {
            var conn, rows, ret;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.pool.getConnection()];
                    case 1:
                        conn = _a.sent();
                        return [4, conn.query("WITH ranked_rows AS (SELECT r.*, ROW_NUMBER() OVER (PARTITION BY Symbol ORDER BY ID DESC) AS rn FROM AverageSpreads AS r) SELECT * FROM ranked_rows WHERE rn = 1")];
                    case 2:
                        rows = _a.sent();
                        conn.end();
                        if (rows) {
                            ret = new jspurefix_1.Dictionary();
                            rows.forEach(function (row) {
                                var a = new AvgSpread_1.AvgSpread(row.BrokerName, row.Symbol);
                                a.lastAvg = row.AvgSpread;
                                ret.addUpdate(a.symbol, a);
                            });
                            return [2, ret];
                        }
                        else {
                            this.logger.error(new Error('Cannot get Rows!'));
                            return [2, undefined];
                        }
                        ;
                        return [2];
                }
            });
        });
    };
    DBConnector.prototype.updateLiveQuotes = function (lqs) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2, new Promise(function (accept, reject) {
                        if (_this.pool.idleConnections() <= 1) {
                            _this.logger.warning('No idle Connection... Skipped writing to DB!');
                            accept(false);
                        }
                        var lqParams = [];
                        lqs.forEach(function (lq) {
                            if (lq.lqFlag) {
                                lqParams.push([common_1.Common.getTimeStamp(lq.timeStamp), _this.options.FBrokerName, lq.bid, lq.ask, common_1.Common.roundToFixed(lq.spread, 1), lq.symbol]);
                            }
                        });
                        if (lqParams.length > 0) {
                            _this.pool.batch("\n                UPDATE " + _this.options.TblLiveQuotes + " SET \n                    TimeStamp = ?, \n                    BrokerName = ?, \n                    Bid = ?, \n                    Ask = ?, \n                    Spread = ?  \n                WHERE Symbol = ?;", lqParams).then(accept(true)).catch(function (err) {
                                _this.logger.error(new Error('error updating LQ into DB - ' + err.message));
                                reject(err);
                            });
                        }
                        else
                            accept(false);
                    })];
            });
        });
    };
    DBConnector.prototype.insertAvgSpreads = function (avgSpreads) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2, new Promise(function (accept, reject) {
                        if (!_this.pool.idleConnections()) {
                            _this.logger.warning('No idle Connection... Skipped writing to DB!');
                            accept(false);
                        }
                        var aqParams = [];
                        avgSpreads.forEach(function (avg) {
                            if (avg.avgFlag) {
                                avg.avgCalc();
                                aqParams.push([common_1.Common.getTimeStamp(), _this.options.AvgTerm * 60, _this.options.FBrokerName, avg.symbol, avg.avgSpread]);
                            }
                        });
                        if (aqParams.length > 0) {
                            _this.pool.batch("INSERT INTO " + _this.options.TblAverageSpreads + "(TimeStamp, Duration, BrokerName, Symbol, AvgSpread) VALUES (?, ?, ?, ?, ?)", aqParams).then(accept(true)).catch(function (err) {
                                _this.logger.error(new Error('error updating AQ into DB - ' + err.message));
                                reject(err);
                            });
                        }
                        else
                            accept(false);
                    })];
            });
        });
    };
    return DBConnector;
}());
exports.DBConnector = DBConnector;
