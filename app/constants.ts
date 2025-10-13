import { Screen } from '@nativescript/core';

export const SETTINGS_LANGUAGE = 'language';
export const SETTINGS_COLOR_THEME = 'color_theme';

export const DEFAULT_COLOR_THEME = __ANDROID__ ? 'dynamic' : 'default';
export const DEFAULT_LOCALE = 'auto';
export const ALERT_OPTION_MAX_HEIGHT = Screen.mainScreen.heightDIPs * 0.47;
