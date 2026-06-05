<script context="module" lang="ts">
    import { l, lc } from '@nativescript-community/l';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { CheckBox } from '@nativescript-community/ui-checkbox';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { Label } from '@nativescript-community/ui-label';
    import { prompt } from '@nativescript-community/ui-material-dialogs';
    import { ApplicationSettings, ObservableArray, Page, Utils, View } from '@nativescript/core';
    import ActionBarSearch from '@shared/components/ActionBarSearch.svelte';
    import CActionBar from '@shared/components/CActionBar.svelte';
    import IconButton from '@shared/components/IconButton.svelte';
    import ListItemAutoSize from '@shared/components/ListItemAutoSize.svelte';
    import { ALERT_OPTION_MAX_HEIGHT } from '@shared/constants';
    import { showError } from '@shared/utils/showError';
    import { createView, showAlertOptionSelect, showSliderPopover } from '@shared/utils/ui';
    import { onLanguageChanged } from '~/helpers/locale';
    import { onThemeChanged } from '~/helpers/theme';
    import { showSettings } from '~/utils/ui';
    import { colors, fonts, onFontScaleChanged, windowInset } from '~/variables';
    const storeSettings = {};
</script>

<script lang="ts">
    let { colorOnBackground, colorOnSurfaceVariant } = $colors;
    $: ({ colorOnBackground, colorOnSurfaceVariant } = $colors);

    let page: NativeViewElementNode<Page>;
    let collectionView: NativeViewElementNode<CollectionView>;
    let search;
    let checkboxTapTimer;
    let searchFilter: string = null;
    let displayedItems = new ObservableArray<any>([]);

    export let id = 'settingsPage';
    export let title: string = null;
    export let showSearch = false;
    export let searchEnabled = false;

    // source of options (preferred: optionsProvider)
    export let options: any[] = null;
    export let optionsProvider: (() => any[]) | null = null;
    export let items: ObservableArray<any> = null; // backward compatibility
    export let getSubSettings: ((id: string) => any[]) | null = null;

    export let collectionViewProps: any = {};
    export let getTitle: (item: any) => string = (item) => {
        switch (item.id) {
            case 'token':
                return lc(item.token);
            default:
                return item.title;
        }
    };
    export let getDescription: (item: any) => string = (item) => (typeof item.description === 'function' ? item.description(item) : item.description);
    export let searchItemsProvider: (items: any[], filter: string) => any[] = null;
    export let itemTemplateSelector: (item: any, index?: number, items?: any) => string = (item) => {
        if (item.type) {
            if (item.type === 'prompt' || item.type === 'slider') {
                return 'default';
            }
            return item.type;
        }
        if (item.icon) {
            return 'leftIcon';
        }
        return 'default';
    };

    // return true when handled
    export let onItemTap: (item: any, event: any) => boolean | void | Promise<boolean | void>;
    export let onItemLongPress: (item: any, event: any) => boolean | void | Promise<boolean | void> = null;
    export let onRightIconTap: (item: any, event: any) => boolean | void | Promise<boolean | void> = null;
    export let onCheckBox: (item: any, event: any) => boolean | void | Promise<boolean | void> = null;

    function defaultItemplateSelector(item: any, index?: number, items?: any): string {
        if (item.type) {
            if (item.type === 'prompt' || item.type === 'slider') {
                return 'default';
            }
            return item.type;
        }
        if (item.icon) {
            return 'leftIcon';
        }
        return 'default';
    }
    function templateSelector(item: any, index?: number, items?: any): string {
        if (itemTemplateSelector) {
            return itemTemplateSelector(item, index, templateSelector);
        }
        return defaultItemplateSelector(item, index);
    }

    function normalizeSearchText(value) {
        return (value ?? '').toString().toLocaleLowerCase();
    }
    function resolveItemText(item, value) {
        if (typeof value === 'function') {
            try {
                return value(item);
            } catch {
                return '';
            }
        }
        return value;
    }
    function getSearchText(item, parent = null) {
        return [parent?.title, parent?.description, item.title, item.description, item.full_description, item.key, item.id]
            .map((value) => resolveItemText(item, value))
            .filter((value) => value !== undefined && value !== null)
            .join(' ');
    }
    function isSearchableItem(item) {
        return item && item.type !== 'header' && item.type !== 'sectionheader' && !!(item.title || item.description || item.full_description || item.key);
    }

    function getItemOptions(item) {
        if (item?.options) {
            return typeof item.options === 'function' ? item.options() : item.options;
        }
        if (item?.subSettingsId && getSubSettings) {
            return getSubSettings(item.subSettingsId);
        }
        return null;
    }

    function appendSearchSection(result, title, sectionKeys) {
        if (!title || sectionKeys.has(title)) return;
        sectionKeys.add(title);
        result.push({ type: 'sectionheader', title });
    }

    function defaultSearchItemsProvider(allItems: any[], filter: string) {
        const query = normalizeSearchText(filter);
        if (!query || query.length < 2) return allItems;

        const result = [];
        const sectionKeys = new Set<string>();
        let currentSection = null;

        allItems.forEach((item) => {
            if (item.type === 'header') return;
            if (item.type === 'sectionheader') {
                currentSection = item;
                return;
            }

            const matchesItem = isSearchableItem(item) && normalizeSearchText(getSearchText(item)).includes(query);
            const itemOptions = getItemOptions(item);
            const childMatches = itemOptions?.filter((child) => isSearchableItem(child) && normalizeSearchText(getSearchText(child, item)).includes(query)) || [];

            if (matchesItem) {
                appendSearchSection(result, currentSection?.title || title || 'Settings', sectionKeys);
                result.push(item);
            }
            if (childMatches.length) {
                appendSearchSection(result, item.title || currentSection?.title || title || 'Settings', sectionKeys);
                result.push(...childMatches);
            }
        });

        return result;
    }

    function resolveSourceItems(): any[] {
        if (items) {
            return (items as any).slice ? (items as any).slice() : Array.from(items as any);
        }
        if (optionsProvider) {
            return optionsProvider() || [];
        }
        return options || [];
    }

    function rebuildDisplayedItems() {
        const source = resolveSourceItems();
        const provider = searchItemsProvider || defaultSearchItemsProvider;
        const visibleItems = searchEnabled && searchFilter?.length > 1 ? provider(source, searchFilter) : source;
        displayedItems = new ObservableArray(visibleItems);
    }

    function clearCheckboxTimer() {
        if (checkboxTapTimer) {
            clearTimeout(checkboxTapTimer);
            checkboxTapTimer = null;
        }
    }

    export function refresh(force?: boolean, filter?: string) {
        if (arguments.length > 1) {
            searchFilter = filter;
        }
        rebuildDisplayedItems();
        collectionView?.nativeView?.refresh();
    }

    export function refreshVisibleItems() {
        collectionView?.nativeView?.refreshVisibleItems();
    }

    export function updateItem(item, key = 'key') {
        const itemKey = item?.[key] !== undefined ? item[key] : (item?.key ?? item?.id);
        const index = displayedItems?.findIndex((it) => it === item || (itemKey !== undefined && (it[key] === itemKey || it.key === itemKey || it.id === itemKey)));
        if (index !== -1) {
            displayedItems.setItem(index, item);
        }
    }

    export function showSearchBar() {
        search?.showSearch();
    }
    export function hideSearchBar() {
        search?.hideSearch();
    }

    export function getStoreSetting(k: string, defaultValue) {
        if (!storeSettings[k]) {
            storeSettings[k] = JSON.parse(ApplicationSettings.getString(k, defaultValue));
        }
        return storeSettings[k];
    }

    async function handleDefaultItemTap(item, event): Promise<boolean> {
        switch (item?.id) {
            case 'sub_settings':
                const subOptions = getItemOptions(item);
                if (subOptions) {
                    showSettings({
                        title: item.title,
                        id: `settings[${item.id}]`,
                        options: subOptions,
                        actionBarButtons: item.actionBarButtons?.() || []
                    });
                }
                return true;
            case 'store_setting':
            case 'setting': {
                if (item.type === 'prompt') {
                    const defaultValue = typeof item.rightValue === 'function' ? item.rightValue() : typeof item.default === 'function' ? item.default() : item.default;
                    const result = await prompt({
                        title: getTitle(item),
                        messageView: createView(Label, {
                            padding: '0 20 0 20',
                            autoFontSize: true,
                            textWrap: true,
                            lineBreak: 'end',
                            maxLines: 3,
                            color: colorOnSurfaceVariant as any,
                            text: item.useHTML ? item.description : item.full_description || item.description
                        }),
                        okButtonText: l('save'),
                        cancelButtonText: l('cancel'),
                        autoFocus: true,
                        textFieldProperties: item.textFieldProperties,
                        defaultText: (defaultValue ?? '') + '',
                        view: item.useHTML
                            ? createView(
                                  Label,
                                  {
                                      padding: '10 20 0 20',
                                      textWrap: true,
                                      color: colorOnSurfaceVariant as any,
                                      html: item.full_description || item.description
                                  },
                                  item.onLinkTap
                                      ? {
                                            linkTap: item.onLinkTap
                                        }
                                      : undefined
                              )
                            : undefined
                    });
                    Utils.dismissSoftInput();
                    DEV_LOG && console.log('result', result);
                    if (result && !!result.result) {
                        if (item.id === 'store_setting') {
                            const store = getStoreSetting(item.storeKey, item.storeDefault);
                            if (result.text.length > 0) {
                                if (item.valueType === 'string') {
                                    store[item.key] = result.text;
                                } else {
                                    store[item.key] = parseInt(result.text, 10);
                                }
                            } else {
                                delete store[item.key];
                            }
                            DEV_LOG && console.log('store_setting', store);
                            ApplicationSettings.setString(item.storeKey, JSON.stringify(store));
                        } else {
                            if (result.text.length > 0) {
                                if (item.valueType === 'string') {
                                    ApplicationSettings.setString(item.key, result.text);
                                } else {
                                    ApplicationSettings.setNumber(item.key, parseInt(result.text, 10));
                                }
                            } else {
                                ApplicationSettings.remove(item.key);
                            }
                        }
                        updateItem(item);
                    }
                } else if (item.type === 'slider') {
                    await showSliderPopover({
                        anchor: event.object,
                        value: (item.currentValue || item.rightValue)?.(),
                        ...item,
                        onChange(value) {
                            if (item.transformValue) {
                                value = item.transformValue(value, item);
                            } else {
                                value = Math.round(value / item.step) * item.step;
                            }
                            if (item.id === 'store_setting') {
                                const store = getStoreSetting(item.storeKey, item.storeDefault);
                                if (item.valueType === 'string') {
                                    store[item.key] = value + '';
                                } else {
                                    store[item.key] = value;
                                }
                                ApplicationSettings.setString(item.storeKey, JSON.stringify(store));
                            } else {
                                if (item.valueType === 'string') {
                                    ApplicationSettings.setString(item.key, value + '');
                                } else {
                                    ApplicationSettings.setNumber(item.key, value);
                                }
                            }
                            updateItem(item);
                        }
                    });
                } else {
                    let selectedIndex = -1;
                    const currentValue = (item.currentValue || item.rightValue)?.() ?? item.currentValue;
                    const options = item.values.map((k, index) => {
                        const selected = currentValue === k.value;
                        if (selected) {
                            selectedIndex = index;
                        }
                        return {
                            name: k.title || k.name,
                            data: k.value,
                            boxType: 'circle',
                            type: 'checkbox',
                            value: selected
                        };
                    });
                    const { full_description, title, ...others } = item;
                    const result = await showAlertOptionSelect(
                        {
                            height: Math.min(item.values.length * 56, ALERT_OPTION_MAX_HEIGHT),
                            rowHeight: item.autoSizeListItem ? undefined : 56,
                            ...others,
                            selectedIndex,
                            options
                        },
                        {
                            title,
                            message: full_description
                        }
                    );
                    if (result?.data !== undefined) {
                        if (item.onResult) {
                            item.onResult(result.data);
                        } else {
                            if (item.id === 'store_setting') {
                                const store = getStoreSetting(item.storeKey, item.storeDefault);
                                if (item.valueType === 'string') {
                                    store[item.key] = result.data;
                                } else {
                                    store[item.key] = parseInt(result.data, 10);
                                }
                                ApplicationSettings.setString(item.storeKey, JSON.stringify(store));
                            } else {
                                if (item.valueType === 'string') {
                                    ApplicationSettings.setString(item.key, result.data);
                                } else {
                                    ApplicationSettings.setNumber(item.key, parseInt(result.data, 10));
                                }
                            }
                            updateItem(item);
                        }
                    }
                }

                break;
            }
            default:
                break;
        }
        if (item?.id === 'sub_settings') {
            const subOptions = getItemOptions(item);
            if (subOptions) {
                showSettings({
                    title: item.title,
                    id: `settings[${item.id}]`,
                    options: subOptions,
                    actionBarButtons: item.actionBarButtons?.() || []
                });
                return true;
            }
        }
        return false;
    }

    async function handleItemTap(item, event) {
        if (item.type === 'checkbox' || item.type === 'switch') {
            const checkboxView = (event.object as View)?.parent?.getViewById<CheckBox>?.('checkbox');
            if (checkboxView?.isEnabled) {
                clearCheckboxTimer();
                checkboxTapTimer = setTimeout(() => {
                    checkboxView.checked = !checkboxView.checked;
                }, 10);
            }
            return;
        }

        if (await handleDefaultItemTap(item, event)) return;
        await onItemTap?.(item, event);
    }

    async function handleItemLongPress(item, event) {
        await onItemLongPress?.(item, event);
    }

    let ignoreNextOnCheckBoxChange = false;
    async function handleOnCheckBox(item, event) {
        if (ignoreNextOnCheckBoxChange || item.value === event.value) return;

        const value = event.value;
        item.value = value;
        clearCheckboxTimer();

        try {
            ignoreNextOnCheckBoxChange = true;
            const handled = (await onCheckBox?.(item, event)) === true;
            if (!handled && (item.key || item.id)) {
                ApplicationSettings.setBoolean(item.key || item.id, value);
            }
        } catch (error) {
            showError(error);
        } finally {
            ignoreNextOnCheckBoxChange = false;
        }
    }

    async function handleRightIconTap(item, event) {
        const needsUpdate = await (onRightIconTap ? onRightIconTap(item, event) : item.onRightIconTap?.(item, event));
        if (needsUpdate) {
            updateItem(item);
        }
    }

    // $: {
    //     // reactive rebuild when sources/config change
    //     options;
    //     optionsProvider;
    //     items;
    //     searchEnabled;
    //     searchItemsProvider;
    //     rebuildDisplayedItems();
    // }

    // function refresh(force?: boolean, filter?: string) {
    //     if (arguments.length > 1) {
    //         searchFilter = filter;
    //     }

    //     const sourceItems = resolveSourceItems();
    //     const provider = searchItemsProvider || defaultSearchItemsProvider;
    //     const visibleItems = searchEnabled && searchFilter?.length > 1 ? provider(sourceItems, searchFilter) : sourceItems;
    //     items = new ObservableArray(visibleItems);
    // }

    onFontScaleChanged(refreshVisibleItems);
    onThemeChanged(() => refresh());
    onLanguageChanged(() => refresh());
</script>

<page bind:this={page} {id} actionBarHidden={true}>
    <gridlayout class="pageContent" rows="auto,*">
        <collectionview
            bind:this={collectionView}
            accessibilityValue="settingsCV"
            itemTemplateSelector={templateSelector}
            items={displayedItems}
            row={1}
            android:paddingBottom={$windowInset.bottom}
            {...collectionViewProps}
            {...$$restProps}>
            <Template key="sectionheader" let:item>
                <label class="sectionHeader" {...item.additionalProps || {}} text={item.title} />
            </Template>

            <Template key="switch" let:item>
                <ListItemAutoSize
                    item={{ ...item, title: getTitle(item), subtitle: getDescription(item) }}
                    on:longPress={(event) => onItemLongPress?.(item, event)}
                    on:tap={(event) => handleItemTap(item, event)}>
                    <switch id="checkbox" checked={item.value} col={1} marginLeft={10} verticalAlignment="center" on:checkedChange={(e) => handleOnCheckBox(item, e)} />
                </ListItemAutoSize>
            </Template>

            <Template key="checkbox" let:item>
                <ListItemAutoSize
                    item={{ ...item, title: getTitle(item), subtitle: getDescription(item) }}
                    on:longPress={(event) => onItemLongPress?.(item, event)}
                    on:tap={(event) => handleItemTap(item, event)}>
                    <checkbox id="checkbox" checked={item.value} col={1} on:checkedChange={(e) => handleOnCheckBox(item, e)} />
                </ListItemAutoSize>
            </Template>

            <Template key="rightIcon" let:item>
                <ListItemAutoSize
                    item={{ ...item, title: getTitle(item), subtitle: getDescription(item) }}
                    showBottomLine={false}
                    on:longPress={(event) => onItemLongPress?.(item, event)}
                    on:tap={(event) => handleItemTap(item, event)}>
                    <IconButton col={1} text={item.rightBtnIcon} on:tap={(event) => handleRightIconTap(item, event)} />
                </ListItemAutoSize>
            </Template>

            <Template key="leftIcon" let:item>
                <ListItemAutoSize
                    columns="auto,*,auto"
                    item={{ ...item, title: getTitle(item), subtitle: getDescription(item) }}
                    mainCol={1}
                    showBottomLine={false}
                    on:longPress={(event) => onItemLongPress?.(item, event)}
                    on:tap={(event) => handleItemTap(item, event)}>
                    <label col={0} color={colorOnBackground} fontFamily={$fonts.mdi} fontSize={24} padding="0 10 0 0" text={item.icon} verticalAlignment="center" />
                </ListItemAutoSize>
            </Template>

            <Template let:item>
                <ListItemAutoSize
                    item={{ ...item, title: getTitle(item), subtitle: getDescription(item) }}
                    showBottomLine={false}
                    on:longPress={(event) => onItemLongPress?.(item, event)}
                    on:tap={(event) => handleItemTap(item, event)} />
            </Template>

            <slot />
        </collectionview>

        <CActionBar canGoBack modalWindow={showSearch} onGoBack={showSearch ? () => hideSearchBar() : null} {title}>
            <slot name="actionBarButtons" />
            {#if searchEnabled}
                <mdbutton class="actionBarButton" text="mdi-magnify" variant="text" on:tap={() => showSearchBar()} />
            {/if}
            <ActionBarSearch bind:this={search} slot="center" {refresh} bind:visible={showSearch} />
        </CActionBar>
    </gridlayout>
</page>
