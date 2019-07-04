import { MarketDataClient } from './marketdata-client'
import { IJsFixConfig, initiator } from 'jspurefix'
import { Launcher } from '../launcher'
import { EventEmitter } from 'events';
import { resolve } from 'path';
import { Common } from './common';
import * as path from 'path'

class AppNfixLauncher extends Launcher {
  public constructor() {
    super(
      './config.json')
  }
  protected getInitiator(config: IJsFixConfig): Promise<any> {
    return initiator(config, c => new MarketDataClient(c, this.appConfig), 5000)
  }
}

(async () => {
  var root = __dirname
  const init = path.join(root, './../config.json')
  const appConfig = Common.loadAppConfig(init);
  // l.run().then(() => {
  //   console.log('finished.')
  // });

  var failedAttemp = 0
  while (failedAttemp < appConfig.MaxAttempts) {
    try {
      var l = new AppNfixLauncher();
      await l.run();
      failedAttemp = 0;
      l = null;
      console.log('done');
      // this.logger.warning(`Connection Stopped, try reconnecting after 10 sec...`);
    } catch (error) {
      console.log(error.message);
      // this.logger.warning(`Connect error, try reconnecting after 10 sec ... attemp: ${failedAttemp}/${appConfig.FMaxFailAttempNo}`);
      failedAttemp++;
    } finally {
      await Common.delay(60 * 1000);
    }
  }
})();
// const l = new AppNfixLauncher()



// setInterval(async () => {
//   await l.run()
// },5000)