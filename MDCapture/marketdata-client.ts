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
    SubscriptionRequestType,
    ISecurityListRequest,
    SecurityListRequestType,
} from 'jspurefix/dist/types/FIX4.4/repo'

import { MarketDataFactory } from './marketdata-factory'
import { AvgSpread } from './AvgSpread';
import { DBConnector } from './dbconnector';
import { IAppConfig } from './common';
import { EventEmitter } from 'events';
import { resolve } from 'dns';


export class MarketDataClient extends AsciiSession {
    private readonly logger: IJsFixLogger
    private readonly fixLog: IJsFixLogger
    private avgSpreads: Dictionary<AvgSpread>
    private dbConnector: DBConnector
    private cronJob: any
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
            this.dbConnector.insertAvg(this.avgSpreads.values())
        }, { scheduled: false })
    }

    // onApp Event Listener
    protected onApplicationMsg(msgType: string, view: MsgView): void {
        this.logger.debug(`${view.toJson()}`)
        switch (msgType) {
            case MsgType.MarketDataSnapshotFullRefresh:
            case MsgType.MarketDataIncrementalRefresh: {
                let lq = MarketDataFactory.parseLiveQuote(msgType, view)
                this.dbConnector.updateLiveQuotes(lq)
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
                this.done();
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

        //Start Cron-Job
        this.cronJob.start()

        // Send Test msg to Server
        // this.logger.info('send test message...')
        // const t: ITestRequest = MarketDataFactory.createTestRequest(this.appConfig.BrokerName)
        // this.send(MsgType.TestRequest,t)

        // Query Symbol list from server
        // this.logger.info('query symbol list from server...')
        // const slr: ISecurityListRequest = MarketDataFactory.createSecurityListRequest(this.appConfig.BrokerName,SecurityListRequestType.AllSecurities)
        // this.send(MsgType.SecurityListRequest,slr)

        // Send MD Request to server
        this.dbConnector.querySymbols().then(symbols => {
            const mdr: IMarketDataRequest = MarketDataFactory.createMarketDataRequest(this.appConfig.BrokerName, SubscriptionRequestType.SnapshotAndUpdates, symbols)
            this.send(MsgType.MarketDataRequest, mdr)

            // Set Logout timeout
            // const logoutSeconds = 30
            // this.logger.info(`will logout after ${logoutSeconds}`)
            // setTimeout(() => {
            //     this.done()
            // }, logoutSeconds * 1000)
        })
    }

    // onLogon Event Listener
    protected onLogon(view: MsgView, user: string, password: string): boolean {
        this.logger.info(`peer logs in user ${user}`)
        return true
    }
}