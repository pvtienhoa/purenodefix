import * as mariadb from 'mariadb'
import { JsFixWinstonLogFactory, WinstonLogger, IJsFixConfig, IJsFixLogger, SessionMsgFactory, makeConfig, JsFixLoggerFactory, Dictionary } from 'jspurefix'
import { IAppConfig, Common } from './common'
import { ILiveQuotes } from './marketdata-factory'
import { AvgSpread } from './AvgSpread'
import { ILiveQuote, IAverageSpread } from './LiveQuote';
import { promises } from 'fs';

export class DBConnector {
    private readonly options: IAppConfig
    private readonly pool: any
    private readonly logger: IJsFixLogger

    constructor(opt: IAppConfig, logFactory: JsFixLoggerFactory) {
        this.logger = logFactory.logger('dbconnector')
        this.options = opt;
        debugger
        if (this.options.DBHost) {
            this.pool = mariadb.createPool({
                host: this.options.DBHost,
                user: this.options.DBUserName,
                password: this.options.DBPassword,
                database: this.options.DBDatabase,
                connectionLimit: 20
            });
        } else {
            this.pool = mariadb.createPool({
                socketPath: this.options.DBSocketPath,
                user: this.options.DBUserName,
                password: this.options.DBPassword,
                database: this.options.DBDatabase,
                connectionLimit: 20
            });
        }

    }
    public async querySymbols(): Promise<any[]> {
        const rows: any[] = await this.pool.query(`Select * From ${this.options.TblSymbols} Where LiveQuotes = ?`, [1]);
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
    public async queryLastAvgSpreads(): Promise<Dictionary<AvgSpread>> {
        const conn = await this.pool.getConnection();
        const rows: any[] = await conn.query(`WITH ranked_rows AS (SELECT r.*, ROW_NUMBER() OVER (PARTITION BY Symbol ORDER BY ID DESC) AS rn FROM AverageSpreads AS r) SELECT * FROM ranked_rows WHERE rn = 1`);
        conn.end();
        if (rows) {
            var ret = new Dictionary<AvgSpread>();
            rows.forEach(row => {
                let a = new AvgSpread(row.BrokerName, row.Symbol)
                a.lastAvg = row.AvgSpread
                ret.addUpdate(a.symbol, a)
            })
            return ret;
        }
        else {
            this.logger.error(new Error('Cannot get Rows!'));
            return undefined;
        };
    }

    public async updateLiveQuotes(lqs: ILiveQuote[]): Promise<boolean> {
        return new Promise<boolean>((accept, reject) => {
            if (this.pool.idleConnections() <= 1) {
                this.logger.warning('No idle Connection... Skipped writing to DB!')
                accept(false);
            }
            var lqParams: any[] = [];
            lqs.forEach(lq => {
                if (lq.lqFlag) {
                    lqParams.push([Common.getTimeStamp(lq.timeStamp), this.options.FBrokerName, lq.bid, lq.ask, Common.roundToFixed(lq.spread,1), lq.symbol])
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
                WHERE Symbol = ?;`, lqParams).then(
                    accept(true)
                ).catch((err: Error) => {
                    this.logger.error(new Error('error updating LQ into DB - ' + err.message))
                    reject(err);
                });
            } else accept(false);
        })
    }
    
    public async insertAvgSpreads(avgSpreads: IAverageSpread[]): Promise<boolean> {
        return new Promise<boolean>((accept, reject) => {
            if (!this.pool.idleConnections()) {
                this.logger.warning('No idle Connection... Skipped writing to DB!')
                accept(false);
            }
            var aqParams: any[] = [];
            avgSpreads.forEach(avg => {
                if (avg.avgFlag) {
                    avg.avgCalc();
                    aqParams.push([Common.getTimeStamp(), this.options.AvgTerm * 60, this.options.FBrokerName, avg.symbol, avg.avgSpread]);
                }
            });
            if (aqParams.length > 0) {
                this.pool.batch(`INSERT INTO ${this.options.TblAverageSpreads}(TimeStamp, Duration, BrokerName, Symbol, AvgSpread) VALUES (?, ?, ?, ?, ?)`, aqParams).then(
                    accept(true)
                ).catch((err: Error) => {
                    this.logger.error(new Error('error updating AQ into DB - ' + err.message))
                    reject(err);
                });
            } else accept(false);
        })
        // try {
        //     if (!this.pool.idleConnections()) {
        //         this.logger.warning('No idle Connection... Skipped writing to DB!')
        //         return;
        //     }
        //     var aqParams: any[] = [];
        //     avgSpreads.forEach(avg => {
        //         if (avg.avgFlag) {
        //             avg.avgCalc();
        //             aqParams.push([Common.getTimeStamp(), this.options.AvgTerm * 60, this.options.FBrokerName, avg.symbol, avg.avgSpread]);
        //         }
        //     });
        //     await this.pool.batch(`INSERT INTO ${this.options.TblAverageSpreads}(TimeStamp, Duration, BrokerName, Symbol, AvgSpread) VALUES (?, ?, ?, ?, ?)`, aqParams);
        // } catch (err) {
        //     this.logger.error(new Error("Error insertig AvgSpreads to DB - " + err));
        // }
    }
}