<script lang="ts">
    let lightMode = true;

    function toggleTheme() {
        lightMode = !lightMode;

        document.body.classList.toggle('dark', !lightMode);
        document.body.classList.toggle('light', lightMode);
    }

    let label = $derived(lightMode ? 'lights off' : 'lights on');
</script>

<nav class="navbar">
    <div class="nav-actions">
        <a href="/">home</a>
        <a href="/blog">blog</a>
        <a href="/tools">tools</a>
        <button class="theme-toggle" onclick={toggleTheme}>
            {label}
        </button>
    </div>
</nav>

<style>
    .navbar {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 1rem 1.5rem;
        background: var(--bg-soft);
        border-bottom: 1px solid var(--border);
    }

    .nav-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .navbar a,
    .theme-toggle {
        color: var(--text);
        text-decoration: none;
        font-weight: 600;
        background: transparent;
        border: none;
        cursor: pointer;
        font: inherit;

        padding: 0.35rem 0.6rem;
        border: 1px solid transparent;
        border-radius: 6px;
        transition: all 0.2s ease;
    }

    .navbar a:hover,
    .theme-toggle:hover {
       border-color: var(--accent);
       background: rgba(254, 128, 25, 0.12);
       text-decoration: none;
    }
</style>