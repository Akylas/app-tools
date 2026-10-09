<script lang="ts">
    import { CoreTypes, Frame } from '@nativescript/core';
    import { showError } from '@shared/utils/showError';
    import { closeModal, conditionalEvent, fade, goBack } from '@shared/utils/svelte/ui';
    import { onMount } from 'svelte';
    import { windowInset } from '~/variables';

    export let title: string = null;
    export let showMenuIcon: boolean = false;
    export let canGoBack: boolean = false;
    export let forceCanGoBack: boolean = false;
    export let modalWindow: boolean = false;
    export let disableBackButton: boolean = false;
    export let labelsDefaultVisualState = null;
    export let buttonsDefaultVisualState = null;
    export let clazz: string = '';
    export let onGoBack: Function = null;
    /** Called by the close button of a `modalWindow` instead of closing the modal. */
    export let onClose: Function = null;
    export let onTitleTap: Function = null;
    /** Adds the top window inset as a margin on Android; turn off to handle the inset with a `paddingTop`. */
    export let useInsetMargin = true;
    /** The `lineBreak` of the title; `null` leaves it alone. */
    export let titleLineBreak: string = 'end';
    /** Listens to taps, so they do not reach the views under the bar. */
    export let blockTouches = false;
    let menuIcon: string;
    let menuIconVisible: boolean = false;
    let menuIconVisibility: CoreTypes.VisibilityType;
    let paddingLeft = 16;

    onMount(() => {
        const frame = Frame.topmost();
        canGoBack = frame?.canGoBack() || !!frame?.currentEntry;
    });
    function onMenuIcon() {
        try {
            if (onGoBack) {
                onGoBack();
            } else if (modalWindow) {
                if (onClose) {
                    onClose();
                } else {
                    closeModal(undefined);
                }
            } else {
                goBack();
            }
        } catch (error) {
            showError(error);
        }
    }
    $: {
        if (modalWindow) {
            menuIcon = 'mdi-close';
        } else {
            menuIcon = forceCanGoBack || canGoBack ? (__IOS__ ? 'mdi-chevron-left' : 'mdi-arrow-left') : 'mdi-menu';
        }
    }
    $: menuIconVisible = ((forceCanGoBack || canGoBack || modalWindow) && !disableBackButton) || showMenuIcon;
    $: menuIconVisibility = menuIconVisible ? 'visible' : 'collapse';
    $: paddingLeft = menuIconVisible ? 0 : 16;
</script>

<gridlayout
    class={'actionBar ' + clazz}
    columns="auto,*, auto"
    paddingLeft={4}
    paddingRight={4}
    rows="*"
    {...$$restProps}
    use:conditionalEvent={{ condition: blockTouches, event: 'tap', callback: () => {} }}
    transition:fade={{ duration: 300 }}
    android:marginTop={useInsetMargin ? $windowInset.top : 0}>
    <label
        class={'actionBarTitle ' + clazz}
        autoFontSize={true}
        col={1}
        {...titleLineBreak ? { lineBreak: titleLineBreak } : {}}
        maxLines={2}
        paddingLeft={menuIconVisible ? 0 : 16}
        text={title || ''}
        textAlignment="left"
        verticalTextAlignment="center"
        visibility={!!title ? 'visible' : 'hidden'}
        {...$$restProps?.titleProps}
        defaultVisualState={labelsDefaultVisualState}
        use:conditionalEvent={{ condition: !!onTitleTap, event: 'tap', callback: onTitleTap }} />
    <stacklayout col={0} orientation="horizontal">
        <slot name="left" />
        <mdbutton class={'actionBarButton ' + clazz} defaultVisualState={buttonsDefaultVisualState} text={menuIcon} variant="text" visibility={menuIconVisibility} on:tap={onMenuIcon} />
    </stacklayout>
    <stacklayout col={2} orientation="horizontal">
        <slot />
    </stacklayout>
    <slot name="center" col={1} />
    <slot name="bottom" />
</gridlayout>
