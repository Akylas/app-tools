import { l, lc } from '@nativescript-community/l';
import { Label } from '@nativescript-community/ui-label';
import { MDCAlertControlerOptions, alert as mdAlert } from '@nativescript-community/ui-material-dialogs';
import { AlertOptions } from '@nativescript/core';
import { wrapNativeException } from '@nativescript/core/utils';
import { CustomError, NoNetworkError, TimeoutError } from '@shared/utils/error';
import { Sentry, isSentryEnabled } from '@shared/utils/sentry';
import { createView, showSnack } from '@shared/utils/ui';
import { get } from 'svelte/store';
import { colors } from '~/variables';

export async function showError(
    err: Error | string,
    {
        alertOptions = {},
        forcedMessage,
        showAsSnack = false,
        silent = false
    }: { showAsSnack?: boolean; forcedMessage?: string; alertOptions?: AlertOptions & MDCAlertControlerOptions; silent?: boolean } = {}
) {
    try {
        if (!err) {
            return;
        }

        const reporterEnabled = SENTRY_ENABLED && isSentryEnabled;
        const errorType = typeof err;
        const realError = errorType === 'string' ? null : wrapNativeException(err);
        if (realError.customErrorConstructorName === 'IgnoreError') {
            return;
        }

        const isString = realError === null || realError === undefined;
        let message = isString ? (err as string) : realError.message || realError.toString();
        DEV_LOG && console.error('showError', message, realError?.['stack'], realError?.['stackTrace'], realError?.['nativeException']);
        message = forcedMessage || message;
        if (showAsSnack || realError.customErrorConstructorName === 'NoNetworkError' || realError.customErrorConstructorName === 'TimeoutError') {
            showSnack({ message });
            return;
        }
        // const showSendBugReport = reporterEnabled && !isString && !(realError instanceof HTTPError) && !!realError.stack;
        const title = realError?.['title'] || lc('error');

        if (SENTRY_ENABLED && realError && reporterEnabled && realError.customErrorConstructorName !== 'PermissionError' && realError.customErrorConstructorName !== 'SilentError') {
            try {
                if (realError instanceof CustomError) {
                    Sentry.withScope((scope) => {
                        scope.setExtra('errorData', JSON.stringify(realError.extraData));
                        if (!realError.sentryReportTranslatedName) {
                            // we dont want translated error messages which makes it hard to debug
                            realError.message = realError.customErrorConstructorName;
                        }
                        Sentry.captureException(realError);
                    });
                } else {
                    Sentry.captureException(realError);
                }
            } catch (error) {
                console.error(error, error.stack);
            }
        }
        if (silent) {
            return;
        }
        return mdAlert({
            okButtonText: lc('ok'),
            title,
            view: createView(Label, {
                padding: '10 20 0 20',
                textWrap: true,
                color: get(colors).colorOnSurfaceVariant as any,
                html: message.trim()
            }),
            iosForceClosePresentedViewController: true, //ensure error popup is always showing
            ...alertOptions
        });
    } catch (error) {
        console.error('error trying to show error', err, error, error.stack);
    }
}

export function alert(message: string) {
    return mdAlert({
        okButtonText: l('ok'),
        message
    });
}
