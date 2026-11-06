export type Player = 'black' | 'white';

export interface GameSettings {
    humanColor: Player;
    boardSize: number;
    searchTimeMs: number;
    debugIntervalMs: number;
}

export function validateSettings(settings: GameSettings): string | null {
    if (
        settings.humanColor !== 'black' &&
        settings.humanColor !== 'white'
    ) {
        return 'Choose a player color.';
    }

    if (
        !Number.isInteger(settings.boardSize) ||
        settings.boardSize < 5 ||
        settings.boardSize > 19
    ) {
        return 'Board size must be between 5 and 19.';
    }

    if (
        !Number.isInteger(settings.searchTimeMs) ||
        settings.searchTimeMs < 100 ||
        settings.searchTimeMs > 60000
    ) {
        return 'Search time must be between 100 and 60000 ms.';
    }

    if (
        !Number.isInteger(settings.debugIntervalMs) ||
        settings.debugIntervalMs < 1 ||
        settings.debugIntervalMs > 60000
    ) {
        return 'Debug interval must be between 1 and 60000 ms.';
    }

    return null;
}

export interface SearchMetrics {
    event: 'search_progress' | 'search_finished';
    elapsed_ms: number;
    nodes_total: number;
    nps: number;
    depth_current: number;
    depth_completed: number;
    workers_active: number;
    root_candidates_count: number;
    alpha_beta_cutoffs_total: number;
    tt_capacity_entries: number;
    tt_allocated_bytes: number;
    tt_occupancy_permille: number;
    tt_probes_total: number;
    tt_hits_total: number;
    best_move: { x: number; y: number } | null;
    score: number | null;
}

export interface EngineInfo {
    name: string;
    version: string;
}

export type UiToWorker =
    | { type: 'init'; settings: GameSettings }
    | { type: 'begin' }
    | { type: 'turn'; row: number; col: number }
    | { type: 'toggle-debug' };

export type WorkerToUi =
    | { type: 'ready'; engineInfo: EngineInfo }
    | { type: 'move'; row: number; col: number }
    | { type: 'debug-state'; enabled: boolean }
    | { type: 'metrics'; metrics: SearchMetrics }
    | { type: 'metrics-error'; message: string }
    | { type: 'log'; stream: 'stdout' | 'stderr'; text: string }
    | { type: 'error'; message: string };