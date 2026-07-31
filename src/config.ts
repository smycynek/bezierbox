import { Logger, LoggerLevel } from './Logger';

Logger.loggerLevel = LoggerLevel.Info;

const deployed = import.meta.env.PROD;

export let staticHostname = 'http://localhost:3000/bezierbox';

if (deployed) {
  staticHostname = 'https://stevenvictor.net/bezierbox/';
}
