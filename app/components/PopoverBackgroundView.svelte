<script context="module" lang="ts">
    import { colors } from '~/variables';
</script>

<script lang="ts">
    let colorSurfaceContainer = $colors.colorSurfaceContainer;
    // technique for only specific properties to get updated on store change
    $: ({ colorSurfaceContainer } = $colors);
    export let backgroundColor = colorSurfaceContainer;
</script>

<gesturerootview columns="auto" rows="auto">
    <gridlayout {backgroundColor} borderRadius={10} elevation={__IOS__ ? 0 : 4} margin={4} padding="0 10 0 10" {...$$restProps}>
        <slot />
    </gridlayout>
</gesturerootview>
