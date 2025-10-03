import { InAppBrowser } from '@akylas/nativescript-inappbrowser';
import { lc } from '@nativescript-community/l';
import { AlertDialog, alert } from '@nativescript-community/ui-material-dialogs';
import { SnackBarOptions, showSnack as mdShowSnack } from '@nativescript-community/ui-material-snackbar';
import { Application, Utils, View, ViewBase } from '@nativescript/core';
import type LoadingIndicator__SvelteComponent_ from '@shared/components/LoadingIndicator.svelte';
import LoadingIndicator from '@shared/components/LoadingIndicator.svelte';
import { showError } from '@shared/utils/showError';
import { NativeViewElementNode, createElement } from 'svelte-native/dom';
import { get } from 'svelte/store';
import { colors } from '~/variables';

export function timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export interface ComponentInstanceInfo<T extends ViewBase = View, U = SvelteComponent> {
    element: NativeViewElementNode<T>;
    viewInstance: U;
}
export function resolveComponentElement<T>(viewSpec: typeof SvelteComponent<T>, props?: T): ComponentInstanceInfo {
    const dummy = createElement('fragment', window.document as any);
    const viewInstance = new viewSpec({ target: dummy, props });
    const element = dummy.firstElement() as NativeViewElementNode<View>;
    return { element, viewInstance };
}

export function createView<T extends View>(claz: new () => T, props: Partial<Pick<T, keyof T>> = {}, events?) {
    const view: T = new claz();
    Object.assign(view, props);
    if (events) {
        Object.keys(events).forEach((k) => view.on(k, events[k]));
    }
    return view;
}

export async function showSnack(options: SnackBarOptions) {
    try {
        // options.view = options.view || Application.getRootView();
        return mdShowSnack({ ...options, iosIgnorePresentedViewController: (controller) => controller['isPopOverController'] === true });
    } catch (error) {}
}

export async function openLink(url) {
    try {
        const { colorPrimary } = get(colors);
        const available = await InAppBrowser.isAvailable();
        if (available) {
            const result = await InAppBrowser.open(url, {
                // iOS Properties
                dismissButtonStyle: 'close',
                preferredBarTintColor: colorPrimary,
                preferredControlTintColor: 'white',
                readerMode: false,
                animated: true,
                enableBarCollapsing: false,
                // Android Properties
                showTitle: true,
                toolbarColor: colorPrimary,
                secondaryToolbarColor: 'white',
                enableUrlBarHiding: true,
                enableDefaultShare: true,
                forceCloseOnRedirection: false
            });
            return result;
        } else {
            Utils.openUrl(url);
        }
    } catch (error) {
        alert({
            title: 'Error',
            message: error.message,
            okButtonText: 'Ok'
        });
    }
}

export interface ShowLoadingOptions {
    title?: string;
    text: string;
    progress?: number;
    onButtonTap?: () => void;
}

let loadingIndicator: AlertDialog & { instance?: LoadingIndicator__SvelteComponent_ };
let showLoadingStartTime: number = null;
function getLoadingIndicator() {
    if (!loadingIndicator) {
        const componentInstanceInfo = resolveComponentElement(LoadingIndicator, {});
        const view: View = componentInstanceInfo.element.nativeView;
        // const stack = new StackLayout()
        loadingIndicator = new AlertDialog({
            view,
            cancelable: false
        });
        loadingIndicator.instance = componentInstanceInfo.viewInstance as LoadingIndicator__SvelteComponent_;
    }
    return loadingIndicator;
}
export function updateLoadingProgress(msg: Partial<ShowLoadingOptions>) {
    if (showingLoading()) {
        const loadingIndicator = getLoadingIndicator();
        const props = Object.assign(
            {
                title: loadingIndicator.instance.title,
                progress: loadingIndicator.instance.progress,
                text: loadingIndicator.instance.text
            },
            msg
        );
        loadingIndicator.instance.$set(props);
    }
}
export async function showLoading(msg?: string | ShowLoadingOptions) {
    try {
        const text = (msg as any)?.text || (typeof msg === 'string' && msg) || lc('loading');
        const indicator = getLoadingIndicator();
        indicator.instance.onButtonTap = msg?.['onButtonTap'];
        const props = {
            showButton: !!msg?.['onButtonTap'],
            text,
            title: (msg as any)?.title,
            progress: null
        };
        if (msg && typeof msg !== 'string' && msg?.hasOwnProperty('progress')) {
            props.progress = msg.progress;
        } else {
            props.progress = null;
        }
        indicator.instance.$set(props);
        if (showLoadingStartTime === null) {
            showLoadingStartTime = Date.now();
            indicator.show();
        }
    } catch (error) {
        showError(error, { silent: true });
    }
}
export function showingLoading() {
    return showLoadingStartTime !== null;
}
export async function hideLoading() {
    if (!loadingIndicator) {
        return;
    }
    const delta = showLoadingStartTime ? Date.now() - showLoadingStartTime : -1;
    if (__IOS__ && delta >= 0 && delta < 1000) {
        await timeout(1000 - delta);
        // setTimeout(() => hideLoading(), 1000 - delta);
        // return;
    }
    showLoadingStartTime = null;
    if (loadingIndicator) {
        return loadingIndicator.hide();
    }
}
export async function tryCatch<T = any>(callback: (...args) => Promise<T>, onErrorCb?, finallyCb?) {
    try {
        const result = await callback();
        return result;
    } catch (error) {
        showError(error);
        onErrorCb?.();
    } finally {
        finallyCb?.();
    }
}
export function tryCatchFunction<T = any>(callback: (...args) => Promise<T>, onErrorCb?, finallyCb?) {
    return async (...args) => {
        try {
            const result = await callback(...args);
            return result;
        } catch (error) {
            showError(error);
            onErrorCb?.();
        } finally {
            finallyCb?.();
        }
    };
}
