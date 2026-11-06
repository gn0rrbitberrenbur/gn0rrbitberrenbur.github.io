<svelte:head>
    <title>Chris Page</title>
</svelte:head>

<div class="page">
    <main class="content">
    <h1>Welcome!</h1>
        <p>
            My name is Chris, and I'm a Computer enthusiast. My interests span computer
            science, natural sciences, and economics. Currently, I'm completing an
            apprenticeship in CS. In my free time, you can find me programming, hiking,
            running, reading, and cooking. This website was created as a way to teach
            myself some web development.
        </p>
    </main>
</div>

<style>
    :global(body) {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        line-height: 1.7;
    }

    .page {
        max-width: 760px;
        margin: 0 auto;
        padding: 2rem 1.25rem 4rem;
    }

    .content {
        font-size: 1.05rem;
    }
</style>