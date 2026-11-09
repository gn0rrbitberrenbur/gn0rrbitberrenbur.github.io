<svelte:head>
    <title>Chris Page</title>
</svelte:head>

<div class="page">
    <main class="content">
    <h1>
        <span class="welcome">Welcome!</span>
        <span class="asciiEmote">⊹╰(⌣ʟ⌣)╯⊹</span>
    </h1>
        <p>
            My name is <span class="name">Chris</span>, and I'm a Computer enthusiast. My interests span <span class="interests">computer
            science, natural sciences, and economics</span>. Currently, I'm completing an
            apprenticeship in CS. In my free time, you can find me <span class="hobbies">programming, hiking,
            running, reading, and cooking</span>. This website was created as a way to teach
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

    .welcome {
        color: var(--yellow);
        font-weight: 700;
    }

    .asciiEmote {
        color: var(--green);
        font-weight: 600;
    }

    .name {
        color: var(--accent);
        font-weight: 700;
    }

    .interests {
        color: var(--accent-strong);
        font-weight: 700;
    }

    .hobbies {
        color: var(--green);
        font-weight: 700;
    }
</style>