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

<main class:menu-screen={screen === "menu"}>
    <header>
        <div>
            <p class="eyebrow">MOKU · WEBASSEMBLY</p>
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
                <button onclick={returnToMenu}> New Game </button>

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
                    <small>
                        Quadratic board with 5 to 19 fields per side.
                    </small>
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
                            <small>
                                Progress updates at least after this interval.
                            </small>
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

            <div
                class="board-frame"
                style={`--board-size: ${settings.boardSize}`}
            >
                <Gomoku
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

        <section class="panel" aria-label="Search Statistics">
            <div class="debug-heading">
                <div>
                    <h2>Search Statistics</h2>
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

                <span class="debug-state" class:active={debugEnabled}>
                    {debugEnabled ? "Live metrics on" : "Live metrics off"}
                </span>
            </div>

            {#if metricsWarning}
                <p class="warning" role="alert">{metricsWarning}</p>
            {/if}

            <dl class="metrics-grid">
                {#each metricCards as card (card.label)}
                    <div class="metric-card">
                        <dt>{card.label}</dt>
                        <dd>{card.value}</dd>
                    </div>
                {/each}
            </dl>
        </section>
    {/if}
</main>
