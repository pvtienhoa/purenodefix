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
    IMarketDataIncrementalRefresh,
    IMarketDataSnapshotFullRefresh,
    MDEntryType,
    IMarketDataRequest,
    SubscriptionRequestType
} from 'jspurefix/dist/types/FIX4.4/repo'

import { MarketDataFactory } from './marketdata-factory'
import { AvgSpread } from './AvgSpread';
import { DBConnector } from './dbconnector';
import { IAppConfig } from './common';


export class MarketDataClient extends AsciiSession {
    private readonly logger: IJsFixLogger
    private readonly fixLog: IJsFixLogger
    private avgSpreads: Dictionary<AvgSpread>
    private dbConnector: DBConnector
    constructor(public readonly config: IJsFixConfig, private readonly appConfig: IAppConfig) {
        super(config)
        this.logReceivedMsgs = true
        this.fixLog = config.logFactory.plain(`jsfix.${config!.description!.application!.name}.txt`)
        this.logger = config.logFactory.logger(`${this.me}:MarketDataClient`)
        this.dbConnector = new DBConnector(this.appConfig, config.logFactory);
        this.avgSpreads = new Dictionary<AvgSpread>()
    }

    protected onApplicationMsg(msgType: string, view: MsgView): void {
        this.logger.info(`${view.toJson()}`)
        if (msgType === MsgType.MarketDataSnapshotFullRefresh || msgType === MsgType.MarketDataIncrementalRefresh) {
            let lq = MarketDataFactory.parseLiveQuote(msgType, view)
            this.dbConnector.updateLiveQuotes(lq)
            let a = this.avgSpreads.get(lq.Symbol)
            if (a) a.addSum(lq.Spread)
            else a = new AvgSpread(this.appConfig.BrokerName, lq.Symbol)
            this.avgSpreads.addUpdate(lq.Symbol, a)
        }

        // switch (msgType) {
        //     case MsgType.MarketDataSnapshotFullRefresh: {
        //         // create an object and cast to the interface
        //         const md: IMarketDataSnapshotFullRefresh = view.toObject()
        //         this.fullRefresh.addUpdate(md.MDReqID, md)
        //         this.logger.info(`[Market Data Snapshot Full Refresh: ${this.fullRefresh.count()}] received tc MDReqID = ${md.MDReqID} Symbol = ${md.Instrument.Symbol} Bid = ${md.MDFullGrp.find(g => g.MDEntryType == MDEntryType.Bid).MDEntryPx}`)// Ask = ${md.MDFullGrp.forEach(g => g.toString())}`)
        //         break
        //     }

        //     // case MsgType.MarketDataIncrementalRefresh: {
        //     //     const md: IMarketDataIncrementalRefresh = view.toObject()
        //     //     this.logger.info(`[Market Data Incremental Refresh: ${this.incRefresh.count()}] received tc MDReqID = ${md.MDReqID} Bid - ${md.MDIncGrp.find(g => g.MDEntryType == MDEntryType.Bid).Instrument.Symbol} = ${md.MDIncGrp.find(g => g.MDEntryType == MDEntryType.Bid).MDEntryPx} Ask - ${md.MDIncGrp.find(g => g.MDEntryType == MDEntryType.Offer).Instrument.Symbol} = ${md.MDIncGrp.find(g => g.MDEntryType == MDEntryType.Offer).MDEntryPx}`)
        //     //     break
        //     // }
        // }
    }
    protected onStopped(): void {
        this.logger.info('stopped')
    }

    // use msgType for example to persist only trade capture messages to database
    protected onDecoded(msgType: string, txt: string): void {
        this.fixLog.info(txt)
    }

    // no delimiter substitution on transmit messages
    protected onEncoded(msgType: string, txt: string): void {
        this.fixLog.info(AsciiSession.asPiped(txt))
    }

    protected onReady(view: MsgView): void {
        cron.schedule(`*/5 * * * * *`, () => {
            //cron.schedule(`*/5 * * * * *`, () => {
            this.logger.info(`inserting AVGSpreads...`)
            console.log(`inserting AVGSpreads...`)
            this.dbConnector.insertAvg(this.avgSpreads.values())
        })
        this.logger.info('ready')
        this.dbConnector.querySymbols().then(symbols => {
            const mdr: IMarketDataRequest = MarketDataFactory.createMarketDataRequest(this.appConfig.BrokerName, SubscriptionRequestType.SnapshotAndUpdates, symbols)
            // send request to server
            this.send(MsgType.MarketDataRequest, mdr)
            // const logoutSeconds = 30
            // this.logger.info(`will logout after ${logoutSeconds}`)
            // setTimeout(() => {
            //     this.done()
            // }, logoutSeconds * 1000)
        })
    }

    protected onLogon(view: MsgView, user: string, password: string): boolean {
        this.logger.info(`peer logs in user ${user}`)
        
        return true

    }
}