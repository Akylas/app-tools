<script lang="ts">
    export let id: string = undefined;
</script>

<page {id} actionBarHidden={true}>
    <slot />
</page>
