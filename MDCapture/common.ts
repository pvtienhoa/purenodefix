import * as moment from 'moment'
import * as fs from 'fs'

export enum SubscriptionRequestType {
    
}

export interface IAppConfig {
    FHost: string
    FPort: number
    FSenderID: string
    FTargetID: string
    FTargetSubID: string
    FUserName: string
    FPassword: string
    FMsgType: string
    FBrokerName: string
    FNoMsgResetTimeout: number
    FMaxFailAttempNo: number
    DBHost: string
    DBDatabase: string
    DBUserName: string
    DBPassword: string
    DBSocketPath: string
    TblSymbols: string
    TblLiveQuotes: string
    TblAverageSpreads: string
    AvgTerm: number
}
export class Common {
    public static getTimeStamp(timeStamp?: Date, formatStr: string = 'YYYYMMDD-hh:mm:ss.SSS'): string {
        if (timeStamp) return moment(timeStamp, formatStr).format("YYYYMMDDhhmmssSSS")
        else return moment().utc().format("YYYYMMDDhhmmssSSS");
    }

    public static roundToFixed(num: number, scale: number = 5) : number {
        if(!("" + num).includes("e")) {
            return +(Math.round(+(num + "e+" + scale))  + "e-" + scale);
          } else {
            var arr = ("" + num).split("e");
            var sig = ""
            if(+arr[1] + scale > 0) {
              sig = "+";
            }
            return +(Math.round(+(+arr[0] + "e" + sig + (+arr[1] + scale))) + "e-" + scale);
          }
    }

    public static loadAppConfig(path: string): IAppConfig {
        return require(path)
      }

    public static makeFConfig (appConfig : IAppConfig): any{
        return {
            "application": {
                "reconnectSeconds": 10,
                "type": "initiator",
                "name": appConfig.FBrokerName,
                "tcp": {
                  "host" : appConfig.FHost,
                  "port": appConfig.FPort
                },
                "protocol": "ascii",
                "dictionary": "repo44"
              },
              "Username": appConfig.FUserName,
              "Password": appConfig.FPassword,
              "EncryptMethod": 0,
              "ResetSeqNumFlag": true,
              "HeartBtInt": 30,
              "SenderCompId": appConfig.FSenderID,
              "TargetCompID": appConfig.FTargetID,
              "TargetSubID": appConfig.FTargetSubID,
              "BeginString": appConfig.FMsgType
        }
    }

    public static delay (p: number): Promise<any> {
      return new Promise<any>((accept) => {
        if (!p) {
          accept()
        }
        setTimeout(() => {
          accept()
        }, p)
      })
    }
}
