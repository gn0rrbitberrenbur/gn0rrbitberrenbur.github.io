<script lang="ts">
    import Navbar from '#lib/components/Navbar.svelte';
    import type { LayoutProps } from './$types';

    let { children }: LayoutProps = $props();
</script>

<svelte:head>
    <link rel="icon" href="/icon.ico" />
</svelte:head>

<Navbar />

<style>
    :root {
        --bg: #eff1f5;
        --text: #4c4f69;
        --muted: #333;
        --border: #111;
    }

    :global(body.dark) {
        --bg: #4c4f69;
        --text: #eff1f5;
        --muted: #d1d5db;
        --border: #f3f4f6;
    }

    :global(body) {
        background: var(--bg);
        color: var(--text);
        transition: background 0.2s ease, color 0.2s ease;
        font-family: Verdana, Geneva, Tahoma, sans-serif;
    }
</style>

{@render children()}
