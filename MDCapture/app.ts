import { MarketDataClient } from './marketdata-client'
import { IJsFixConfig, initiator } from 'jspurefix'
import { Launcher } from '../launcher'
import { IAppConfig } from './common';

class AppNfixLauncher extends Launcher {
    public constructor () {
      super(
        './../config.json')
    }
    protected getInitiator (config: IJsFixConfig): Promise<any> {
        return initiator(config, c => new MarketDataClient(c, this.appConfig))
      }
}

const l = new AppNfixLauncher()
l.run().then(() => {
  console.log('finished.')
})