/**
 * Transport modes for transaction execution
 *
 * Each transport mode offers different trade-offs between speed, reliability, and cost.
 *
 * @example
 * ```typescript
 * // Fastest: Multi-broadcast to all endpoints
 * transport: "NONCE"  // 40-100ms (recommended for production)
 *
 * // Fast: Single specialized endpoints
 * transport: "ZERO_SLOT"      // 40-150ms
 * transport: "NOZOMI"         // 100-300ms
 * transport: "HELIUS_SENDER"  // 150-400ms
 *
 * // MEV Protection
 * transport: "JITO"           // 200-500ms + MEV protection
 *
 * // Standard
 * transport: "VANILLA"        // 300-800ms
 *
 * // Testing only (no broadcast)
 * transport: "SIMULATE"       // Local simulation
 * ```
 */
export type TransportMode =
  | 'SIMULATE'
  | 'VANILLA'
  | 'NOZOMI'
  | 'ZERO_SLOT'
  | 'HELIUS_SENDER'
  | 'JITO'
  | 'NONCE';

/**
 * Transport mode descriptions for documentation
 */
export const TRANSPORT_DESCRIPTIONS: Record<TransportMode, string> = {
  SIMULATE: 'Test transactions without broadcasting (free, local simulation)',
  VANILLA: 'Standard RPC with SwQOS support (300-800ms)',
  NOZOMI: 'Temporal Nozomi low-latency endpoint (100-300ms)',
  ZERO_SLOT: '0Slot specialized endpoint (40-150ms, ultra-fast)',
  HELIUS_SENDER: 'Helius sender service (150-400ms, premium reliability)',
  JITO: 'Jito MEV-protected transactions (200-500ms, MEV protection)',
  NONCE:
    'Multi-broadcast strategy (40-100ms, fastest - broadcasts to all 5 endpoints in parallel)',
};

/**
 * Expected latency ranges for each transport mode (in milliseconds)
 */
export const TRANSPORT_LATENCY: Record<
  TransportMode,
  { min: number; max: number; description: string }
> = {
  SIMULATE: {
    min: 0,
    max: 0,
    description: 'Local simulation only (no broadcast)',
  },
  VANILLA: {
    min: 300,
    max: 800,
    description: 'Standard RPC',
  },
  NOZOMI: {
    min: 100,
    max: 300,
    description: 'Low-latency endpoint',
  },
  ZERO_SLOT: {
    min: 40,
    max: 150,
    description: 'Ultra-fast specialized endpoint',
  },
  HELIUS_SENDER: {
    min: 150,
    max: 400,
    description: 'Premium reliability',
  },
  JITO: {
    min: 200,
    max: 500,
    description: 'MEV-protected transactions',
  },
  NONCE: {
    min: 40,
    max: 100,
    description: 'Parallel multi-broadcast (fastest)',
  },
};
