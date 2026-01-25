# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- LUNAR_LANDER transport mode for HelloMoon low-latency endpoint
- `pumpFunAmmBuyExactQuoteIn` operation for Pump.fun AMM
- `mayhemModeEnabled` field for PumpFun operations
- `tokenProgram` fields for PumpFun operations

### Changed
- Updated AMM parameter names for consistency

### Documentation
- Added Pump.fun and Pump.fun AMM documentation
- Added Meteora integration documentation
- Added `getQuote2` return type and `DAMMv2SwapQuote2` type to DAMM v2 documentation

## [1.4.0] - 2026-01-16

### Added
- Meteora DBC (Dynamic Bonding Curve) integration
- Meteora DAMM v2 (CP-AMM) integration
- Meteora DAMM v1 (Dynamic AMM) integration
- Meteora DLMM integration

## [1.3.0] - 2025-12-19

### Changed
- Renamed NONCE transport to FLASH

## [1.2.2] - 2025-12-19

### Changed
- ZMQ now uses Dealer socket type

## [1.2.0] - 2025-12-11

### Added
- Raw transaction support

### Changed
- Renamed `SolanaExecutionClient` to `LysFlash`

### Documentation
- Added HTTP transport API key documentation

## [1.0.2] - 2025-11-14

### Added
- HTTP transport with auto-detection from URL scheme

### Documentation
- Fixed transport modes documentation

## [1.0.1] - 2025-11-14

### Documentation
- Added comprehensive API documentation and examples
- Added mandatory bribe parameter to NONCE transport examples

## [1.0.0] - 2025-11-14

### Added
- Initial release with NONCE transport mode
- ZMQ-based communication
- Basic transaction execution functionality

[Unreleased]: https://github.com/cubedro/lys-flash/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/cubedro/lys-flash/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/cubedro/lys-flash/compare/v1.2.2...v1.3.0
[1.2.2]: https://github.com/cubedro/lys-flash/compare/v1.2.0...v1.2.2
[1.2.0]: https://github.com/cubedro/lys-flash/compare/v1.0.2...v1.2.0
[1.0.2]: https://github.com/cubedro/lys-flash/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/cubedro/lys-flash/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/cubedro/lys-flash/releases/tag/v1.0.0
