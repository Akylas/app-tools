/* eslint-disable @typescript-eslint/no-empty-object-type */
type Color = import('@nativescript/core').Color;
type EventData = import('@nativescript/core').EventData;
type LengthDipUnit = import('@nativescript/core/core-types').LengthDipUnit;
type LengthPxUnit = import('@nativescript/core/core-types').LengthPxUnit;
type LengthPercentUnit = import('@nativescript/core/core-types').LengthPercentUnit;
type VisibilityType = import('@nativescript/core/core-types').CoreTypes.VisibilityType;
type ShownModallyData = import('@nativescript/core').ShownModallyData;
type CanvasView = import('@nativescript-community/ui-canvas').CanvasView;
type Canvas = import('@nativescript-community/ui-canvas').Canvas;
type Paint = import('@nativescript-community/ui-canvas').Paint;
type PanGestureHandlerOptions = import('@nativescript-community/gesturehandler').PanGestureHandlerOptions;
type PinchGestureHandlerOptions = import('@nativescript-community/gesturehandler').PinchGestureHandlerOptions;
type RotationGestureHandlerOptions = import('@nativescript-community/gesturehandler').RotationGestureHandlerOptions;
type TapGestureHandlerOptions = import('@nativescript-community/gesturehandler').TapGestureHandlerOptions;
type HighlightEventData = import('@nativescript-community/ui-chart/charts/Chart').HighlightEventData;

declare module 'svelte/internal' {
    export function get_current_component();
}
type MultiPlatform<T> = T & {
    [K in keyof T as `ios:${K}`]: T[K];
} & {
    [K in keyof T as `android:${K}`]: T[K];
};

declare namespace svelteNative.JSX {
    type Override<What, With> = Omit<What, keyof With> & With;

    interface ViewAttributes {
        defaultVisualState?: string;
        'prop:bottomSheet'?;
        'prop:mainContent'?;
        'prop:leftDrawer'?;
        'prop:rightDrawer'?;
        'prop:bottomDrawer'?;
        'prop:topDrawer'?;
        disableCss?: boolean;
        rippleColor?: string | Color;
        sharedTransitionTag?: string;
        verticalAlignment?: string;
        dynamicElevationOffset?: string | number;
        elevation?: string | number;
        'on:closingModally'?: (args: ShownModallyData) => void;
        'on:closedBottomSheet'?: (args) => void;
        iosAccessibilityMaxFontScale?: number;
        iosAccessibilityMinFontScale?: number;
        // "on:shownModally"?: (args: ShownModallyData) => void;
    }

    interface ButtonAttributes {
        variant?: string;
        shape?: string;
    }

    interface ImageAttributes {
        noCache?: boolean;
        placeholderImageUri?: string;
        failureImageUri?: string;
        imageRotation?: number;
        colorMatrix?: number[];
        blurRadius?: number;
        fadeDuration?: number;
        contextOptions?: any;
        'on:rotateAnimated'?: (args) => void;
    }

    interface CanvasAttributes extends GridLayoutAttributes {
        hardwareAccelerated?: boolean;
        'on:draw'?: (args: { canvas: Canvas; object: CanvasView }) => void;
    }
    interface LineChartAttributes extends CanvasAttributes {
        'on:highlight'?: (args: HighlightEventData) => void;
        'on:zoom'?: (args) => void;
        'on:pan'?: (args) => void;
        dragDecelerationEnabled?: boolean;
        drawMarkersEnabled?: boolean;
        highlightsFilterByAxis?: boolean;
        disableScrollEnabled?: boolean;
        noDataText?: string;
        descPaint?: Paint;
        panGestureOptions?: PanGestureHandlerOptions & {
            gestureTag?: number;
        };
        tapGestureOptions?: TapGestureHandlerOptions & {
            gestureTag?: number;
        };
        doubleTapGestureOptions?: TapGestureHandlerOptions & {
            gestureTag?: number;
        };
        pinchGestureOptions?: PinchGestureHandlerOptions & {
            gestureTag?: number;
        };
        rotationGestureOptions?: RotationGestureHandlerOptions & {
            gestureTag?: number;
        };
    }
    interface SpanAttributes {
        fontWeight?: string | number;
    }

    interface LabelAttributes {
        linkColor?: string;
        autoFontSize?: boolean;
        autoFontSizeStep?: number;
        maxLines?: number;
        minFontSize?: number;
        maxFontSize?: number;
        lineBreak?: string;
        html?: string;
        selectable?: boolean;
        'ios:selectable'?: boolean;
        onlinkTap?;
        'on:linkTap'?;
    }
    interface WebViewAttributes {}
    interface AWebViewAttributes extends WebViewAttributes {
        builtInZoomControls?: boolean;
        debugMode?: boolean;
        displayZoomControls?: boolean;
        nestedScrollView?: boolean;
        normalizeUrls?: boolean;
        webConsoleEnabled?: boolean;
        webRTC?: boolean;
        mediaPlaybackRequiresUserAction?: boolean;
        domStorage?: boolean;
        userAgent?: string;
        createWebViewClient?: Function;
        'on:shouldOverrideUrlLoading'?: (args) => void;
        'on:loadFinished'?: (args) => void;
        [key: `on:${string}`]: (args: any) => void;
    }
    interface TextFieldAttributes {
        floating?: boolean | string;
        variant?: string;
        placeholder?: string;
        placeholderColor?: string | Color;
        'on:returnPress'?: (args) => void;
        'on:focus'?: (args) => void;
        'on:blur'?: (args) => void;
    }
    interface TextViewAttributes {
        floating?: boolean | string;
        variant?: string;
        placeholder?: string;
        placeholderColor?: string | Color;
        'on:returnPress'?: (args) => void;
        'on:focus'?: (args) => void;
        'on:blur'?: (args) => void;
    }
    interface TextBaseAttributes {
        iosAccessibilityAdjustsFontSize?: boolean;
        verticalTextAlignment?: string;
        fontWeight?: string | number;
        text?: string | number;
    }
    interface SpanAttributes {
        verticalAlignment?: string;
        verticalTextAlignment?: string;
    }
    interface ProgressAttributes {
        busy?: boolean;
        indeterminate?: boolean;
    }
    interface SliderAttributes {
        stepSize?: number;
        trackBackgroundColor?: string | Color;
        thumbColor?: string | Color;
    }
    interface ProgressAttributes {
        padding?: number | string;
    }
    interface PageAttributes {
        'on:sharedElementTo'?: (args) => void;
        'on:sharedElementFrom'?: (args) => void;
        navigationBarColor?: string | Color;
        statusBarColor?: string | Color;
        screenOrientation?: string;
        keepScreenAwake?: boolean;
        screenBrightness?: number;
    }
    interface CSpanAttributes extends TextBaseAttributes, SpanAttributes {}
    interface CanvasLabelAttributes extends CanvasAttributes, LabelAttributes {}

    type IntrinsicElementsAugmented = TIntrinsicElements & {
        gesturerootview: GridLayoutAttributes;
        mdbutton: ButtonAttributes;
        cspan: CSpanAttributes;
        canvaslabel: CanvasLabelAttributes;
        canvasview: CanvasAttributes;
        awebview: AWebViewAttributes;
        linechart: LineChartAttributes;
    };

    type IntrinsicElementsAugmentedLowercase = Override<
        IntrinsicElementsAugmented,
        {
            [K in keyof IntrinsicElementsAugmented]: MultiPlatform<IntrinsicElementsAugmented[K]>;
        }
    > & {
        [K in keyof IntrinsicElementsAugmented as Lowercase<K>]: MultiPlatform<IntrinsicElementsAugmented[K]>;
    };
    interface IntrinsicElements extends IntrinsicElementsAugmentedLowercase {}
}
