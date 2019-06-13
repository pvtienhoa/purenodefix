import { MarketDataClient } from './marketdata-client'
import { IJsFixConfig, initiator } from 'jspurefix'
import { Launcher } from '../launcher'
import { EventEmitter } from 'events';
import { resolve } from 'path';

class AppNfixLauncher extends Launcher {
    public constructor () {
      super(
        './../config.json')
    }
    protected getInitiator (config: IJsFixConfig): Promise<any> {
        return initiator(config, c => new MarketDataClient(c, this.appConfig),5000)
      }
}

const l = new AppNfixLauncher()

l.run().then(()=>{
  console.log('finished.')});

// var failedAttemp:number = 0
// while (failedAttemp < 10) {
//   l.run().then(()=>{
//       console.log('finished. Trying to restart')},
//     () => {
//       failedAttemp ++;
//       console.log('Failed to connect. Trying to restart')
//   })
// }


// setInterval(async () => {
//   await l.run()
// },5000)