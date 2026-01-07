/**
 * Meteora Integration Module
 *
 * Provides integration with Meteora protocols:
 * - DBC (Dynamic Bonding Curve)
 * - DAMM v1 (Dynamic AMM v1)
 * - DAMM v2 (Dynamic AMM v2 / CP-AMM)
 * - DLMM (Dynamic Liquidity Market Maker)
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

// DAMM v2 sub-module (re-export everything)
export {
  // Namespace class
  DAMMv2Namespace,
  // Static utilities
  DAMMv2Utils,
  // Constants
  SOL_MINT,
} from './damm-v2';

// DAMM v2 types (re-export)
export type {
  // Direction and mode types
  DAMMv2SwapDirection,
  DAMMv2SwapMode,
  // swap() params
  DAMMv2SwapParams,
  DAMMv2BuyParams,
  DAMMv2SellParams,
  // swap2() params
  DAMMv2Swap2BaseParams,
  DAMMv2Swap2ExactInParams,
  DAMMv2Swap2PartialFillParams,
  DAMMv2Swap2ExactOutParams,
  DAMMv2Swap2Params,
  DAMMv2Buy2Params,
  DAMMv2Sell2Params,
  DAMMv2BuyExactOutParams,
  DAMMv2SellExactOutParams,
  // State/query types
  DAMMv2PoolState,
  DAMMv2SwapQuote,
} from './damm-v2';

// DAMM v1 sub-module (re-export everything)
export {
  // Namespace class
  DAMMv1Namespace,
  // Static utilities
  DAMMv1Utils,
} from './damm-v1';

// DAMM v1 types (re-export)
export type {
  // swap() params
  DAMMv1SwapParams,
  DAMMv1BuyParams,
  DAMMv1SellParams,
  // State/query types
  DAMMv1PoolState,
  DAMMv1SwapQuote,
} from './damm-v1';

// DLMM sub-module (re-export everything)
export {
  // Namespace class
  DLMMNamespace,
  // Static utilities
  DLMMUtils,
} from './dlmm';

// DLMM types (re-export)
export type {
  // swap() params
  DLMMSwapParams,
  DLMMSwapExactOutParams,
  DLMMBuyParams,
  DLMMSellParams,
  DLMMBuyExactOutParams,
  DLMMSellExactOutParams,
  // State/query types
  DLMMPoolState,
  DLMMActiveBin,
  DLMMSwapQuote,
  DLMMSwapQuoteExactOut,
} from './dlmm';
