/**
 * DEPRECATION & COMPATIBILITY NOTICE:
 * 
 * This file (layaEdgeEngine.js) is preserved ONLY for backward compatibility with existing imports.
 * The canonical module is now `./offlineRouteEngine.js`.
 * 
 * Truth in Engineering:
 * This module provides deterministic Haversine distance calculations, nearest-neighbor TSP tour
 * sequencing, and local browser caching for offline tourist guidance. It does NOT use or integrate
 * the LayaAir 2D/3D game engine.
 */

export * from './offlineRouteEngine';
export { default } from './offlineRouteEngine';
