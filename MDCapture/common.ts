import * as moment from 'moment-timezone'
import * as fs from 'fs'
import * as util from 'util'

export enum SubscriptionRequestType {

}

export interface IAppConfig {
  Host: string
  Port: number
  SenderID: string
  TargetID: string
  TargetSubID?: string
  UserName: string
  Password: string
  MsgType: string
  Broker: string
  NoMsgResetTimeout: number
  MaxAttempts: number
  DBHost: string
  DBDatabase: string
  DBUserName: string
  DBPassword: string
  DBSocketPath: string
  DBLimitConn: number
  TblSymbols: string
  TblLiveQuotes: string
  TblAverageSpreads: string
  AvgTerm: number
  TimeZone: string
  LogDays: number
}
export class Common {
  public static getTimeStamp(timeZone: string, timeStamp?: Date, formatStr: string = 'YYYYMMDD-HH:mm:ss.SSS'): string {
    if (timeStamp) return moment(timeStamp, formatStr).tz(timeZone).format("YYYYMMDDHHmmssSSS")
    else return moment().tz(timeZone).format("YYYYMMDDHHmmssSSS");
  }

  public static roundToFixed(num: number, scale: number = 5): number {
    if (!("" + num).includes("e")) {
      return +(Math.round(+(num + "e+" + scale)) + "e-" + scale);
    } else {
      var arr = ("" + num).split("e");
      var sig = ""
      if (+arr[1] + scale > 0) {
        sig = "+";
      }
      return +(Math.round(+(+arr[0] + "e" + sig + (+arr[1] + scale))) + "e-" + scale);
    }
  }

  public static loadAppConfig(path: string): IAppConfig {
    return require(path)
  }

  public static makeFConfig(appConfig: IAppConfig): any {
    return {
      "application": {
        "reconnectSeconds": 10,
        "type": "initiator",
        "name": appConfig.Broker,
        "tcp": {
          "host": appConfig.Host,
          "port": appConfig.Port
        },
        "protocol": "ascii",
        "dictionary": "repo44"
      },
      "Username": appConfig.UserName,
      "Password": appConfig.Password,
      "EncryptMethod": 0,
      "ResetSeqNumFlag": true,
      "HeartBtInt": 30,
      "SenderCompId": appConfig.SenderID,
      "TargetCompID": appConfig.TargetID,
      // "TargetSubID": appConfig.FTargetSubID,
      "BeginString": appConfig.MsgType
    }
  }

  public static delay(p: number): Promise<any> {
    return new Promise<any>((accept) => {
      if (!p) {
        accept()
      }
      setTimeout(() => {
        accept()
      }, p)
    })
  }

  public static objToString(obj: object): string {
    return util.inspect(obj, false, null, true /* enable colors */);
  }

  public static startInterval(fn: Function, ms: number): number {
    return setInterval(fn, ms);
  }
}
