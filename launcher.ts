import * as path from 'path'
import { JsFixWinstonLogFactory, WinstonLogger, IJsFixConfig, IJsFixLogger, SessionMsgFactory, makeConfig } from 'jspurefix'
import { Common, IAppConfig } from './MDCapture/common'
import { EventEmitter } from 'events';
const logFactory = new JsFixWinstonLogFactory(WinstonLogger.consoleOptions('debug'))

export abstract class Launcher {
    protected appConfig: IAppConfig
    private readonly logger: IJsFixLogger
    protected constructor(appConfig: string) {
        this.logger = logFactory.logger('launcher')
        var root = __dirname
        const init = path.join(root, appConfig)
        this.logger.info(`init = ${init}`)
        this.appConfig = require(init)
        this.appConfig.AvgTerm = 5
    }

    protected abstract getInitiator(fConfig: IJsFixConfig): Promise<any>

    public run() {
        return new Promise<any>((accept, reject) => {
            const logger = this.logger
            logger.info('launching ..')
            this.setup().then(() => {
                logger.info('.. done')
                accept()
            }).catch((e: Error) => {
                logger.error(e)
                reject(e)
            })
        })
    }
    private async setup() {
        const clientDescription = Common.makeFConfig(this.appConfig)//require(path.join(root, this.initiatorConfig))
        const clientConfig = await
            makeConfig(clientDescription, logFactory, new SessionMsgFactory(clientDescription))
        this.logger.info('create initiator')
        this.logger.info('launching ....')
        var failedAttemp = 0
        while (failedAttemp < this.appConfig.FMaxFailAttempNo) {
            try {
                var client = await this.getInitiator(clientConfig)
                failedAttemp = 0;
                this.logger.warning(`Connection Stopped, try reconnecting after 10 sec...`);
            } catch (error) {
                this.logger.warning(`Connect error, try reconnecting after 10 sec ... attemp: ${failedAttemp}/${this.appConfig.FMaxFailAttempNo}`);
                failedAttemp++;
            } finally {
                await Common.delay(10000);
            }
        }
        return client;
        //return Promise.all([client])
    }
}