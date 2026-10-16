<script context="module" lang="ts">
    import { colors } from '~/variables';

    // iOS: the native popover draws the background, radius and shadow, so none of them may be drawn again
    const NATIVE_CHROME_PROPS = ['backgroundColor', 'borderColor', 'borderRadius', 'borderWidth', 'elevation', 'margin'];
    function withoutNativeChrome(props: Record<string, any>) {
        return Object.fromEntries(Object.entries(props).filter(([key]) => !NATIVE_CHROME_PROPS.includes(key)));
    }
</script>

<script lang="ts">
    let colorSurfaceContainer = $colors.colorSurfaceContainer;
    // technique for only specific properties to get updated on store change
    $: ({ colorSurfaceContainer } = $colors);
    export let flat = false;
    export let backgroundColor = colorSurfaceContainer;
    $: containerProps = __IOS__ ? { padding: '0 10 0 10', ...withoutNativeChrome($$restProps) } : { backgroundColor, borderRadius: 10, elevation: 4, margin: 4, padding: '0 10 0 10', ...$$restProps };
</script>

<gesturerootview columns="auto" rows="auto">
    {#if flat}
        <slot props={containerProps} />
    {:else}
        <gridlayout {...containerProps}><slot /></gridlayout>
    {/if}
</gesturerootview>
