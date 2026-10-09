import type { Color } from '@nativescript/core';
import type { Canvas, CanvasView } from '@nativescript-community/ui-canvas';

export interface IListItem {
    showBottomLine?: boolean;
    iconFontSize?: number;
    subtitleFontSize?: number;
    rightValue?: string | (() => string);
    rightValueFontSize?: number;
    fontSize?: number;
    html?: any;
    name?: string;
    icon?: string;
    color?: string | Color | ((item: IListItem) => string | Color);
    rippleColor?: string | Color;
    title?: string;
    subtitle?: string;
    type?: string;
    onLinkTap?: (event) => void;
    onLongPress?: (event) => void;
    onDraw?: (item: IListItem, event: { canvas: Canvas; object: CanvasView }) => void;
    [k: string]: any;
}
