import {
    AsciiSession,
    MsgView,
    IJsFixConfig,
    IJsFixLogger,
    Dictionary,
    MsgType,
    SessionState,
    FixSessionState,
    MsgTransport,
    Tags,
    MsgTag
} from 'jspurefix'
import * as cron from 'node-cron'
import {
    IMarketDataRequest,
    ISecurityListRequest,
    IMassQuoteAcknowledgement,
    MDUpdateType
} from 'jspurefix/dist/types/FIX4.4/repo'
import { MarketDataFactory } from './marketdata-factory'
import { DBConnector } from './dbconnector';
import { IAppConfig, Common } from './common';
import { EventEmitter } from 'events';
import { LiveQuote } from './LiveQuote'
import { SubscriptionRequestType } from 'jspurefix/dist/types/FIX4.4/repo';
import * as path from 'path'
import * as moment from 'moment'


export class MarketDataClient extends AsciiSession {
    private logger: IJsFixLogger
    private fixLog: IJsFixLogger
    private eventLog: IJsFixLogger
    private liveQuotes: Dictionary<LiveQuote>
    private dbConnector: DBConnector
    private InsertAvgSpreadCronJob: cron.ScheduledTask
    private dailyReconnectCronJob: cron.ScheduledTask
    private msgCount: number
    private isIdling: boolean
    private idleDuration: number
    private clientTickHandler: number
    constructor(public readonly config: IJsFixConfig, private readonly appConfig: IAppConfig) {
        super(config);
        var root = __dirname;
        const logpath = path.join(root, './../..');
        const maxFile = this.appConfig.LogDays + 'd';
        this.logReceivedMsgs = true;
        this.fixLog = config.logFactory.plain(`${this.appConfig.MsgType}-${this.appConfig.UserName}-${this.appConfig.SenderID}-${this.appConfig.TargetID}.messages`, 5 * 1024 * 1024 * 1024, false, true, maxFile, logpath);
        this.eventLog = config.logFactory.plain(`${this.appConfig.MsgType}-${this.appConfig.UserName}-${this.appConfig.SenderID}-${this.appConfig.TargetID}.event`, 100 * 1024 * 1024, true, true, maxFile, logpath);
        this.logger = config.logFactory.logger(`${this.me}:MDClient`);
        this.dbConnector = new DBConnector(this.appConfig, config.logFactory);
        this.liveQuotes = new Dictionary<LiveQuote>();
        this.msgCount = 0;
        this.isIdling = false;
        this.idleDuration = 0;
        this.clientTickHandler = 0;
        this.InsertAvgSpreadCronJob = cron.schedule(`*/${appConfig.AvgTerm} * * * *`, () => {
            this.insertAvgSpreadsTick();
        }, { scheduled: false });
        this.dailyReconnectCronJob = cron.schedule(`0 2 * * *`, () => {
            this.logger.info(`Daily disconnected`);
            this.eventLog.info(`Daily disconnected`);
            this.done();
        }, {
                scheduled: false,
                timezone: "Etc/UTC"
            });
    }

    // onApp Event Listener
    protected onApplicationMsg(msgType: string, view: MsgView): void {
        //this.logger.debug(`${view.toJson()}`)
        switch (msgType) {
            case MsgType.MassQuote:
                var quoteID = view.getString(MsgTag.QuoteID);
                if (quoteID) {
                    let mqa: IMassQuoteAcknowledgement = MarketDataFactory.createMassQuoteAcknowledgement(quoteID);
                    this.send(MsgType.MassQuoteAcknowledgement, mqa);
                }
            case MsgType.MarketDataSnapshotFullRefresh:
            case MsgType.MarketDataIncrementalRefresh: {
                this.msgCount++
                let lqs = MarketDataFactory.parseLiveQuotes(msgType, view);
                if (!lqs.length) throw new Error('no LiveQuotes from Parsed!');
                lqs.forEach(e => {
                    let lqToUpdate: LiveQuote
                    if (e.symbol) lqToUpdate = this.liveQuotes.get(e.symbol)
                    else lqToUpdate = this.liveQuotes.values().find(x => x.reqID === e.reqID)
                    lqToUpdate.update(e);
                    this.liveQuotes.addUpdate(lqToUpdate.symbol, lqToUpdate);
                });
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
    protected onStopped() {

        this.cleanup();
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
                // Query data from Symbols table and create LiveQuote Dictionary
                symbols.forEach(r => {
                    let l = new LiveQuote(r.currencypairname, r.requestId, this.appConfig.Broker, 0, 0, r.Digit);
                    this.liveQuotes.addUpdate(r.currencypairname, l);

                    // Create Martket Data Request with symbolist
                    let mdr: IMarketDataRequest = MarketDataFactory.createMarketDataRequest(l.reqID, SubscriptionRequestType.SnapshotAndUpdates, l.symbol, MDUpdateType.IncrementalRefresh);

                    // Send MD Request to server
                    this.eventLog.info(`Sending MDRequest to host: ${this.appConfig.Host}: ${this.appConfig.Port}`);
                    this.send(MsgType.MarketDataRequest, mdr)
                });

                //Start Cron-Jobs                
                this.InsertAvgSpreadCronJob.start();
                this.eventLog.info(`Cronjob for inserting AvgSpreads Started!`);
                this.dailyReconnectCronJob.start();
                this.eventLog.info(`Cronjob for daily Reconnect Started!`);
                this.clientTickHandler = Common.startInterval(() => { this.clientTick() }, 200);
                this.eventLog.info(`Interval job for updating LiveQuotes Started!`);
            })
        } catch (error) {
            this.eventLog.error(error);
            this.logger.error(error);
            this.cleanup();
            throw error;
        }

        // let symbols = ['AUD/CAD','AUD/CHF','AUD/JPY','AUD/NZD','AUD/USD','CAD/CHF','CAD/JPY','CHF/JPY','EUR/AUD','EUR/CAD','EUR/CHF','EUR/GBP','EUR/JPY','EUR/USD']
        // const mdr: IMarketDataRequest = MarketDataFactory.createMarketDataRequest(this.appConfig.BrokerName, SubscriptionRequestType.SnapshotAndUpdates, symbols)
        // this.send(MsgType.MarketDataRequest, mdr)
        // this.cronJob.start()
        process.on('SIGINT', function () {
            console.log("Caught interrupt signal");
            process.exit()
        });
    }

    // onLogon Event Listener
    protected onLogon(view: MsgView, user: string, password: string): boolean {
        this.eventLog.info('Trying to Log on!');
        this.logger.info(`peer logs in user ${user}`)
        return true
    }

    protected updateLiveQuotesTick(): void {
        if (this.liveQuotes && this.dbConnector && this.sessionState.state === SessionState.PeerLoggedOn) {
            this.dbConnector.updateLiveQuotes(this.liveQuotes.values()).then((res) => {
                if (res) this.logger.info(`LiveQuotes Updated`);
            }).catch((error) => {
                this.eventLog.error(error);
                this.logger.error(error);
                this.cleanup();
                throw error;
            });
        }
    }

    protected insertAvgSpreadsTick(): void {
        if (this.liveQuotes && this.dbConnector && this.sessionState.state === SessionState.PeerLoggedOn) {
            this.dbConnector.insertAvgSpreads(this.liveQuotes.values()).then((res) => {
                if (res) {
                    this.eventLog.info(`AVGSpreads Inserted`);
                    this.logger.info(`AVGSpreads Inserted`);
                }
            }).catch((error) => {
                this.eventLog.error(error);
                this.logger.error(error);
                this.cleanup();
                throw error;
            });
        }
    }

    protected clientTick() {
        if (this.isIdling) this.idleDuration += 200;
        else this.idleDuration = 0;
        this.isIdling = true;
        if (this.idleDuration >= this.appConfig.NoMsgResetTimeout * 60 * 1000) {
            this.eventLog.info(`Client has been idle for ${this.appConfig.NoMsgResetTimeout} minutes, Reconnecting`);
            this.logger.info(`Client has been idle for ${this.appConfig.NoMsgResetTimeout} minutes, Reconnecting`);
            this.done();
        }
        this.updateLiveQuotesTick();
        this.liveQuotes.values().forEach(lq => {
            lq.lqFlag = false;
            this.liveQuotes.addUpdate(lq.symbol, lq);
        });
    }

    protected cleanup(): void {
        clearInterval(this.clientTickHandler);
        this.clientTickHandler = null;

        this.liveQuotes = null;

        this.InsertAvgSpreadCronJob.destroy();
        // this.InsertAvgSpreadCronJob = null

        this.InsertAvgSpreadCronJob.destroy();
        // this.InsertAvgSpreadCronJob = null

        this.dailyReconnectCronJob.destroy();
        // this.dailyReconnectCronJob = null

        this.msgCount = null
        this.isIdling = null
        this.idleDuration = null


        this.dbConnector.stop();

        this.eventLog.info('Client stopped!');
        this.logger.info('Stopped!');

        this.fixLog = null;
        this.eventLog = null;
    }
}