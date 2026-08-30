/**
 * mapshaper ships no type declarations. Only the one entry point
 * scripts/build-map-regions.ts uses is declared here, rather than widening the
 * whole module to `any`.
 */
declare module "mapshaper" {
  /**
   * Runs a mapshaper command string against in-memory files. Input and output
   * are keyed by the file names used in the command.
   */
  export function applyCommands(
    commands: string,
    input: Record<string, Buffer | string>,
  ): Promise<Record<string, Uint8Array>>;
}
