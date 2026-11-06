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
        --bg: #fbf1c7;
        --bg-soft: #ebdbb2;
        --surface: #f2e5bc;
        --text: #3c3836;
        --muted: #504945;
        --border: #7c6f64;
        --accent: #d65d0e;
        --accent-strong: #fe8019;
        --green: #689d6a;
        --yellow: #d79921;
    }

    :global(body.dark) {
        --bg: #1d2021;
        --bg-soft: #282828;
        --surface: #3c3836;
        --text: #ebdbb2;
        --muted: #d5c4a1;
        --border: #a89984;
        --accent: #fe8019;
        --accent-strong: #fabd2f;
        --green: #98971a;
        --yellow: #d79921;
    }

    :global(body) {
        background: var(--bg);
        color: var(--text);
        transition: background 0.2s ease, color 0.2s ease;
        font-family: "Segoe UI", Tahoma, sans-serif;
    }
</style>

{@render children()}
