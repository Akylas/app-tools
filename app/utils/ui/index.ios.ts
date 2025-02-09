import { View } from '@nativescript/core';
import { showSnack } from '~/utils/ui';

export * from './index.common';

export function showToast(text: string) {
    showSnack({ message: text });
}

export function showToolTip(tooltip: string, view?: View) {
    showSnack({ message: tooltip });
}
export function onBackButton(view: View, callback) {
    // Android only for now
    callback();
}
