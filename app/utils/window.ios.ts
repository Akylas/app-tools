import { Application, ApplicationSettings } from '@nativescript/core';
import { WindowOptions, refreshRequestedEvent } from './window.common';

export * from './window.common';

// CGFLOAT_MAX
const NO_MAX_SIDE = 10000000;
const WINDOW_FRAME_KEY = 'window_frame';

let windowOptions: WindowOptions = {};

function getWindowScene(): UIWindowScene {
    const scenes = UIApplication.sharedApplication?.connectedScenes;
    const scene = scenes?.allObjects?.firstObject;
    return scene instanceof UIWindowScene ? scene : null;
}

function applyWindowSizeRestrictions() {
    const scene = getWindowScene();
    // sizeRestrictions is null everywhere but Mac Catalyst.
    const restrictions = scene?.sizeRestrictions;
    if (!restrictions) {
        return;
    }
    const { minHeight = 600, minWidth = 400, restoreWindowFrame = true, startHeight = 900, startWidth = 500 } = windowOptions;
    if (restoreWindowFrame) {
        observeWindowFrame(scene);
    }

    const savedFrame: number[] = restoreWindowFrame ? JSON.parse(ApplicationSettings.getString(WINDOW_FRAME_KEY, 'null')) : null;
    if (savedFrame) {
        restrictions.minimumSize = CGSizeMake(minWidth, minHeight);
        restrictions.maximumSize = CGSizeMake(NO_MAX_SIDE, NO_MAX_SIDE);
        const [x, y, width, height] = savedFrame;
        scene.requestGeometryUpdateWithPreferencesErrorHandler(UIWindowSceneGeometryPreferencesMac.alloc().initWithSystemFrame(CGRectMake(x, y, width, height)), null);
        return;
    }

    // No API sets initial window size, so pin then relax.
    restrictions.minimumSize = CGSizeMake(startWidth, startHeight);
    restrictions.maximumSize = CGSizeMake(startWidth, startHeight);
    setTimeout(() => {
        restrictions.minimumSize = CGSizeMake(minWidth, minHeight);
        restrictions.maximumSize = CGSizeMake(NO_MAX_SIDE, NO_MAX_SIDE);
    }, 300);
}

function saveWindowFrame() {
    // systemFrame is Mac Catalyst only and missing from the runtime metadata, read it through KVC
    const value: NSValue = getWindowScene()?.effectiveGeometry?.valueForKey('systemFrame');
    const frame = value?.CGRectValue;
    if (frame) {
        ApplicationSettings.setString(WINDOW_FRAME_KEY, JSON.stringify([frame.origin.x, frame.origin.y, frame.size.width, frame.size.height]));
    }
}

let saveTimer: ReturnType<typeof setTimeout>;
@NativeClass
class WindowFrameObserver extends NSObject {
    observeValueForKeyPathOfObjectChangeContext(keyPath: string, object: NSObject, change: NSDictionary<string, any>, context: interop.Pointer) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveWindowFrame, 500);
    }
}
let windowFrameObserver: WindowFrameObserver;

// quitting does not reach the exit event, so save on every move/resize
function observeWindowFrame(scene: UIWindowScene) {
    if (!windowFrameObserver) {
        windowFrameObserver = WindowFrameObserver.new();
        scene.addObserverForKeyPathOptionsContext(windowFrameObserver, 'effectiveGeometry', NSKeyValueObservingOptions.New, null);
    }
}

export function startWindowHelper(options: WindowOptions = {}) {
    windowOptions = options;
    Application.on(Application.displayedEvent, applyWindowSizeRestrictions);
    if (options.refreshMenuTitle) {
        UIMenuSystem.mainSystem.setNeedsRebuild();
    }
}

@NativeClass
class CatalystAppDelegate extends UIResponder implements UIApplicationDelegate {
    public static ObjCProtocols = [UIApplicationDelegate];
    public static ObjCExposedMethods = {
        requestRefresh: { returns: interop.types.void, params: [interop.types.id] }
    };

    buildMenuWithBuilder(builder: UIMenuBuilder) {
        super.buildMenuWithBuilder(builder);
        if (builder.system !== UIMenuSystem.mainSystem || !windowOptions.refreshMenuTitle) {
            return;
        }
        const command = UIKeyCommand.commandWithTitleImageActionInputModifierFlagsPropertyList(windowOptions.refreshMenuTitle, null, 'requestRefresh', 'r', UIKeyModifierFlags.Command, null);
        builder.insertChildMenuAtStartOfMenuForIdentifier(UIMenu.menuWithTitleImageIdentifierOptionsChildren('', null, 'refresh', UIMenuOptions.DisplayInline, [command]), UIMenuView);
    }

    requestRefresh(sender) {
        Application.notify({ eventName: refreshRequestedEvent, object: Application });
    }
}

// Plugins (universal-links, systemui) only create a delegate when none is set and then extend it,
// so this module must be imported before them.
if (NSProcessInfo.processInfo.macCatalystApp && !Application.ios.delegate) {
    Application.ios.delegate = CatalystAppDelegate;
}
