import { Screen } from '@nativescript/core';

export const SETTINGS_LANGUAGE = 'language';
export const SETTINGS_COLOR_THEME = 'color_theme';

// an app chooses its default with the `APP_DEFAULT_COLOR_THEME` define: without it, dynamic colors on Android
export const DEFAULT_COLOR_THEME = typeof APP_DEFAULT_COLOR_THEME !== 'undefined' ? APP_DEFAULT_COLOR_THEME : __ANDROID__ ? 'dynamic' : 'default';
export const DEFAULT_LOCALE = 'auto';
export const ALERT_OPTION_MAX_HEIGHT = Screen.mainScreen.heightDIPs * 0.47;
