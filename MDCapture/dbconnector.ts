import * as mariadb from 'mariadb'
import { JsFixWinstonLogFactory, WinstonLogger, IJsFixConfig, IJsFixLogger, SessionMsgFactory, makeConfig, JsFixLoggerFactory } from 'jspurefix'
import {IAppConfig, Common} from './common'
import { ILiveQuotes } from './marketdata-factory'
import { AvgSpread } from './AvgSpread'

export class DBConnector {
    private readonly options: IAppConfig
    private readonly pool : mariadb.Pool
    private readonly logger: IJsFixLogger

    constructor(opt: IAppConfig, logFactory: JsFixLoggerFactory) {        
        this.logger = logFactory.logger('dbconnector')
        this.options = opt;
        if (opt.DBHost) {
            this.pool = mariadb.createPool({
                host: opt.DBHost,
                port: 3306,
                user: opt.DBUserName,
                password: opt.DBPassword,
                database: opt.DBDatabase
            });
        } else {
            this.pool = mariadb.createPool({
                socketPath: opt.DBSocketPath,
                user: opt.DBUserName,
                password: opt.DBPassword,
                database: opt.DBDatabase
            });
        }
        
    }
    public async querySymbols(): Promise<string[]> {
        debugger
        const conn = await this.pool.getConnection();
        const rows: any[]  = await conn.query(`Select * From ${this.options.TblSymbols} Where LiveQuotes = ?`, [1]);
        if (rows) {
            conn.end();
            return rows.map(i => i.currencypairname);
        }
        else {
            this.logger.error(new Error('Cannot get Rows!'));
            return undefined;
        };
    }
    async updateLiveQuotes(lq: ILiveQuotes) {
        try {
            //common.showNotify('Trying to update Live Quotes');
            //console.log(msgObj);
            const conn = await this.pool.getConnection();
            await conn.query(`
        UPDATE ${this.options.TblLiveQuotes} SET 
            TimeStamp = ?, 
            BrokerName = ?, 
            Bid = ?, 
            Ask = ?, 
            Spread = ?  
        WHERE Symbol = ?;`,
                [(lq.TimeStamp) ? Common.getTimeStamp(lq.TimeStamp) : 'TimeStamp',
                lq.BrokerName,
                (lq.Bid) ? lq.Bid : 'Bid',
                (lq.Ask) ? lq.Ask : 'Ask',
                lq.Spread,
                lq.Symbol]);
            conn.end();
        } catch (err) {
            this.logger.error(err);
        }
    }
    async insertAvg(spreadAvg: AvgSpread[]) {
        try {
            this.logger.info('Trying to insert average Quotes');
            const conn = await this.pool.getConnection();
            spreadAvg.forEach(avg => {
                avg.calculate();
                conn.query(`INSERT INTO ${this.options.TblAverageSpreads}(TimeStamp, Duration, BrokerName, Symbol, AvgSpread) VALUES (?, ?, ?, ?, ?)`, [Common.getTimeStamp(), this.options.AvgTerm, this.options.FBrokerName, avg.symbol, avg.avgSpread]);
                avg.reset();
            });
            conn.end();
        } catch (err) {
            this.logger.error(new Error("not connected due to error: " + err));
        }
    }
}