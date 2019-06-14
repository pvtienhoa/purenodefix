import {
    AsciiSession,
    MsgView,
    IJsFixConfig,
    IJsFixLogger,
    Dictionary,
    MsgType,
    SessionState,
    FixSessionState,
    MsgTransport
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
import { LiveQuote } from './LiveQuote'
import { SubscriptionRequestType } from 'jspurefix/dist/types/FIX4.4/repo';
import * as moment from 'moment'


export class MarketDataClient extends AsciiSession {
    private readonly logger: IJsFixLogger
    private readonly fixLog: IJsFixLogger
    private readonly eventLog: IJsFixLogger
    private liveQuotes: Dictionary<LiveQuote>
    private dbConnector: DBConnector
    private InsertAvgSpreadCronJob: cron.ScheduledTask
    private dailyReconnectCronJob: cron.ScheduledTask
    private msgCount: number
    private isIdling: boolean
    private idleDuration: moment.Duration
    private tmpTrans: MsgTransport
    constructor(public readonly config: IJsFixConfig, private readonly appConfig: IAppConfig) {
        super(config);
        this.logReceivedMsgs = true;
        this.fixLog = config.logFactory.plain(`${this.appConfig.FMsgType}-${this.appConfig.FUserName}-${this.appConfig.FSenderID}-${this.appConfig.FTargetID}.messages`, 5 * 1024 * 1024 * 1024);
        this.eventLog = config.logFactory.plain(`${this.appConfig.FMsgType}-${this.appConfig.FUserName}-${this.appConfig.FSenderID}-${this.appConfig.FTargetID}.event`, 100 * 1024 * 1024);
        this.logger = config.logFactory.logger(`${this.me}:MDClient`);
        this.dbConnector = new DBConnector(this.appConfig, config.logFactory);
        this.liveQuotes = new Dictionary<LiveQuote>();
        this.msgCount = 0;
        this.isIdling = false;
        this.idleDuration = moment.duration();
        this.InsertAvgSpreadCronJob = cron.schedule(`*/${appConfig.AvgTerm} * * * *`, () => {
            this.logger.info(`inserting AVGSpreads...`)
            if (this.liveQuotes && this.dbConnector) this.dbConnector.insertAvgSpreads(this.liveQuotes.values());
        }, { scheduled: false });
        this.dailyReconnectCronJob = cron.schedule(`0 2 * * *`, () => {
            this.logger.info(`Daily disconnected`);
            this.eventLog.info(`Daily disconnected`);
            this.done()
        }, { 
            scheduled: false,
            timezone: "Etc/UTC"
         });
    }

    // onApp Event Listener
    protected onApplicationMsg(msgType: string, view: MsgView): void {
        //this.logger.debug(`${view.toJson()}`)
        switch (msgType) {
            case MsgType.MarketDataSnapshotFullRefresh:
            case MsgType.MarketDataIncrementalRefresh: {
                this.msgCount++
                let lq = MarketDataFactory.parseLiveQuote(msgType, view);
                let lqToUpdate = this.liveQuotes.get(lq.symbol);
                lqToUpdate.update(lq);
                this.liveQuotes.addUpdate(lq.symbol, lqToUpdate);
                if (this.isIdling) this.isIdling = false;
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
        this.eventLog.info('Client stopped!');
        this.logger.info('Stopped!');
        this.InsertAvgSpreadCronJob.stop();
        
        
        this.InsertAvgSpreadCronJob.destroy();
        this.dailyReconnectCronJob.destroy();
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
        this.eventLog.info('Logged on!');
        this.logger.info('ready')
        this.tmpTrans = this.transport;

        // Send Test msg to Server
        // this.logger.info('send test message...')
        // const t: ITestRequest = MarketDataFactory.createTestRequest(this.appConfig.BrokerName)
        // this.send(MsgType.TestRequest,t)

        // Query Symbol list from server
        // this.logger.info('query symbol list from server...')
        // const slr: ISecurityListRequest = MarketDataFactory.createSecurityListRequest(this.appConfig.BrokerName,SecurityListRequestType.AllSecurities)
        // this.send(MsgType.SecurityListRequest,slr)

        try {
            this.dbConnector.querySymbols().then(symbols => {
                this.eventLog.info(`Symbol list accquired, count: ${symbols.length}`)
                var symbolList: string[] = []
                // Query data from Symbols table and create LiveQuote Dictionary
                symbols.forEach(r => {
                    let l = new LiveQuote(r.currencypairname, this.appConfig.FBrokerName, 0, 0, r.Digit);
                    this.liveQuotes.addUpdate(r.currencypairname, l);
                    symbolList.push(r.currencypairname);
                });

                // Create Martket Data Request with symbolist
                const mdr: IMarketDataRequest = MarketDataFactory.createMarketDataRequest(this.appConfig.FBrokerName, SubscriptionRequestType.SnapshotAndUpdates, symbolList);

                // Send MD Request to server
                this.eventLog.info(`Sending MDRequest to host: ${this.appConfig.FHost}: ${this.appConfig.FPort}`);
                this.send(MsgType.MarketDataRequest, mdr)

                //Start Cron-Jobs                
                this.InsertAvgSpreadCronJob.start();
                this.eventLog.info(`Cronjob for inserting AvgSpreads Started!`);
                this.dailyReconnectCronJob.start();
                this.eventLog.info(`Cronjob for daily Reconnect Started!`);

                setInterval(() => {
                    if (this.isIdling) this.idleDuration.add(200, 'ms')
                    else this.idleDuration = moment.duration();
                    this.isIdling = true;
                    if (this.idleDuration.asMinutes() >= this.appConfig.FNoMsgResetTimeout) {
                        this.eventLog.info(`Client has been idle for ${this.appConfig.FNoMsgResetTimeout} minutes, Reconnecting`);
                        this.logger.info(`Client has been idle for ${this.appConfig.FNoMsgResetTimeout} minutes, Reconnecting`);
                        this.done();
                    }

                    if (this.liveQuotes && this.dbConnector && this.sessionState.state === SessionState.PeerLoggedOn) {
                        this.logger.info(`updating LiveQuotes...`);
                        this.dbConnector.updateLiveQuotes(this.liveQuotes.values());
                        this.liveQuotes.values().forEach(lq => {
                            lq.lqFlag = false;
                            this.liveQuotes.addUpdate(lq.symbol, lq);
                        });
                    }
                }, 200);
                this.eventLog.info(`Interval job for updating LiveQuotes Started!`);
            })
        } catch (error) {
            this.eventLog.error(error);
            this.logger.error(error);
        }

        // let symbols = ['AUD/CAD','AUD/CHF','AUD/JPY','AUD/NZD','AUD/USD','CAD/CHF','CAD/JPY','CHF/JPY','EUR/AUD','EUR/CAD','EUR/CHF','EUR/GBP','EUR/JPY','EUR/USD']
        // const mdr: IMarketDataRequest = MarketDataFactory.createMarketDataRequest(this.appConfig.BrokerName, SubscriptionRequestType.SnapshotAndUpdates, symbols)
        // this.send(MsgType.MarketDataRequest, mdr)
        // this.cronJob.start()
        process.on('SIGINT', function () {
            console.log("Caught interrupt signal");
            console.log(`Total Mesages Received: ${this.msgCount}`)
            this.done();
            process.exit()
        });
    }

    // onLogon Event Listener
    protected onLogon(view: MsgView, user: string, password: string): boolean {
        this.eventLog.info('Tring to Log on!');
        this.logger.info(`peer logs in user ${user}`)
        return true
    }

    protected updateLiveQuotesTick(self: MarketDataClient): void {
        console.log(`updating LiveQuotes...`);
        if (self.liveQuotes && self.dbConnector) self.dbConnector.updateLiveQuotes(self.liveQuotes.values());
    }

    protected insertAvgSpreadsTick(self: MarketDataClient): void {
        self.eventLog.info(`inserting AVGSpreads...`)
        self.logger.info(`inserting AVGSpreads...`)
        if (self.liveQuotes && self.dbConnector) self.dbConnector.insertAvgSpreads(self.liveQuotes.values());
    }
}