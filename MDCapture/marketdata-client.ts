import {
    AsciiSession,
    MsgView,
    IJsFixConfig,
    IJsFixLogger,
    Dictionary,
    MsgType
} from 'jspurefix'
import * as cron from 'node-cron'

import {
    IMarketDataRequest,
    ISecurityListRequest
} from 'jspurefix/dist/types/FIX4.4/repo'

import { MarketDataFactory } from './marketdata-factory'
import { AvgSpread } from './AvgSpread';
import { DBConnector } from './dbconnector';
import { IAppConfig } from './common';
import { EventEmitter } from 'events';
import { resolve } from 'dns';
import { SubscriptionRequestType } from 'jspurefix/dist/types/FIX4.4/repo';


export class MarketDataClient extends AsciiSession {
    private readonly logger: IJsFixLogger
    private readonly fixLog: IJsFixLogger
    private avgSpreads: Dictionary<AvgSpread>
    private dbConnector: DBConnector
    private cronJob: any
    private msgCount: number
    constructor(public readonly config: IJsFixConfig, private readonly appConfig: IAppConfig) {
        super(config)
        this.logReceivedMsgs = true
        this.fixLog = config.logFactory.plain(`jsfix.${config!.description!.application!.name}.log`)
        this.logger = config.logFactory.logger(`${this.me}:MarketDataClient`)
        this.dbConnector = new DBConnector(this.appConfig, config.logFactory);
        // this.dbConnector.queryLastAvgSpreads().then(avgs => {
        //     this.avgSpreads = avgs
        // })
        this.avgSpreads = new Dictionary<AvgSpread>()
        this.cronJob = cron.schedule(`*/${appConfig.AvgTerm} * * * * *`, () => {
            //cron.schedule(`*/${appConfig.AvgTerm}  * * * *`, () => {
            this.logger.info(`inserting AVGSpreads...`)
            // this.avgSpreads.values().forEach(a => {
            //     a.calculate()
            //     this.logger.info(a.avgSpread.toString())
            //     a.reset()
            // })
            //this.dbConnector.insertAvg(this.avgSpreads.values())
        }, { scheduled: false })
        this.msgCount = 0        
    }

    // onApp Event Listener
    protected onApplicationMsg(msgType: string, view: MsgView): void {
        //this.logger.debug(`${view.toJson()}`)
        switch (msgType) {
            case MsgType.MarketDataSnapshotFullRefresh:
            case MsgType.MarketDataIncrementalRefresh: {
                this.msgCount++
                let lq = MarketDataFactory.parseLiveQuote(msgType, view)
                this.logger.info(`Symbol = ${lq.Symbol}\n
                Ask = ${lq.Ask} \n
                Bid = ${lq.Bid}\n
                Spread = ${lq.Spread}\n
                TimeStamp = ${lq.TimeStamp}\n
                fpoint = ${lq.fpoint}`)
                //this.dbConnector.updateLiveQuotes(lq)
                let a = this.avgSpreads.get(lq.Symbol)
                if (a) a.addSum(lq.Spread)
                else {
                    a = new AvgSpread(this.appConfig.BrokerName, lq.Symbol)
                    a.addSum(lq.Spread)
                }
                this.avgSpreads.addUpdate(a.symbol, a)
                break
            }
            case MsgType.SecurityList: {
                this.logger.info('Security List received!')
                //this.done();
            }
            default:
                break
        }
    }

    // onStop Event Listener
    protected onStopped(): void {
        this.logger.info('Stopped!')

        this.cronJob.stop();
    }

    // use msgType for example to persist only trade capture messages to database
    protected onDecoded(msgType: string, txt: string): void {
        this.fixLog.info(txt)
    }

    // no delimiter substitution on transmit messages
    protected onEncoded(msgType: string, txt: string): void {
        this.fixLog.info(AsciiSession.asPiped(txt))
    }

    // onReady Event Listener
    protected onReady(view: MsgView): void {
        this.logger.info('ready')

        // Send Test msg to Server
        // this.logger.info('send test message...')
        // const t: ITestRequest = MarketDataFactory.createTestRequest(this.appConfig.BrokerName)
        // this.send(MsgType.TestRequest,t)

        // Query Symbol list from server
        // this.logger.info('query symbol list from server...')
        // const slr: ISecurityListRequest = MarketDataFactory.createSecurityListRequest(this.appConfig.BrokerName,SecurityListRequestType.AllSecurities)
        // this.send(MsgType.SecurityListRequest,slr)

        // Send MD Request to server
        // this.dbConnector.querySymbols().then(symbols => {
        //     const mdr: IMarketDataRequest = MarketDataFactory.createMarketDataRequest(this.appConfig.BrokerName, SubscriptionRequestType.SnapshotAndUpdates, symbols)
        //     this.send(MsgType.MarketDataRequest, mdr)

        //     //Start Cron-Job
        //     this.cronJob.start()
        // })
        let symbols = ['AUD/CAD','AUD/CHF','AUD/JPY','AUD/NZD','AUD/USD','CAD/CHF','CAD/JPY','CHF/JPY','EUR/AUD','EUR/CAD','EUR/CHF','EUR/GBP','EUR/JPY','EUR/USD']
        const mdr: IMarketDataRequest = MarketDataFactory.createMarketDataRequest(this.appConfig.BrokerName, SubscriptionRequestType.SnapshotAndUpdates, symbols)
        this.send(MsgType.MarketDataRequest, mdr)
        this.cronJob.start()
        process.on('SIGINT', function () {
            console.log("Caught interrupt signal");
            this.logger.info(`Total Mesages Received: ${this.msgCount}`)
            this.done();
            process.exit()
        });
    }

    // onLogon Event Listener
    protected onLogon(view: MsgView, user: string, password: string): boolean {
        this.logger.info(`peer logs in user ${user}`)
        return true
    }
}