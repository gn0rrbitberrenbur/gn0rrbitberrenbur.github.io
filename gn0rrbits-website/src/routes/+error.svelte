<script lang="ts">
    import { page } from '$app/state';
</script>

<svelte:head>
    <title>404 - Page not found</title>
</svelte:head>

<div class="error-page">
    <div class="card">
        <p class="eyebrow">Error {page.status}</p>
        <h1>404</h1>
        <h2>Page not found</h2>
        <p>
            The page you are looking for does not exist or has been moved.
        </p>
        <a href="/">Go to Homepage</a>
    </div>
</div>

<style>
    .error-page {
        display: grid;
        place-items: center;
        min-height: 70vh;
        padding: 2rem;
    }

    .card {
        max-width: 540px;
        padding: 3rem 2.5rem;
        border-radius: 18px;
        background: var(--bg-soft);
        border: 1px solid var(--border);
        text-align: center;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
    }

    .eyebrow {
        margin: 0 0 0.5rem;
        font-size: 0.8rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--accent);
        font-weight: 700;
    }

    h1 {
        margin: 0;
        font-size: clamp(4rem, 16vw, 8rem);
        line-height: 1;
        color: var(--accent);
    }

    h2 {
        margin: 0.5rem 0 1rem;
        font-size: clamp(1.5rem, 4vw, 2.5rem);
    }

    p {
        margin: 0 0 1.5rem;
        line-height: 1.6;
    }

    a {
        display: inline-block;
        padding: 0.8rem 1.2rem;
        border-radius: 999px;
        background: var(--accent);
        color: white;
        text-decoration: none;
        font-weight: 600;
    }

    a:hover {
        filter: brightness(1.08);
    }
</style>