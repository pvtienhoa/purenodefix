"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mariadb = require("mariadb");
const jspurefix_1 = require("jspurefix");
const common_1 = require("./common");
const AvgSpread_1 = require("./AvgSpread");
class DBConnector {
    constructor(opt, logFactory) {
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
    querySymbols() {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.pool.query(`Select * From ${this.options.TblSymbols} Where LiveQuotes = ?`, [1]);
            if (rows) {
                return rows;
            }
            else {
                this.logger.error(new Error('Cannot get Rows!'));
                return undefined;
            }
            ;
        });
    }
    queryLastAvgSpreads() {
        return __awaiter(this, void 0, void 0, function* () {
            const conn = yield this.pool.getConnection();
            const rows = yield conn.query(`WITH ranked_rows AS (SELECT r.*, ROW_NUMBER() OVER (PARTITION BY Symbol ORDER BY ID DESC) AS rn FROM AverageSpreads AS r) SELECT * FROM ranked_rows WHERE rn = 1`);
            conn.end();
            if (rows) {
                var ret = new jspurefix_1.Dictionary();
                rows.forEach(row => {
                    let a = new AvgSpread_1.AvgSpread(row.BrokerName, row.Symbol);
                    a.lastAvg = row.AvgSpread;
                    ret.addUpdate(a.symbol, a);
                });
                return ret;
            }
            else {
                this.logger.error(new Error('Cannot get Rows!'));
                return undefined;
            }
            ;
        });
    }
    updateLiveQuotes(lqs) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((accept, reject) => {
                if (this.pool.idleConnections() <= 1) {
                    this.logger.warning('No idle Connection... Skipped writing to DB!');
                    return;
                }
                var lqParams = [];
                lqs.forEach(lq => {
                    if (lq.lqFlag) {
                        lqParams.push([common_1.Common.getTimeStamp(lq.timeStamp), this.options.FBrokerName, lq.bid, lq.ask, lq.spread, lq.symbol]);
                    }
                });
                if (lqParams.length > 0) {
                    this.pool.batch(`
                UPDATE ${this.options.TblLiveQuotes} SET 
                    TimeStamp = ?, 
                    BrokerName = ?, 
                    Bid = ?, 
                    Ask = ?, 
                    Spread = ?  
                WHERE Symbol = ?;`, lqParams).then(accept(true)).catch((err) => {
                        this.logger.error(new Error('error updating LQ into DB - ' + err.message));
                        reject(err);
                    });
                }
                else
                    accept(false);
            });
        });
    }
    insertAvgSpreads(avgSpreads) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.pool.idleConnections()) {
                    this.logger.warning('No idle Connection... Skipped writing to DB!');
                    return;
                }
                var aqParams = [];
                avgSpreads.forEach(avg => {
                    if (avg.avgFlag) {
                        avg.avgCalc();
                        aqParams.push([common_1.Common.getTimeStamp(), this.options.AvgTerm * 60, this.options.FBrokerName, avg.symbol, avg.avgSpread]);
                        avg.reset();
                    }
                });
                yield this.pool.batch(`INSERT INTO ${this.options.TblAverageSpreads}(TimeStamp, Duration, BrokerName, Symbol, AvgSpread) VALUES (?, ?, ?, ?, ?)`, aqParams);
            }
            catch (err) {
                this.logger.error(new Error("Error insertig AvgSpreads to DB - " + err));
            }
        });
    }
}
exports.DBConnector = DBConnector;
//# sourceMappingURL=dbconnector.js.map