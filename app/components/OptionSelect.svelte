<svelte:options accessors />

<script context="module" lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { Canvas, CanvasView } from '@nativescript-community/ui-canvas';
    import { CheckBox } from '@nativescript-community/ui-checkbox';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { openFilePicker } from '@nativescript-community/ui-document-picker';
    import { closeBottomSheet } from '@nativescript-community/ui-material-bottomsheet/svelte';
    import { TextField } from '@nativescript-community/ui-material-textfield';
    import { EventData, File, ObservableArray, Utils, View } from '@nativescript/core';
    import { debounce } from '@nativescript/core/utils';
    import IconButton from '@shared/components/IconButton.svelte';
    import ListItem from '@shared/components/ListItem.svelte';
    import ListItemAutoSize from '@shared/components/ListItemAutoSize.svelte';
    import TogglePill from '@shared/components/TogglePill.svelte';
    import type { IListItem } from '@shared/components/ListItem';
    import { type ComponentType, onDestroy } from 'svelte';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { lc } from '~/helpers/locale';
    import { colors, fontScale, fonts } from '~/variables';

    export type { IListItem };
    export interface OptionToggle {
        id: string;
        icon?: string;
        label: string;
        selected: boolean;
    }
    export interface OptionType extends IListItem {
        group?: string;
        isPick?: boolean;
        boxType?: string;
        type?: string;
        [k: string]: any;
    }
</script>

<script lang="ts">
    export let title: string = null;
    /** Toggle pills above the list; a tap flips `selected` then calls `onToggle`. Wraps to 2 columns past 2 toggles. */
    export let toggles: OptionToggle[] = null;
    export let onToggle: (toggle: OptionToggle) => void = null;
    /** The component drawing a toggle: receives `icon`, `label`, `selected`, grid placement, and fires `tap`. */
    export let togglePill: ComponentType = TogglePill;
    export let showFilter = false;
    export let showBorders = false;
    export let backgroundColor = null;
    export let borderRadius = 8;
    export let rowHeight = null;
    /** Heights of the `separator` item (a hairline between two groups), of the `tiles` item (a wrapping grid) and of the `footer` item (one row of small buttons). */
    export let separatorHeight = 12;
    export let tilesHeight = 128;
    export let footerHeight = 44;
    /** A `tiles` icon on a rounded square of this colour (and size, radius); none keeps the bare icon. */
    export let tileIconBackground: string = null;
    export let tileIconColor: string = null;
    export let tileIconSize = 40;
    export let tileIconRadius = 12;
    /** Colour of the hairlines of the `separator`, `footer` and toggles; defaults to `colorOutlineVariant`. */
    export let hairlineColor: string = null;
    export let autofocus = false;
    export let estimatedItemSize = true;
    export let autoSize = false;
    export let isScrollEnabled = true;
    export let width: string | number = '*';
    export let containerColumns: string = '*';
    export let autoSizeListItem: boolean = false;
    export let fontWeight = 'bold';
    export let options: OptionType[] | ObservableArray<OptionType>;
    export let onClose = null;
    export let selectedIndex = -1;
    export let height: number | string = null;
    export let fontSize = 16;
    export let iconFontSize = 24;
    export let onlyOneSelected = false;
    export let currentlyCheckedItem = null;
    export let onCheckBox: (item, value, e) => void = null;
    export let onChange: (item, value, e) => void = null;
    export let onRightIconTap: (item, e) => void = null;
    export let onLongPress: (item, e) => void = null;
    /** For a row `component` that already calls `onLongPress(item, event)` itself: hands `onLongPress` through untouched. */
    export let rowLongPressWithItem = false;
    export let autoReloadItemOnLayout = false;
    /** Extra attributes of the `checkbox` / `switch` views, applied last. */
    export let checkboxProps: Partial<svelteNative.JSX.ViewAttributes> & { [k: string]: any } = {};
    export let switchProps: Partial<svelteNative.JSX.ViewAttributes> & { [k: string]: any } = {};
    /** Extra attributes for the row `component` of one item, by template type (`checkbox`, `switch`, ...). */
    export let getRowProps: (item: OptionType, templateType: string) => Record<string, any> = null;

    export let titleProps: Partial<svelteNative.JSX.LabelAttributes> = {};
    export let titleHolderProps: Partial<svelteNative.JSX.StackLayoutAttributes> = {};
    export let subtitleProps: Partial<svelteNative.JSX.LabelAttributes> = {};
    export let templateProps: Partial<svelteNative.JSX.GridLayoutAttributes> & {
        [k: string]: Partial<svelteNative.JSX.ViewAttributes>;
    } = {};

    export let component: ComponentType = autoSizeListItem ? ListItemAutoSize : ListItem;
    let filteredOptions: OptionType[] | ObservableArray<OptionType> = null;
    let collectionView: NativeViewElementNode<CollectionView>;
    let filter: string = null;

    // technique for only specific properties to get updated on store change
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOutline, colorOutlineVariant, colorPrimary } = $colors);
    $: hairline = hairlineColor || colorOutlineVariant;

    function getRowLongPress(item: OptionType): (...args) => void {
        if (!onLongPress) {
            return null;
        }
        return rowLongPressWithItem ? onLongPress : (event) => onLongPress(item, event);
    }

    function updateFiltered(filter) {
        if (filter) {
            const lowerFilter = filter.toLowerCase();
            filteredOptions = options.filter((d) => (d.name || d.title || '').toLowerCase().includes(lowerFilter));
        } else {
            filteredOptions = options;
        }
    }
    const updateFilteredDebounce = debounce(updateFiltered, 500);
    updateFiltered(filter);
    $: updateFilteredDebounce(filter);

    function close(value?: OptionType) {
        (onClose || closeBottomSheet)(value);
    }

    let checkboxTapTimer;
    function clearCheckboxTimer() {
        if (checkboxTapTimer) {
            clearTimeout(checkboxTapTimer);
            checkboxTapTimer = null;
        }
    }
    async function onRightTap(item: OptionType, event) {
        onRightIconTap?.(item, event);
    }
    async function onTap(item: OptionType, event) {
        if (item.isPick) {
            try {
                const result = await openFilePicker({
                    extensions: ['file/*'],
                    multipleSelection: false,
                    pickerMode: 0,
                    forceSAF: true
                });
                if (File.exists(result.files[0])) {
                    const file = File.fromPath(result.files[0]);
                    close({ name: file.name, data: { url: file.path }, isPick: true });
                } else {
                    close(null);
                }
            } catch (err) {
                close(null);
            }
        } else if (item.type === 'checkbox' || item.type === 'switch') {
            // we dont want duplicate events so let s timeout and see if we clicking diretly on the checkbox
            const checkboxView: CheckBox = ((event.object as View).parent as View).getViewById('checkbox');
            clearCheckboxTimer();
            checkboxTapTimer = setTimeout(() => {
                checkboxView.checked = !checkboxView.checked;
            }, 10);
        } else {
            close(item);
        }
    }
    function getCheckbox(index: number) {
        const view = collectionView?.nativeView?.getViewForItemAtIndex(index);
        return view?.getViewById<CheckBox>('checkbox');
    }
    let ignoreNextOnCheckBoxChange = false;
    function onCheckedChanged(item, event) {
        // DEV_LOG && console.log('onCheckedChanged', event.value, ignoreNextOnCheckBoxChange);
        clearCheckboxTimer();
        if (ignoreNextOnCheckBoxChange) {
            ignoreNextOnCheckBoxChange = false;
            return;
        }
        ignoreNextOnCheckBoxChange = true;
        if (item.group && options instanceof ObservableArray) {
            if (event.value) {
                item.value = true;
                options.setItem(options.indexOf(item), item);
                options.forEach((opt, index) => {
                    if (item !== opt && opt.group === item.group && opt.value === true) {
                        opt.value = false;
                        options.setItem(index, opt);

                        if (__IOS__) {
                            // dirty hack for now
                            getCheckbox(index).checked = false;
                        }
                    }
                });
            } else {
                // we dont allow to have none selected
                ignoreNextOnCheckBoxChange = false;
                const checkboxView: CheckBox = ((event.object as View).parent as View).getViewById('checkbox');
                checkboxView.checked = true;
                return;
            }
        } else if (onlyOneSelected && options instanceof ObservableArray) {
            if (event.value) {
                const oldSelected = currentlyCheckedItem;
                if (oldSelected === item) {
                    ignoreNextOnCheckBoxChange = false;
                    return;
                }
                DEV_LOG && console.log('onlyOneSelected', oldSelected);
                item.value = true;
                currentlyCheckedItem = item;
                if (oldSelected) {
                    const index = options.indexOf(oldSelected);
                    DEV_LOG && console.log('onlyOneSelected1', index);
                    if (index >= 0) {
                        oldSelected.value = false;
                        options.setItem(index, oldSelected);
                    }
                }
                options.setItem(options.indexOf(currentlyCheckedItem), currentlyCheckedItem);
            } else {
                // we dont allow to have none selected
                ignoreNextOnCheckBoxChange = false;
                const checkboxView: CheckBox = ((event.object as View).parent as View).getViewById('checkbox');
                checkboxView.checked = true;
                return;
            }
        }
        onCheckBox?.(item, event.value, event);
        ignoreNextOnCheckBoxChange = false;
    }
    onDestroy(() => {
        blurTextField();
    });
    function onTextFieldLoaded(event: EventData) {
        setTimeout(() => {
            DEV_LOG && console.log('onTextFieldLoaded', autofocus);
            if (autofocus) {
                (event.object as TextField).requestFocus();
            } else {
                (event.object as TextField).clearFocus();
            }
        }, 0);
    }
    function blurTextField() {
        Utils.dismissSoftInput();
    }
    function setFilter(value: string) {
        filter = value;
    }
    function clearFilter() {
        blurTextField();
        filter = null;
    }
    function onCollectionLoaded(event: EventData) {
        if (event.object instanceof CollectionView) {
            event.object.setTemplateRowHeight('separator', separatorHeight);
            event.object.setTemplateRowHeight('tiles', tilesHeight);
            event.object.setTemplateRowHeight('footer', footerHeight);
        }
    }

    function itemTemplateSelector(item) {
        if (item.type) {
            return item.type;
        }
        if (autoSizeListItem && item.icon) {
            return 'lefticon';
        }
        if (item.rightIcon) {
            return 'righticon';
        }
        return 'default';
    }
    function onDataPopulated(event) {
        if (selectedIndex !== undefined) {
            if (onlyOneSelected) {
                currentlyCheckedItem = options instanceof ObservableArray ? options.getItem(selectedIndex) : options[selectedIndex];
            }
            if (selectedIndex > 0) {
                event.object.scrollToIndex(selectedIndex, false);
            }
        }
    }
</script>

<gesturerootview columns={containerColumns} rows="auto">
    <gridlayout {backgroundColor} {borderRadius} columns={`${width}`} {height} rows="auto,auto,*" {...$$restProps}>
        {#if title}
            <slot name="header" {title}>
                <label class="actionBarTitle" fontWeight="bold" margin="10 10 0 10" text={title} />
            </slot>
        {/if}
        {#if showFilter}
            <slot name="filter" {autofocus} {clearFilter} {filter} onLoaded={onTextFieldLoaded} onReturnPress={blurTextField} {setFilter}>
                <gridlayout borderColor={colorOutline} margin="10 10 0 10" row={1}>
                    <textfield
                        autocapitalizationType="none"
                        backgroundColor="transparent"
                        hint={lc('search')}
                        placeholder={lc('search')}
                        returnKeyType="search"
                        text={filter}
                        variant="outline"
                        verticalTextAlignment="center"
                        on:loaded={onTextFieldLoaded}
                        on:returnPress={blurTextField}
                        on:textChange={(e) => setFilter(e['value'])} />

                    <IconButton col={1} gray={true} horizontalAlignment="right" isHidden={!filter || filter.length === 0} size={40} text="mdi-close" verticalAlignment="middle" on:tap={clearFilter} />
                </gridlayout>
            </slot>
        {/if}
        {#if toggles?.length}
            {@const toggleColumns = Math.min(toggles.length, 2)}
            <gridlayout
                borderBottomColor={hairline}
                borderBottomWidth={1}
                columns={Array(toggleColumns).fill('*').join(',')}
                padding="6 4 8 4"
                row={1}
                rows={Array(Math.ceil(toggles.length / toggleColumns))
                    .fill('auto')
                    .join(',')}>
                {#each toggles as toggle, index}
                    <svelte:component
                        this={togglePill}
                        col={index % toggleColumns}
                        horizontalAlignment="stretch"
                        icon={toggle.icon}
                        label={toggle.label}
                        row={Math.floor(index / toggleColumns)}
                        selected={toggle.selected}
                        on:tap={() => {
                            toggle.selected = !toggle.selected;
                            toggles = toggles;
                            onToggle?.(toggle);
                        }} />
                {/each}
            </gridlayout>
        {/if}
        <collectionView
            bind:this={collectionView}
            {autoSize}
            {estimatedItemSize}
            {isScrollEnabled}
            {itemTemplateSelector}
            items={filteredOptions}
            row={2}
            {rowHeight}
            on:dataPopulated={onDataPopulated}
            on:loaded={onCollectionLoaded}
            ios:autoReloadItemOnLayout={autoReloadItemOnLayout}
            ios:contentInsetAdjustmentBehavior={2}>
            <Template key="checkbox" let:item>
                <svelte:component
                    this={component}
                    {borderRadius}
                    columns="auto,*,auto"
                    {fontSize}
                    {fontWeight}
                    iconFontSize={item.iconFontSize || iconFontSize}
                    {item}
                    mainCol={1}
                    showBottomLine={showBorders}
                    {subtitleProps}
                    {titleHolderProps}
                    {titleProps}
                    {...getRowProps?.(item, 'checkbox')}
                    {...templateProps}
                    onLongPress={getRowLongPress(item)}
                    on:tap={(event) => onTap(item, event)}>
                    <checkbox
                        id="checkbox"
                        boxType={item.boxType}
                        checked={item.value}
                        col={item.boxType === 'circle' ? 0 : 2}
                        ios:marginRight={10}
                        verticalAlignment="center"
                        {...checkboxProps}
                        on:checkedChange={(e) => onCheckedChanged(item, e)} />
                </svelte:component>
            </Template>
            <Template key="switch" let:item>
                <svelte:component
                    this={component}
                    {borderRadius}
                    columns="auto,*,auto"
                    {fontSize}
                    {fontWeight}
                    iconFontSize={item.iconFontSize || iconFontSize}
                    {item}
                    mainCol={1}
                    showBottomLine={showBorders}
                    {subtitleProps}
                    {titleHolderProps}
                    {titleProps}
                    {...getRowProps?.(item, 'switch')}
                    {...templateProps}
                    onLongPress={getRowLongPress(item)}
                    on:tap={(event) => onTap(item, event)}>
                    <switch id="checkbox" checked={item.value} col={1} marginLeft={10} {...switchProps} on:checkedChange={(e) => onCheckedChanged(item, e)} />
                </svelte:component>
            </Template>
            <Template key="righticon" let:item>
                <svelte:component
                    this={component}
                    {borderRadius}
                    columns="*,auto"
                    {fontSize}
                    {fontWeight}
                    iconFontSize={item.iconFontSize || iconFontSize}
                    {item}
                    showBottomLine={showBorders}
                    {subtitleProps}
                    {titleHolderProps}
                    {titleProps}
                    {...getRowProps?.(item, 'righticon')}
                    {...templateProps}
                    onLongPress={getRowLongPress(item)}
                    on:tap={(event) => onTap(item, event)}>
                    <mdbutton class="icon-btn" col={1} text={item.rightIcon} variant="text" on:tap={(event) => onRightTap(item, event)} />
                </svelte:component>
            </Template>
            <Template key="lefticon" let:item>
                <svelte:component
                    this={component}
                    {borderRadius}
                    columns="auto,*"
                    {fontSize}
                    {fontWeight}
                    {item}
                    mainCol={1}
                    showBottomLine={showBorders}
                    {subtitleProps}
                    {titleHolderProps}
                    {titleProps}
                    {...getRowProps?.(item, 'lefticon')}
                    {...templateProps}
                    onLongPress={getRowLongPress(item)}
                    on:tap={(event) => onTap(item, event)}>
                    <slot name="lefticon" {item}>
                        <label
                            col={0}
                            color={item.iconColor || colorOnSurface}
                            fontFamily={item.iconFontFamily || $fonts.mdi}
                            fontSize={(item.iconFontSize || iconFontSize) * $fontScale}
                            paddingLeft="8"
                            text={item.icon}
                            verticalAlignment="center"
                            width={iconFontSize * 2} />
                    </slot>
                </svelte:component>
            </Template>
            <Template key="image" let:item>
                <svelte:component
                    this={component}
                    {borderRadius}
                    columns="auto,*"
                    {fontSize}
                    {fontWeight}
                    iconFontSize={item.iconFontSize || iconFontSize}
                    {item}
                    mainCol={1}
                    showBottomLine={showBorders}
                    {subtitleProps}
                    title={item.name}
                    {titleHolderProps}
                    {titleProps}
                    {...getRowProps?.(item, 'image')}
                    {...templateProps}
                    onLongPress={getRowLongPress(item)}
                    on:tap={(event) => onTap(item, event)}>
                    <slot name="image" {item}>
                        <image borderRadius={4} col={0} colorMatrix={item.imageMatrix} marginBottom={5} marginRight={10} marginTop={5} src={item.image} />
                    </slot>
                </svelte:component>
            </Template>
            <Template key="checkbox_image" let:item>
                <svelte:component
                    this={component}
                    {borderRadius}
                    columns="auto,*,auto"
                    {fontSize}
                    {fontWeight}
                    iconFontSize={item.iconFontSize || iconFontSize}
                    {item}
                    mainCol={1}
                    showBottomLine={showBorders}
                    {subtitleProps}
                    title={item.name}
                    {titleHolderProps}
                    {titleProps}
                    {...getRowProps?.(item, 'checkbox_image')}
                    {...templateProps}
                    onLongPress={getRowLongPress(item)}
                    on:tap={(event) => onTap(item, event)}>
                    <checkbox
                        id="checkbox"
                        boxType={item.boxType}
                        checked={item.value}
                        col={item.boxType === 'circle' ? 0 : 2}
                        verticalAlignment="center"
                        on:checkedChange={(e) => onCheckedChanged(item, e)} />
                    <image borderRadius={4} col={2} marginBottom={5} marginRight={10 + (item.imageMargin ?? 0)} marginTop={5} src={item.image} stretch="aspectFit" width={item.imageWidth ?? 50} />
                </svelte:component>
            </Template>
            <Template let:item>
                <svelte:component
                    this={component}
                    {borderRadius}
                    {fontSize}
                    {fontWeight}
                    iconFontSize={item.iconFontSize || iconFontSize}
                    {item}
                    showBottomLine={showBorders}
                    {subtitleProps}
                    {titleHolderProps}
                    {titleProps}
                    {...getRowProps?.(item, 'default')}
                    {...templateProps}
                    onLongPress={getRowLongPress(item)}
                    on:rightTap={(event) => onRightTap(item, event)}
                    on:tap={(event) => onTap(item, event)}></svelte:component>
            </Template>
            <Template key="tiles" let:item>
                {@const tileColumns = item.columns ?? 3}
                <gridlayout
                    columns={Array(tileColumns).fill('*').join(',')}
                    padding="2 8"
                    rows={Array(Math.ceil(item.tiles.length / tileColumns))
                        .fill('*')
                        .join(',')}>
                    {#each item.tiles as tile, index}
                        <gridlayout
                            col={index % tileColumns}
                            horizontalAlignment="stretch"
                            rippleColor={colorPrimary}
                            row={Math.floor(index / tileColumns)}
                            rows="*,auto"
                            on:tap={() => close(tile)}
                            on:longPress={(event) => onLongPress?.(tile, event)}>
                            <label
                                backgroundColor={tileIconBackground}
                                borderRadius={tileIconRadius}
                                color={tileIconColor || colorOnSurfaceVariant}
                                fontFamily={$fonts.mdi}
                                fontSize={24}
                                height={tileIconBackground ? tileIconSize : null}
                                horizontalAlignment="center"
                                text={tile.icon}
                                textAlignment="center"
                                verticalAlignment="bottom"
                                verticalTextAlignment="center"
                                width={tileIconBackground ? tileIconSize : null} />
                            <label color={colorOnSurface} fontSize={12} lineBreak="end" maxLines={2} paddingTop={4} row={1} text={tile.title} textAlignment="center" verticalAlignment="top" />
                        </gridlayout>
                    {/each}
                </gridlayout>
            </Template>
            <Template key="footer" let:item>
                <gridlayout borderTopColor={hairline} borderTopWidth={1} columns={item.tiles.map(() => '*').join(',')} margin="0 8">
                    {#each item.tiles as tile, index}
                        <stacklayout
                            col={index}
                            horizontalAlignment="center"
                            orientation="horizontal"
                            rippleColor={colorPrimary}
                            verticalAlignment="middle"
                            on:tap={() => close(tile)}
                            on:longPress={(event) => onLongPress?.(tile, event)}>
                            <label color={colorOnSurfaceVariant} fontFamily={$fonts.mdi} fontSize={18} text={tile.icon} verticalAlignment="middle" />
                            <label color={colorOnSurfaceVariant} fontSize={13} paddingLeft={6} text={tile.title} verticalAlignment="middle" />
                        </stacklayout>
                    {/each}
                </gridlayout>
            </Template>
            <Template key="separator">
                <gridlayout>
                    <absolutelayout backgroundColor={hairline} height={1} margin="0 12" verticalAlignment="middle" />
                </gridlayout>
            </Template>
            <slot name="templates" />
        </collectionView>
    </gridlayout>
</gesturerootview>
