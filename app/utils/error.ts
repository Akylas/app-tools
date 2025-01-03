import { l, lc } from '@nativescript-community/l';
import { BaseError } from 'make-error';
import type { HttpsRequestOptions as HTTPSOptions, Headers, HttpsRequestOptions } from '@nativescript-community/https';
import { wrapNativeException } from '@nativescript/core/utils';

Error.stackTraceLimit = Infinity;

function evalTemplateString(resource: string, obj: object) {
    if (!obj) {
        return resource;
    }
    const names = Object.keys(obj);
    const vals = Object.keys(obj).map((key) => obj[key]);
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    return new Function(...names, `return \`${resource}\`;`)(...vals);
}

export class CustomError extends BaseError {
    customErrorConstructorName: string;
    isCustomError = true;
    assignedLocalData: any;
    silent?: boolean;
    _customStack?: string;
    sentryReportTranslatedName = false;

    get extraData() {
        return { errorType: this.customErrorConstructorName, data: this.localData };
    }

    static fromObject(data) {
        switch (data.customErrorConstructorName) {
            case 'TimeoutError':
                return new TimeoutError(data);
            case 'NoNetworkError':
                return new NoNetworkError(data);
            case 'HTTPError':
                return new HTTPError(data);
            case 'NoSpaceLeftError':
                return new NoSpaceLeftError(data);
            case 'PermissionError':
                return new PermissionError(data);
            case 'SilentError':
                return new SilentError(data);
            default:
                return new CustomError(data);
        }
    }
    constructor(props?, customErrorConstructorName?: string) {
        super(props.message);
        this.message = props.message;
        delete props.message;

        // standard way: Error.captureStackTrace(this, this.constructor.name);
        // if you do this, you couldn't set different getter for the 'stack' property
        this.stack = props.stack || new Error().stack; // do this, if you need a custom getter

        this.silent = props.silent;
        delete props.silent;

        // we need to understand if we are duplicating or not
        const isError = props instanceof Error;
        if (customErrorConstructorName || isError) {
            // duplicating
            // use getOwnPropertyNames to get hidden Error props
            const keys = Object.getOwnPropertyNames(props);
            for (let index = 0; index < keys.length; index++) {
                const k = keys[index];
                if (!props[k] || typeof props[k] === 'function') continue;
                if (k === 'stack') {
                    this._customStack = props[k];
                } else {
                    this[k] = props[k];
                }
            }
        }
        this.assignedLocalData = props;

        this.customErrorConstructorName ??= customErrorConstructorName || (this as any).constructor.name; // OR (<any>this).constructor.name;
    }
    //@ts-ignore
    get stack() {
        return this._customStack;
    }
    set stack(value) {
        this._customStack = value;
    }

    get localData() {
        return JSON.parse(JSON.stringify(this.assignedLocalData));
    }

    toJSON() {
        const error = {
            message: this.message
        };
        Object.getOwnPropertyNames(this).forEach((key) => {
            if (typeof this[key] !== 'function') {
                error[key] = this[key];
            }
        });
        return error;
    }
    toData() {
        return JSON.stringify(this.toJSON());
    }
    toString() {
        return evalTemplateString(l(this.message), Object.assign({ l }, this.assignedLocalData));
    }

    getMessage() {}
}

export class TimeoutError extends CustomError {
    constructor(props?) {
        super(
            Object.assign(
                {
                    message: lc('timeout_error')
                },
                props
            ),
            'TimeoutError'
        );
    }
}
export class PermissionError extends CustomError {
    constructor(message?) {
        super(
            {
                message: message ?? lc('permission_error')
            },
            'PermissionError'
        );
    }
}
export class SilentError extends CustomError {
    constructor(message?) {
        super(
            {
                message: message ?? 'silent_error'
            },
            'SilentError'
        );
    }
}

export class NoNetworkError extends CustomError {
    constructor(props?) {
        super(
            Object.assign(
                {
                    message: lc('no_network')
                },
                props
            ),
            'NoNetworkError'
        );
    }
}
export interface HTTPErrorProps {
    statusCode: number;
    message: string;
    requestParams: HTTPSOptions;
}

export class NoSpaceLeftError extends CustomError {
    constructor(error: Error) {
        super(
            Object.assign(
                { error: { message: error.message, stack: error.stack }, stack: error.stack },
                {
                    message: lc('no_space_left')
                }
            ),
            'NoSpaceLeftError'
        );
    }
}
export interface HTTPErrorProps {
    statusCode: number;
    responseHeaders?: Headers;
    message: string;
    requestParams: HTTPSOptions;
}
export class HTTPError extends CustomError {
    statusCode: number;
    requestParams: HTTPSOptions;
    sentryReportTranslatedName = true;
    constructor(props: HTTPErrorProps | HTTPError) {
        super(
            Object.assign(
                {
                    message: 'httpError'
                },
                props
            ),
            'HTTPError'
        );
    }
}

export function wrapNativeHttpException(error, requestParams: HttpsRequestOptions) {
    return wrapNativeException(error, (message) => {
        if (
            /(cancelled)/.test(message) ||
            (__ANDROID__ && /(SocketTimeout|ConnectException|SocketException|SSLException|UnknownHost)/.test(message)) ||
            (__IOS__ && /(request timed out|unable to complete your request|ConnectException|connection was lost)/.test(message))
        ) {
            return new TimeoutError();
        } else {
            return new HTTPError({
                message,
                statusCode: -1,
                requestParams
            });
        }
    });
}
