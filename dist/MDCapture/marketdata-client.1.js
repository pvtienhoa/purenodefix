"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jspurefix_1 = require("jspurefix");
const cron = require("node-cron");
const marketdata_factory_1 = require("./marketdata-factory");
const AvgSpread_1 = require("./AvgSpread");
const dbconnector_1 = require("./dbconnector");
const repo_1 = require("jspurefix/dist/types/FIX4.4/repo");
class MarketDataClient extends jspurefix_1.AsciiSession {
    constructor(config, appConfig) {
        super(config);
        this.config = config;
        this.appConfig = appConfig;
        this.logReceivedMsgs = true;
        this.fixLog = config.logFactory.plain(`jsfix.${config.description.application.name}.log`);
        this.logger = config.logFactory.logger(`${this.me}:MarketDataClient`);
        this.dbConnector = new dbconnector_1.DBConnector(this.appConfig, config.logFactory);
        this.avgSpreads = new jspurefix_1.Dictionary();
        this.cronJob = cron.schedule(`*/${appConfig.AvgTerm} * * * *`, () => {
            this.logger.info(`inserting AVGSpreads...`);
            this.dbConnector.insertAvg(this.avgSpreads.values());
        }, { scheduled: false });
        this.msgCount = 0;
    }
    onApplicationMsg(msgType, view) {
        switch (msgType) {
            case jspurefix_1.MsgType.MarketDataSnapshotFullRefresh:
            case jspurefix_1.MsgType.MarketDataIncrementalRefresh: {
                this.msgCount++;
                let lq = marketdata_factory_1.MarketDataFactory.parseLiveQuote(msgType, view);
                this.dbConnector.updateLiveQuotes(lq);
                let a = this.avgSpreads.get(lq.Symbol);
                if (a)
                    a.addSum(lq.Spread);
                else {
                    a = new AvgSpread_1.AvgSpread(this.appConfig.FBrokerName, lq.Symbol);
                    a.addSum(lq.Spread);
                }
                this.avgSpreads.addUpdate(a.symbol, a);
                break;
            }
            case jspurefix_1.MsgType.SecurityList: {
                this.logger.info('Security List received!');
            }
            default:
                break;
        }
    }
    onStopped() {
        this.logger.info('Stopped!');
        this.cronJob.stop();
    }
    onDecoded(msgType, txt) {
        this.fixLog.info(txt);
    }
    onEncoded(msgType, txt) {
        this.fixLog.info(jspurefix_1.AsciiSession.asPiped(txt));
    }
    onReady(view) {
        this.logger.info('ready');
        this.dbConnector.querySymbols().then(symbols => {
            const mdr = marketdata_factory_1.MarketDataFactory.createMarketDataRequest(this.appConfig.FBrokerName, repo_1.SubscriptionRequestType.SnapshotAndUpdates, symbols);
            this.send(jspurefix_1.MsgType.MarketDataRequest, mdr);
            this.cronJob.start();
        });
        process.on('SIGINT', function () {
            console.log("Caught interrupt signal");
            console.log(`Total Mesages Received: ${this.msgCount}`);
            this.done();
            process.exit();
        });
    }
    onLogon(view, user, password) {
        this.logger.info(`peer logs in user ${user}`);
        return true;
    }
}
exports.MarketDataClient = MarketDataClient;
//# sourceMappingURL=marketdata-client.1.js.map