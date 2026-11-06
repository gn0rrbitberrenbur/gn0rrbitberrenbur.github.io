import {
    validateSettings,
    type EngineInfo,
    type GameSettings,
    type SearchMetrics,
    type UiToWorker,
    type WorkerToUi
} from './engine.messages';

interface WasmEngine {
    start_game(boardSize: number): void;
    send_command(command: string): void;
}

interface ModuleOptions {
    print: (text: string) => void;
    printErr: (text: string) => void;
}

let engine: WasmEngine | undefined;
let settings: GameSettings | undefined;
let stdoutLines: string[] = [];
let initialized = false;
let initializing = false;

const numericMetricFields = [
    'elapsed_ms',
    'nodes_total',
    'nps',
    'depth_current',
    'depth_completed',
    'workers_active',
    'root_candidates_count',
    'alpha_beta_cutoffs_total',
    'tt_capacity_entries',
    'tt_allocated_bytes',
    'tt_occupancy_permille',
    'tt_probes_total',
    'tt_hits_total'
] as const;

function post(message: WorkerToUi): void {
    self.postMessage(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isCoordinate(value: unknown): value is number {
    return (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= 0 &&
        settings !== undefined &&
        value < settings.boardSize
    );
}

function isSearchMetrics(value: unknown): value is SearchMetrics {
    if (!isRecord(value)) return false;

    if (
        value.event !== 'search_progress' &&
        value.event !== 'search_finished'
    ) {
        return false;
    }

    if (
        !numericMetricFields.every((field) => {
            const number = value[field];

            return (
                typeof number === 'number' &&
                Number.isFinite(number) &&
                number >= 0
            );
        })
    ) {
        return false;
    }

    if (
        value.score !== null &&
        (
            typeof value.score !== 'number' ||
            !Number.isFinite(value.score)
        )
    ) {
        return false;
    }

    return (
        value.best_move === null ||
        (
            isRecord(value.best_move) &&
            isCoordinate(value.best_move.x) &&
            isCoordinate(value.best_move.y)
        )
    );
}

function handleOutput(
    stream: 'stdout' | 'stderr',
    text: string
): void {
    const prefix = '[METRICS] ';

    if (stream !== 'stderr' || !text.startsWith(prefix)) {
        post({ type: 'log', stream, text });
        return;
    }

    try {
        const parsed: unknown = JSON.parse(text.slice(prefix.length));

        if (!isSearchMetrics(parsed)) {
            throw new Error('Metric format is invalid.');
        }

        post({ type: 'metrics', metrics: parsed });
    } catch (error) {
        post({
            type: 'metrics-error',
            message: error instanceof Error ? error.message : String(error)
        });
    }
}

function checkProtocolErrors(lines: string[]): void {
    const error = lines.find(
        (line) => /^(ERROR|UNKNOWN)\b/.test(line)
    );

    if (error) {
        throw new Error(error);
    }
}

function sendCommand(command: string): string[] {
    if (!engine) {
        throw new Error('Engine is not loaded.');
    }

    stdoutLines = [];
    engine.send_command(command);

    const lines = [...stdoutLines];
    checkProtocolErrors(lines);

    return lines;
}

function toggleDebug(): void {
    if (!settings) {
        throw new Error('Gamesettings are missing.');
    }

    const lines = sendCommand(
        `DEBUG_OUTPUT ${settings.debugIntervalMs}`
    );

    if (lines.includes('DEBUG_OUTPUT True')) {
        post({ type: 'debug-state', enabled: true });
    } else if (lines.includes('DEBUG_OUTPUT False')) {
        post({ type: 'debug-state', enabled: false });
    } else {
        throw new Error(
            `Unexpected answer to DEBUG_OUTPUT: ${lines.join(' ')}`
        );
    }
}

async function initialize(config: GameSettings): Promise<void> {
    if (initialized || initializing) {
        throw new Error('This worker was initialized already.');
    }

    const validationError = validateSettings(config);

    if (validationError) {
        throw new Error(validationError);
    }

    initializing = true;
    settings = { ...config };

    const moduleUrl = new URL(
        `${import.meta.env.BASE_URL}engine/extended_moku_wasm.js`,
        self.location.origin
    ).href;

    const imported = (
        await import(/* @vite-ignore */ moduleUrl)
    ) as {
        default: (options: ModuleOptions) => Promise<WasmEngine>;
    };

    engine = await imported.default({
        print: (text: string) => {
            stdoutLines.push(text);
            handleOutput('stdout', text);
        },
        printErr: (text: string) => {
            handleOutput('stderr', text);
        }
    });

    if (typeof engine.start_game !== 'function') {
        throw new Error(
            'The WASM module does not export start_game(). ' +
            'Please deploy a compatible engine build.'
        );
    }

    stdoutLines = [];
    engine.start_game(settings.boardSize);
    checkProtocolErrors(stdoutLines);

    if (!stdoutLines.includes('OK')) {
        throw new Error('Engine has not confirmed the game start.');
    }

    // Das Protokoll zieht 500 ms vom angegebenen Turn-Timeout ab.
    sendCommand(`INFO timeout_turn ${settings.searchTimeMs + 500}`);

    toggleDebug();

    const engineInfo = readEngineInfo();

    initialized = true;
    initializing = false;

    post({ type: 'ready', engineInfo });
}

function requestMove(command: string): void {
    const lines = sendCommand(command);

    const moves = lines
        .map((line) => /^(\d+),(\d+)$/.exec(line))
        .filter((match) => match !== null);

    if (moves.length !== 1) {
        throw new Error(
            `Exactly one engine move expected: ${lines.join(' ')}`
        );
    }

    const match = moves[0];

    if (!match) {
        throw new Error('Engine move is missing.');
    }

    const col = Number(match[1]);
    const row = Number(match[2]);

    if (!isCoordinate(col) || !isCoordinate(row)) {
        throw new Error('Engine move is out of board bounds.');
    }

    post({ type: 'move', row, col });
}

async function handleMessage(message: UiToWorker): Promise<void> {
    try {
        if (message.type === 'init') {
            await initialize(message.settings);
            return;
        }

        if (!initialized) {
            throw new Error('Engine is not ready yet.');
        }

        switch (message.type) {
            case 'begin':
                requestMove('BEGIN');
                break;

            case 'turn':
                if (
                    !isCoordinate(message.row) ||
                    !isCoordinate(message.col)
                ) {
                    throw new Error('Invalid move coordinates.');
                }

                requestMove(`TURN ${message.col},${message.row}`);
                break;

            case 'toggle-debug':
                toggleDebug();
                break;
        }
    } catch (error) {
        post({
            type: 'error',
            message: error instanceof Error ? error.message : String(error)
        });
    }
}

self.onmessage = (event: MessageEvent<UiToWorker>) => {
    void handleMessage(event.data);
};

function readEngineInfo(): EngineInfo {
    const lines = sendCommand('ABOUT');
    const response = lines.join('\n');

    const name = /\bname="([^"]+)"/.exec(response)?.[1];
    const version = /\bversion="([^"]+)"/.exec(response)?.[1];

    if (!name?.trim() || !version?.trim()) {
        throw new Error(
            `Invalid answer to ABOUT: ${response || '(empty)'}`
        );
    }

    return { name, version };
}