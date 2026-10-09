<script lang="ts">
    // A layout rather than an mdbutton: inside a bottom sheet, the sheet's pan gesture swallows a native button's touches
    import { colors, fonts } from '~/variables';

    export let icon: string = null;
    export let iconFontFamily: string = null;
    export let label: string = null;
    export let selected = false;

    $: ({ colorOnSurface, colorOutlineVariant, colorPrimary } = $colors);
    $: contentColor = selected ? colorPrimary : colorOnSurface;
</script>

<gridlayout
    borderColor={selected ? colorPrimary : colorOutlineVariant}
    borderRadius={18}
    borderWidth={1}
    height={36}
    horizontalAlignment="left"
    margin={3}
    rippleColor={colorPrimary}
    {...$$restProps}
    on:tap
    on:longPress>
    <stacklayout horizontalAlignment="center" orientation="horizontal" padding="0 12" verticalAlignment="middle">
        {#if icon}
            <label color={contentColor} fontFamily={iconFontFamily || $fonts.mdi} fontSize={18} text={icon} verticalAlignment="middle" />
        {/if}
        {#if label}
            <label color={contentColor} fontSize={14} fontWeight={selected ? 'bold' : 'normal'} maxLines={1} paddingLeft={icon ? 6 : 0} text={label} verticalAlignment="middle" />
        {/if}
    </stacklayout>
</gridlayout>
