<script lang="ts">
    import { flushSync, onDestroy } from "svelte";
    import { Gomoku } from "svelte-gomoku";

    import {
        validateSettings,
        type EngineInfo,
        type GameSettings,
        type Player,
        type SearchMetrics,
        type UiToWorker,
        type WorkerToUi,
    } from "./engine/engine.messages";

    let game = $state<ReturnType<typeof Gomoku>>();
    let engineWorker: Worker | undefined;

    let screen = $state<"menu" | "game">("menu");

    let draft = $state<GameSettings>({
        humanColor: "black",
        boardSize: 15,
        searchTimeMs: 2000,
        debugIntervalMs: 50,
    });

    let settings = $state<GameSettings>({
        humanColor: "black",
        boardSize: 15,
        searchTimeMs: 2000,
        debugIntervalMs: 50,
    });

    let engineInfo = $state<EngineInfo | null>(null);
    let menuError = $state("");
    let ready = $state(false);
    let locked = $state(true);
    let ended = $state(false);
    let failed = $state(false);
    let winner = $state<Player | null>(null);
    let current = $state<Player>("black");
    let debugEnabled = $state(false);
    let debugPending = $state(false);
    let status = $state("");

    let metrics = $state<SearchMetrics | null>(null);
    let metricsWarning = $state("");

    const numberFormatter = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
    });

    function colorName(color: Player): string {
        return color === "black" ? "Black" : "White";
    }

    function formatNumber(value: number | null | undefined): string {
        return value == null ? "—" : numberFormatter.format(value);
    }

    function formatDecimal(value: number | null | undefined): string {
        return value == null
            ? "—"
            : value.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
              });
    }

    let metricCards = $derived([
        {
            label: "Nodes",
            value: formatNumber(metrics?.nodes_total),
        },
        {
            label: "Nodes / Second",
            value: formatNumber(metrics?.nps),
        },
        {
            label: "Search Time",
            value: metrics ? `${formatNumber(metrics.elapsed_ms)} ms` : "—",
        },
        {
            label: "Current Depth",
            value: formatNumber(metrics?.depth_current),
        },
        {
            label: "Completed Depth",
            value: formatNumber(metrics?.depth_completed),
        },
        {
            label: "Active Workers",
            value: formatNumber(metrics?.workers_active),
        },
        {
            label: "Root Candidates",
            value: formatNumber(metrics?.root_candidates_count),
        },
        {
            label: "Alpha-Beta Cutoffs",
            value: formatNumber(metrics?.alpha_beta_cutoffs_total),
        },
        {
            label: "Rating · Black positive",
            value: formatDecimal(metrics?.score),
        },
        {
            label: "Best Move · Column / Row",
            value: metrics?.best_move
                ? `${metrics.best_move.x + 1} / ${metrics.best_move.y + 1}`
                : "—",
        },
        {
            label: "TT-Probes",
            value: formatNumber(metrics?.tt_probes_total),
        },
        {
            label: "TT-Hits",
            value: formatNumber(metrics?.tt_hits_total),
        },
        {
            label: "TT-Hit Rate",
            value:
                metrics && metrics.tt_probes_total > 0
                    ? `${formatDecimal(
                          (metrics.tt_hits_total / metrics.tt_probes_total) *
                              100,
                      )} %`
                    : "—",
        },
        {
            label: "TT-Occupancy",
            value: metrics
                ? `${formatDecimal(metrics.tt_occupancy_permille / 10)} %`
                : "—",
        },
        {
            label: "TT-Capacity",
            value: formatNumber(metrics?.tt_capacity_entries),
        },
        {
            label: "TT-Memory",
            value: metrics
                ? `${formatDecimal(metrics.tt_allocated_bytes / 1024 / 1024)} MiB`
                : "—",
        },
    ]);

    function stopWorker(): void {
        engineWorker?.terminate();
        engineWorker = undefined;
    }

    onDestroy(stopWorker);

    function fail(message: string): void {
        failed = true;
        locked = true;
        debugPending = false;
        status = message;
        console.error(message);
        stopWorker();
    }

    function send(message: UiToWorker): void {
        if (!engineWorker) {
            fail("The connection to the engine is missing.");
            return;
        }

        engineWorker.postMessage(message);
    }

    function handleWorkerMessage(message: WorkerToUi): void {
        switch (message.type) {
            case "log":
                console.debug(`[${message.stream}] ${message.text}`);
                break;

            case "ready":
                engineInfo = message.engineInfo;
                ready = true;

                if (settings.humanColor === "white") {
                    locked = true;
                    status = "Engine opens as black...";
                    send({ type: "begin" });
                } else {
                    locked = false;
                    status = "Your turn.";
                }
                break;

            case "debug-state":
                debugEnabled = message.enabled;
                debugPending = false;
                break;

            case "metrics":
                metrics = message.metrics;
                metricsWarning = "";
                break;

            case "metrics-error":
                metricsWarning = `Metrics could not be read: ${message.message}`;

                console.error(metricsWarning);
                break;

            case "move": {
                if (!game || current === settings.humanColor || ended) {
                    fail("Engine returned an unexpected move.");
                    return;
                }

                // move() also considers the locked prop.
                flushSync(() => {
                    locked = false;
                });

                if (!game.move(message.row, message.col)) {
                    fail("The engine move could not be made.");
                    return;
                }

                locked = ended;

                if (!ended) {
                    status = "Your turn.";
                }
                break;
            }

            case "error":
                fail(`Engine error: ${message.message}`);
                break;
        }
    }

    function startGame(event: SubmitEvent): void {
        event.preventDefault();

        const validationError = validateSettings(draft);

        if (validationError) {
            menuError = validationError;
            return;
        }

        stopWorker();

        settings = { ...draft };
        menuError = "";
        ready = false;
        locked = true;
        ended = false;
        failed = false;
        winner = null;
        current = "black";
        debugEnabled = false;
        debugPending = false;
        metrics = null;
        metricsWarning = "";
        status = "WASM Engine is loading...";
        engineInfo = null;
        screen = "game";

        try {
            const worker = new Worker(
                new URL("./engine/engine.worker.ts", import.meta.url),
                { type: "module" },
            );

            engineWorker = worker;

            worker.onmessage = (event: MessageEvent<WorkerToUi>) => {
                if (engineWorker !== worker || screen !== "game") return;
                handleWorkerMessage(event.data);
            };

            worker.onerror = (event) => {
                if (engineWorker !== worker) return;

                console.error("Worker error event:", event);

                fail(
                    `Worker error: ${
                        event.message || "Details are in the browser console."
                    }`,
                );
            };

            worker.onmessageerror = () => {
                if (engineWorker !== worker) return;
                fail("A worker message could not be read.");
            };

            send({
                type: "init",
                settings: { ...settings },
            });
        } catch (error) {
            fail(
                `Worker could not be started: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }
    }

    function returnToMenu(): void {
        stopWorker();

        screen = "menu";
        ready = false;
        locked = true;
        ended = false;
        failed = false;
        debugPending = false;
        metrics = null;
        metricsWarning = "";
        menuError = "";
    }

    function handleMove(move: {
        row: number;
        col: number;
        player: Player;
    }): void {
        if (move.player !== settings.humanColor) return;

        locked = true;
        metrics = null;
        metricsWarning = "";

        const worker = engineWorker;

        // Wins and draws are checked by the component after onMove.
        queueMicrotask(() => {
            if (
                !worker ||
                engineWorker !== worker ||
                screen !== "game" ||
                ended ||
                failed
            ) {
                return;
            }

            if (!ready) {
                fail("The engine is not ready yet.");
                return;
            }

            status = "Engine is thinking...";

            send({
                type: "turn",
                row: move.row,
                col: move.col,
            });
        });
    }

    function handleWin(player: Player): void {
        ended = true;
        locked = true;

        status = player === settings.humanColor ? "You win!" : "Engine wins!";
    }

    function handleDraw(): void {
        ended = true;
        locked = true;
        status = "Draw";
    }

    function toggleDebug(): void {
        if (!ready || locked || failed || debugPending || !engineWorker) {
            return;
        }

        debugPending = true;
        send({ type: "toggle-debug" });
    }
</script>

<svelte:head>
    <title>Moku Gomoku</title>
    <meta name="description" content="Play Gomoku against moku" />
</svelte:head>

<main class:menu-screen={screen === "menu"} class="game-shell">
    <header>
        <div>
            <h1>
                {#if screen === "menu"}
                    Gomoku
                {:else if engineInfo}
                    {engineInfo.name} {engineInfo.version}
                {:else}
                    Loading engine...
                {/if}
            </h1>

            <p class="subtitle">
                {#if screen === "menu"}
                    Configure your game.
                {:else}
                    You: {colorName(settings.humanColor)}
                    · Engine:
                    {colorName(
                        settings.humanColor === "black" ? "white" : "black",
                    )}
                {/if}
            </p>
        </div>

        {#if screen === "game"}
            <div class="controls">
                <button onclick={returnToMenu}>New Game</button>

                <button
                    onclick={toggleDebug}
                    disabled={!ready || locked || failed || debugPending}
                >
                    Debug {debugEnabled ? "off" : "on"}
                </button>
            </div>
        {/if}
    </header>

    {#if screen === "menu"}
        <section class="panel menu-panel" aria-labelledby="menu-title">
            <h2 id="menu-title">New Game</h2>

            <form onsubmit={startGame}>
                <label>
                    Your color
                    <select bind:value={draft.humanColor}>
                        <option value="black">Black · you start</option>
                        <option value="white">White · engine starts</option>
                    </select>
                </label>

                <label>
                    Board size
                    <input
                        type="number"
                        min="5"
                        max="19"
                        step="1"
                        required
                        bind:value={draft.boardSize}
                    />
                    <small>Quadratic board with 5 to 19 fields per side.</small>
                </label>

                <details class="dev-options">
                    <summary>devoptions</summary>

                    <div class="dev-options-content">
                        <label>
                            Engine search time per move (ms)
                            <input
                                type="number"
                                min="100"
                                max="60000"
                                step="1"
                                required
                                bind:value={draft.searchTimeMs}
                            />
                            <small>100 to 60000 ms</small>
                        </label>

                        <label>
                            Debug interval (ms)
                            <input
                                type="number"
                                min="1"
                                max="60000"
                                step="1"
                                required
                                bind:value={draft.debugIntervalMs}
                            />
                            <small>Progress updates at least after this interval.</small>
                        </label>
                    </div>
                </details>

                <p class="hint">
                    Black starts. At least five connected stones win.
                </p>

                {#if menuError}
                    <p class="warning" role="alert">{menuError}</p>
                {/if}

                <button class="primary" type="submit">Start Game</button>
            </form>
        </section>
    {:else}
        <section class="panel" aria-label="Gomoku game">
            <p class="status" role="status">{status}</p>

            <p class="game-summary">
                {settings.boardSize} × {settings.boardSize}
                · Search time: {formatNumber(settings.searchTimeMs)} ms · Debug interval:
                {formatNumber(settings.debugIntervalMs)} ms
            </p>

            <div class="board-frame" style={`--board-size: ${settings.boardSize}`}>
                <Gomoku
                    class="site-theme"
                    bind:this={game}
                    bind:locked
                    bind:winner
                    bind:current
                    size={settings.boardSize}
                    onMove={handleMove}
                    onWin={handleWin}
                    onDraw={handleDraw}
                />
            </div>
        </section>

        <details class="metrics-options">
            <summary>
                <div class="summary-content">
                    <span>Search Statistics</span>
                    <span class="debug-state" class:active={debugEnabled}>
                        {debugEnabled ? "Live metrics on" : "Live metrics off"}
                    </span>
                </div>
            </summary>

            <div class="metrics-options-content">
                {#if metricsWarning}
                    <p class="warning" role="alert">{metricsWarning}</p>
                {/if}

                <div class="debug-heading">
                    <p>
                        {#if !debugEnabled}
                            Live metrics disabled.
                        {:else if metrics?.event === "search_progress"}
                            Search running · Values are being updated.
                        {:else if metrics?.event === "search_finished"}
                            Search finished · last Snapshot.
                        {:else}
                            Waiting for search metrics
                        {/if}
                    </p>
                </div>

                <dl class="metrics-grid">
                    {#each metricCards as card (card.label)}
                        <div class="metric-card">
                            <dt>{card.label}</dt>
                            <dd>{card.value}</dd>
                        </div>
                    {/each}
                </dl>
            </div>
        </details>
    {/if}
</main>

<style>
    .game-shell {
        width: min(100%, 1100px);
        min-height: 100vh;
        margin: 0 auto;
        padding: 2rem 1rem;
        display: grid;
        align-content: center;
        justify-items: center;
        gap: 1.5rem;
        box-sizing: border-box;
    }

    header {
        width: 100%;
    }

    h1 {
        margin: 0;
        font-size: clamp(2.2rem, 5vw, 3.5rem);
        line-height: 1.05;
        letter-spacing: -0.05em;
        color: var(--text);
    }

    .subtitle {
        margin: 0.5rem 0 0;
        color: var(--muted);
        font-size: 0.98rem;
    }

    .controls {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        justify-content: flex-end;
    }

    .controls button,
    .primary,
    form button {
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--surface);
        color: var(--text);
        padding: 0.7rem 1.1rem;
        cursor: pointer;
        transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
    }

    .controls button:hover,
    .primary:hover,
    form button:hover {
        transform: translateY(-1px);
        border-color: var(--accent);
        background: rgba(254, 128, 25, 0.08);
    }

    .panel {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 1rem;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
        padding: 1.2rem 1.1rem;
    }

    .menu-panel {
        width: min(100%, 640px);
        justify-self: center;
        margin: 0 auto;
    }

    h2 {
        margin: 0 0 1rem;
        font-size: 1.4rem;
        color: var(--text);
    }

    form {
        display: grid;
        gap: 1rem;
    }

    label {
        display: grid;
        gap: 0.5rem;
        font-weight: 600;
        color: var(--text);
    }

    select,
    input {
        width: 100%;
        box-sizing: border-box;
        background: rgba(255, 255, 255, 0.18);
        border: 1px solid var(--border);
        border-radius: 0.7rem;
        color: var(--text);
        padding: 0.7rem 0.8rem;
    }

    small {
        color: var(--muted);
        font-size: 0.82rem;
        font-weight: 500;
    }

    .dev-options {
        border: 1px solid var(--border);
        border-radius: 0.8rem;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.02);
    }

    .dev-options summary {
        cursor: pointer;
        padding: 0.7rem 0.8rem;
        font-weight: 700;
        color: var(--text);
        list-style: none;
    }

    .dev-options-content {
        display: grid;
        gap: 1rem;
        padding: 0 0.8rem 0.9rem;
    }

    .hint,
    .warning,
    .status,
    .game-summary {
        margin: 0;
        color: var(--muted);
    }

    .warning {
        color: var(--accent);
        font-weight: 600;
    }

    .status {
        font-size: 1rem;
        font-weight: 700;
        color: var(--accent-strong);
    }

    .game-summary {
        margin-top: 0.35rem;
        margin-bottom: 1rem;
        font-size: 0.9rem;
    }

    .board-frame {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1rem 0;
    }

    :global(.site-theme) {
        --board-bg: var(--surface);
        --board-border: var(--border);
        --grid-line: var(--accent);
        display: inline-block;
        font-family: inherit;
    }

    :global(.site-theme .board) {
        background: var(--board-bg);
        border: 2px solid var(--board-border);
        border-radius: 0.65rem;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 14px 30px rgba(0, 0, 0, 0.12);
    }

    :global(.site-theme .tile) {
        border-color: var(--grid-line);
    }

    :global(.site-theme .stone.black) {
        background: radial-gradient(circle at 30% 30%, #4f4f4f, #111111 68%);
    }

    :global(.site-theme .stone.white) {
        background: radial-gradient(circle at 30% 30%, #ffffff, #dfe3ea);
        border: 1px solid var(--border);
    }

    :global(.site-theme .cell.preview:hover .stone.ghost) {
        opacity: 0.45;
    }

    .debug-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .debug-heading p {
        margin: 0;
        color: var(--muted);
    }

    .debug-state {
        display: inline-flex;
        align-items: center;
        padding: 0.35rem 0.8rem;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: rgba(0, 0, 0, 0.03);
        color: var(--muted);
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.09em;
    }

    .debug-state.active {
        color: var(--green);
        border-color: var(--green);
        background: rgba(104, 157, 106, 0.12);
    }

    .metrics-options {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 0.8rem;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.02);
    }

    .metrics-options summary {
        cursor: pointer;
        padding: 0.8rem 1rem;
        list-style: none;
        font-weight: 700;
        color: var(--text);
    }

    .summary-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
    }

    .metrics-options-content {
        display: grid;
        gap: 1rem;
        padding: 0 1rem 1rem;
    }

    .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 0.8rem;
        margin: 0;
    }

    .metric-card {
        display: grid;
        gap: 0.3rem;
        padding: 0.8rem 0.9rem;
        border-radius: 0.8rem;
        border: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.04);
    }

    .metric-card dt {
        color: var(--muted);
        font-size: 0.76rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }

    .metric-card dd {
        margin: 0;
        font-weight: 700;
        color: var(--text);
    }

    @media (max-width: 640px) {
        .game-shell {
            min-height: auto;
            padding: 1rem 0.75rem 2rem;
            align-content: start;
        }

        header {
            display: grid;
            gap: 0.75rem;
            align-items: start;
        }

        .controls {
            width: 100%;
            justify-content: stretch;
            flex-wrap: nowrap;
        }

        .controls button {
            flex: 1 1 0;
            width: 100%;
        }

        .panel {
            width: 100%;
            box-sizing: border-box;
        }

        .menu-panel {
            width: min(100%, 640px);
        }

        .board-frame {
            overflow-x: auto;
            padding: 0.5rem 0;
        }

        :global(.site-theme .board) {
            max-width: 100%;
            width: min(100vw - 2rem, 420px);
        }

        .debug-heading {
            display: grid;
            gap: 0.5rem;
            align-items: start;
        }

        .metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }
</style>
