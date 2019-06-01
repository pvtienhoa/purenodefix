import * as path from 'path'
import { JsFixWinstonLogFactory, WinstonLogger, IJsFixConfig, IJsFixLogger, SessionMsgFactory, makeConfig } from 'jspurefix'
import { Common, IAppConfig } from './MDCapture/common'
const logFactory = new JsFixWinstonLogFactory(WinstonLogger.consoleOptions('info'))

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
        const client = this.getInitiator(clientConfig)
        this.logger.info('launching ....')
        return Promise.all([client])
    }
}