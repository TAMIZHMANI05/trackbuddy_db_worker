import { createLogger, transports, format } from 'winston';
import { ConsoleTransportInstance, FileTransportInstance } from 'winston/lib/winston/transports';
import util from 'util';
import config from '../configs/config';
import { EApplicationEnvironment } from '../constants/application';
import path from 'path';
import * as sourceMapSupport from 'source-map-support';
import { blue, green, magenta, red, yellow } from 'colorette';

// Trace Support
sourceMapSupport.install();

const colorizeLevel = (level: string) => {
    switch (level) {
        case 'ERROR':
            return red(level);
        case 'INFO':
            return blue(level);
        case 'WARN':
            return yellow(level);
        default:
            return level;
    }
};
const consoleLogFormat = format.printf((info) => {
    const { level, message, timestamp, meta } = info;
    const customLevel = colorizeLevel(level.toUpperCase());
    const customTimestamp = green(timestamp as string);
    const customMessage = message;
    const customMeta = util.inspect(meta, {
        showHidden: false,
        depth: null,
        colors: true
    });

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const customLog = `${customLevel} [${customTimestamp}] ${customMessage}\n${magenta('META')} ${customMeta}\n`;

    return customLog;
});

const fileLogFormat = format.printf((info) => {
    const { level, message, timestamp, meta = {} } = info;
    const logMeta: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(meta as Record<string, unknown>)) {
        if (value instanceof Error) {
            logMeta[key] = {
                name: value.name,
                message: value.message,
                trace: value.stack || ''
            };
        } else {
            logMeta[key] = value;
        }
    }

    const logData = {
        level: level.toUpperCase(),
        message,
        timestamp,
        meta: logMeta
    };

    return JSON.stringify(logData, null, 4);
});

const consoleTransport = (): Array<ConsoleTransportInstance> => {
    if (config.ENV === EApplicationEnvironment.DEVELOPMENT) {
        return [
            new transports.Console({
                level: 'info',
                format: format.combine(format.timestamp(), consoleLogFormat)
            })
        ];
    }

    return [];
};

const FileTransport = (): Array<FileTransportInstance> => {
    return [
        new transports.File({
            filename: path.join(__dirname, '../', '../', 'logs', `${config.ENV}.log`),
            level: 'info',
            format: format.combine(format.timestamp(), fileLogFormat)
        })
    ];
};

export default createLogger({
    defaultMeta: {
        meta: {}
    },
    transports: [...FileTransport(), ...consoleTransport()]
});
