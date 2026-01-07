/**
 * Meteora Integration Module
 *
 * Provides integration with Meteora protocols:
 * - DBC (Dynamic Bonding Curve)
 * - Future: DAMM v1, DAMM v2, DLMM
 *
 * @module meteora
 */

// Parent namespace
export { MeteoraNamespace } from './namespace';

// DBC sub-module (re-export everything)
export {
  // Namespace class
  DBCNamespace,
  // Static utilities
  DBCUtils,
} from './dbc';

// DBC types (re-export)
export type {
  // Direction and mode types
  DBCSwapDirection,
  DBCSwapMode,
  // swap() params
  DBCSwapParams,
  DBCBuyParams,
  DBCSellParams,
  // swap2() params
  DBCSwap2BaseParams,
  DBCSwap2ExactInParams,
  DBCSwap2PartialFillParams,
  DBCSwap2ExactOutParams,
  DBCSwap2Params,
  DBCBuy2Params,
  DBCSell2Params,
  DBCBuyExactOutParams,
  DBCSellExactOutParams,
  // State/query types
  DBCPoolState,
  DBCSwapQuote,
} from './dbc';
