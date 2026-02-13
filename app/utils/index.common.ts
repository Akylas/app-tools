import { Application, CSSUtils } from '@nativescript/core';

export function groupBy<T>(items: readonly T[], keyGetter: (item: T) => string) {
    const result = {};
    items.forEach((item) => {
        const key = keyGetter(item);
        result[key] = item;
    });
    return result;
}
export function groupByArray<T>(items: T[], keyGetter: (item: T) => string[]) {
    const result = {};
    items.forEach((item) => {
        const keys = keyGetter(item) || ['none'];
        keys.forEach((key) => {
            const collection = result[key];
            if (!collection) {
                result[key] = [item];
            } else {
                collection.push(item);
            }
        });
    });
    return result;
}

export function setCustomCssRootClass(className, oldClassName?) {
    const rootView = Application.getRootView();
    const rootModalViews = rootView._getRootModalViews();

    function addCssClass(rootView, cssClass) {
        cssClass = `${CSSUtils.CLASS_PREFIX}${cssClass}`;
        CSSUtils.pushToSystemCssClasses(cssClass);
        rootView.cssClasses.add(cssClass);
        rootModalViews?.forEach((rootModalView) => {
            rootModalView.cssClasses.add(cssClass);
        });
    }
    function removeCssClass(rootView, cssClass) {
        cssClass = `${CSSUtils.CLASS_PREFIX}${cssClass}`;
        CSSUtils.removeSystemCssClass(cssClass);
        rootView.cssClasses.delete(cssClass);
        rootModalViews?.forEach((rootModalView) => {
            rootModalView.cssClasses.delete(cssClass);
        });
    }
    addCssClass(rootView, className);
    if (oldClassName) {
        removeCssClass(rootView, oldClassName);
    }
}

export function updateRootCss() {
    let rootView = Application.getRootView();
    if (rootView?.parent) {
        rootView = rootView.parent as any;
    }
    if (rootView) {
        rootView._onCssStateChange();
        const rootModalViews = rootView._getRootModalViews();
        if (rootModalViews) {
            rootModalViews.forEach((rootModalView) => rootModalView._onCssStateChange());
        }
    }
}
