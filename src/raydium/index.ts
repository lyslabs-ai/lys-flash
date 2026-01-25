/**
 * Raydium Integration Module
 *
 * Provides integration with Raydium protocols:
 * - LaunchPad (Bonding Curve)
 * - CLMM (Concentrated Liquidity Market Maker)
 * - CPMM (Constant Product Market Maker)
 * - AMMv4 (V4 AMM with OpenBook integration)
 *
 * @module raydium
 */

// Parent namespace
export { RaydiumNamespace } from './namespace';

// LaunchPad sub-module (re-export everything)
export {
  // Namespace class
  RaydiumLaunchPadNamespace,
  // Static utilities
  RaydiumLaunchPadUtils,
  // Constants
  RAYDIUM_LAUNCHPAD_PROGRAM_ID,
} from './launchpad';

// LaunchPad types (re-export)
export type {
  // Direction types
  RaydiumLaunchPadSwapDirection,
  // Swap params
  RaydiumLaunchPadSwapParams,
  RaydiumLaunchPadBuyParams,
  RaydiumLaunchPadSellParams,
  // State/query types
  RaydiumLaunchPadPoolState,
  RaydiumLaunchPadSwapQuote,
} from './launchpad';

// CLMM sub-module (re-export everything)
export {
  // Namespace class
  RaydiumCLMMNamespace,
  // Static utilities
  RaydiumCLMMUtils,
  // Constants
  RAYDIUM_CLMM_PROGRAM_ID,
} from './clmm';

// CLMM types (re-export)
export type {
  // Direction and mode types
  RaydiumCLMMSwapDirection,
  RaydiumCLMMSwapMode,
  // Swap params
  RaydiumCLMMSwapParams,
  RaydiumCLMMSwapExactOutParams,
  RaydiumCLMMBuyParams,
  RaydiumCLMMSellParams,
  RaydiumCLMMBuyExactOutParams,
  RaydiumCLMMSellExactOutParams,
  // State/query types
  RaydiumCLMMPoolState,
  RaydiumCLMMSwapQuote,
  RaydiumCLMMSwapQuoteExactOut,
} from './clmm';

// CPMM sub-module (re-export everything)
export {
  // Namespace class
  RaydiumCPMMNamespace,
  // Static utilities
  RaydiumCPMMUtils,
} from './cpmm';

// CPMM types (re-export)
export type {
  // Direction and mode types
  RaydiumCPMMSwapDirection,
  RaydiumCPMMSwapMode,
  // Swap params
  RaydiumCPMMSwapParams,
  RaydiumCPMMSwapExactOutParams,
  RaydiumCPMMBuyParams,
  RaydiumCPMMSellParams,
  RaydiumCPMMBuyExactOutParams,
  RaydiumCPMMSellExactOutParams,
  // State/query types
  RaydiumCPMMPoolState,
  RaydiumCPMMSwapQuote,
  RaydiumCPMMSwapQuoteExactOut,
} from './cpmm';

// AMMv4 sub-module (re-export everything)
export {
  // Namespace class
  RaydiumAMMv4Namespace,
  // Static utilities
  RaydiumAMMv4Utils,
  // Constants
  AMMV4_FEE_BPS,
} from './ammv4';

// AMMv4 types (re-export)
export type {
  // Direction and mode types
  RaydiumAMMv4SwapDirection,
  RaydiumAMMv4SwapMode,
  // Swap params
  RaydiumAMMv4SwapParams,
  RaydiumAMMv4SwapExactOutParams,
  RaydiumAMMv4BuyParams,
  RaydiumAMMv4SellParams,
  RaydiumAMMv4BuyExactOutParams,
  RaydiumAMMv4SellExactOutParams,
  // State/query types
  RaydiumAMMv4PoolState,
  RaydiumAMMv4SwapQuote,
  RaydiumAMMv4SwapQuoteExactOut,
} from './ammv4';

// Re-export SOL_MINT from launchpad (also available in other modules)
export { SOL_MINT } from './launchpad';
