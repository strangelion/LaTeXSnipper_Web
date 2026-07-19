/* tslint:disable */
/* eslint-disable */

export function api_info_v2(): any;

export function api_info_v3(): any;

export function available_formats(): string;

export function begin_model_update_v2(): any;

export function cancel_recognition_v2(): any;

export function capabilities_v2(): any;

export function capabilities_v3(): any;

export function clear_models_v2(): any;

export function commit_model_update_v2(): any;

export function convert_document(doc_json: string, format: string): string;

export function convert_from_json(doc_json: string, format: string): string;

export function convert_v2(doc_json: string, format: string): any;

export function convert_v3(doc_json: string, format: string): any;

export function formula_to_document(latex: string, format: string): string;

export function formula_to_latex(formula_json: string): string;

export function health_check(): string;

export function init(): void;

export function is_model_loaded(name: string): boolean;

export function load_model(name: string, bytes: Uint8Array): void;

export function load_model_v2(name: string, bytes: Uint8Array, expected_sha256?: string | null): any;

export function loaded_models(): string;

export function loaded_models_v2(): any;

export function model_memory_v2(): any;

export function parse_latex(latex: string): any;

/**
 * Execute a verified production-derived document-orientation model in the
 * compiled WASM runtime. This is a compatibility and performance smoke test,
 * not an OCR accuracy benchmark.
 */
export function production_orientation_smoke_v2(model_bytes: Uint8Array, width: number, height: number, rgba_pixels: Uint8Array): any;

/**
 * Deprecated legacy synchronous recognition is intentionally disabled in browsers.
 * Use `recognize_v2`, which returns a Promise and does not create a nested runtime.
 */
export function recognize(_width: number, _height: number, _pixels: Uint8Array, _mode: string): string;

export function recognize_v2(width: number, height: number, pixels: Uint8Array, mode: string): Promise<any>;

export function recognize_v2_with_progress(width: number, height: number, pixels: Uint8Array, mode: string, progress: Function): Promise<any>;

export function render_latex(doc_json: string): string;

export function render_markdown(doc_json: string): string;

export function render_typst(doc_json: string): string;

export function rollback_model_update_v2(): any;

export function set_model_memory_limits_v2(per_artifact_bytes: bigint, total_model_bytes: bigint, max_image_pixels: bigint): any;

export function set_model_memory_profile_v2(profile: string): any;

export function unload_model_v2(name: string): any;

export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly api_info_v2: () => any;
    readonly api_info_v3: () => any;
    readonly available_formats: () => [number, number];
    readonly convert_document: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly convert_v2: (a: number, b: number, c: number, d: number) => any;
    readonly convert_v3: (a: number, b: number, c: number, d: number) => any;
    readonly formula_to_document: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly formula_to_latex: (a: number, b: number) => [number, number, number, number];
    readonly health_check: () => [number, number];
    readonly is_model_loaded: (a: number, b: number) => number;
    readonly load_model: (a: number, b: number, c: number, d: number) => [number, number];
    readonly load_model_v2: (a: number, b: number, c: number, d: number, e: number, f: number) => any;
    readonly loaded_models: () => [number, number];
    readonly parse_latex: (a: number, b: number) => [number, number, number];
    readonly production_orientation_smoke_v2: (a: number, b: number, c: number, d: number, e: number, f: number) => any;
    readonly recognize: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly recognize_v2: (a: number, b: number, c: number, d: number, e: number, f: number) => any;
    readonly recognize_v2_with_progress: (a: number, b: number, c: number, d: number, e: number, f: number, g: any) => any;
    readonly render_latex: (a: number, b: number) => [number, number, number, number];
    readonly render_markdown: (a: number, b: number) => [number, number, number, number];
    readonly render_typst: (a: number, b: number) => [number, number, number, number];
    readonly set_model_memory_limits_v2: (a: bigint, b: bigint, c: bigint) => any;
    readonly set_model_memory_profile_v2: (a: number, b: number) => any;
    readonly unload_model_v2: (a: number, b: number) => any;
    readonly version: () => [number, number];
    readonly rollback_model_update_v2: () => any;
    readonly cancel_recognition_v2: () => any;
    readonly clear_models_v2: () => any;
    readonly init: () => void;
    readonly convert_from_json: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly begin_model_update_v2: () => any;
    readonly capabilities_v2: () => any;
    readonly capabilities_v3: () => any;
    readonly commit_model_update_v2: () => any;
    readonly loaded_models_v2: () => any;
    readonly model_memory_v2: () => any;
    readonly wasm_bindgen_c6b3917c4fb8628e___convert__closures_____invoke___wasm_bindgen_c6b3917c4fb8628e___JsValue__core_9b3796e30d99ddb7___result__Result_____wasm_bindgen_c6b3917c4fb8628e___JsError___true_: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen_c6b3917c4fb8628e___convert__closures_____invoke___js_sys_615eec643bd2fc52___Function_fn_wasm_bindgen_c6b3917c4fb8628e___JsValue_____wasm_bindgen_c6b3917c4fb8628e___sys__Undefined___js_sys_615eec643bd2fc52___Function_fn_wasm_bindgen_c6b3917c4fb8628e___JsValue_____wasm_bindgen_c6b3917c4fb8628e___sys__Undefined_______true_: (a: number, b: number, c: any, d: any) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
