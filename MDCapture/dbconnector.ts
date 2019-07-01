import * as mariadb from 'mariadb'
import { JsFixWinstonLogFactory, WinstonLogger, IJsFixConfig, IJsFixLogger, SessionMsgFactory, makeConfig, JsFixLoggerFactory, Dictionary } from 'jspurefix'
import { IAppConfig, Common } from './common'
import { ILiveQuotes } from './marketdata-factory'
import { ILiveQuote, IAverageSpread } from './LiveQuote';
import { promises } from 'fs';

export class DBConnector {
    private appConfig: IAppConfig
    private pool: any
    private logger: IJsFixLogger

    constructor(opt: IAppConfig, logFactory: JsFixLoggerFactory) {
        this.logger = logFactory.logger('dbconnector')
        this.appConfig = opt;
        debugger
        if (this.appConfig.DBHost) {
            this.pool = mariadb.createPool({
                host: this.appConfig.DBHost,
                user: this.appConfig.DBUserName,
                password: this.appConfig.DBPassword,
                database: this.appConfig.DBDatabase,
                connectionLimit: 100,
                idleTimeout: 30
            });
        } else {
            this.pool = mariadb.createPool({
                socketPath: this.appConfig.DBSocketPath,
                user: this.appConfig.DBUserName,
                password: this.appConfig.DBPassword,
                database: this.appConfig.DBDatabase,
                connectionLimit: 20
            });
        }

    }
    public async querySymbols(): Promise<any[]> {
        return new Promise<any[]>((accept, reject) => {
            if (!this.pool.idleConnections()) {
                this.logger.warning('No idle Connection... Querying Symbols!');
                reject(new Error('No idle Connection... Querying Symbols!'));
            }
            this.logger.info('idle connections: ' + this.pool.idleConnections());
            this.pool.query(`Select * From ${this.appConfig.TblSymbols} Where LiveQuotes = ?`, [1])
                .then((rows: any[]) => {
                    accept(rows)
                })
                .catch((err: Error) => {
                    this.logger.error(new Error('error querying Symbols - ' + err.message))
                    reject(err);
                });

        })
        const rows: any[] = await this.pool.query(`Select * From ${this.appConfig.TblSymbols} Where LiveQuotes = ?`, [1]);
        if (rows) {
            return rows;
        }
        else {
            this.logger.error(new Error('Cannot get Rows!'));
            return undefined;
        };
    }

    /**
     * queryLastAvgSpread
     */
    // public async queryLastAvgSpreads(): Promise<Dictionary<AvgSpread>> {
    //     const conn = await this.pool.getConnection();
    //     const rows: any[] = await conn.query(`WITH ranked_rows AS (SELECT r.*, ROW_NUMBER() OVER (PARTITION BY Symbol ORDER BY ID DESC) AS rn FROM AverageSpreads AS r) SELECT * FROM ranked_rows WHERE rn = 1`);
    //     conn.end();
    //     if (rows) {
    //         var ret = new Dictionary<AvgSpread>();
    //         rows.forEach(row => {
    //             let a = new AvgSpread(row.BrokerName, row.Symbol)
    //             a.lastAvg = row.AvgSpread
    //             ret.addUpdate(a.symbol, a)
    //         })
    //         return ret;
    //     }
    //     else {
    //         this.logger.error(new Error('Cannot get Rows!'));
    //         return undefined;
    //     };
    // }

    public async updateLiveQuotes(lqs: ILiveQuote[]) {
        return new Promise<boolean>((accept, reject) => {
            if (this.pool.idleConnections() <= 1) {
                this.logger.warning('No idle Connection... Skipped writing to DB!')
                accept(false);
            }
            var lqParams: any[] = [];
            lqs.forEach(lq => {
                if (lq.lqFlag) {
                    lqParams.push([Common.getTimeStamp(this.appConfig.TimeZone, lq.timeStamp), this.appConfig.FBrokerName, lq.bid, lq.ask, Common.roundToFixed(lq.spread, 1), lq.symbol])
                }
            })
            if (lqParams.length > 0) {
                this.pool.batch(`
                UPDATE ${this.appConfig.TblLiveQuotes} SET 
                    TimeStamp = ?, 
                    BrokerName = ?, 
                    Bid = ?, 
                    Ask = ?, 
                    Spread = ?  
                WHERE Symbol = ?;`, lqParams).then(
                    accept(true)
                ).catch((err: Error) => {
                    this.logger.error(new Error('error updating LQ into DB - ' + err.message))
                    reject(err);
                });
            }
            else accept(false);
        })
    }
    async insertAvgSpreads(avgSpreads: IAverageSpread[]) {
        return new Promise<boolean>((accept, reject) => {
            if (!this.pool.idleConnections()) {
                this.logger.warning('No idle Connection... Skipped writing to DB!')
                accept(false);
            }
            var aqParams: any[] = [];
            avgSpreads.forEach(avg => {
                if (avg.avgFlag) {
                    avg.avgCalc();
                    aqParams.push([Common.getTimeStamp(this.appConfig.TimeZone), this.appConfig.AvgTerm * 60, this.appConfig.FBrokerName, avg.symbol, avg.avgSpread]);
                    //avg.reset();
                }
            });
            if (aqParams.length > 0) {
                this.pool.batch(`INSERT INTO ${this.appConfig.TblAverageSpreads}(TimeStamp, Duration, BrokerName, Symbol, AvgSpread) VALUES (?, ?, ?, ?, ?)`, aqParams).then(
                    accept(true)
                ).catch((err: Error) => {
                    this.logger.error(new Error('error updating AvgSpread into DB - ' + err.message))
                    reject(err);
                });
            }
            else accept(false);
        })
    }
    public stop(): boolean {
        this.logger = null;
        this.appConfig = null;
        this.pool.end()
            .then()
            .catch((err: Error) => {
                this.logger.error(new Error('error destroying Connection Pool - ' + err.message));
                return false;
            });
        return true;
    }
}