/**
 * 통합 Config - 기존 코드 호환성 유지
 * GameConfig와 EngineConfig를 합쳐서 CONFIG로 export
 */
import { GAME_CONFIG, PLAYER_ACTION_STATES } from './GameConfig.js';
import { ENGINE_CONFIG } from './EngineConfig.js';

// 기존 코드 호환을 위해 통합 CONFIG 생성
export const CONFIG = {
    ...GAME_CONFIG,
    ...ENGINE_CONFIG
};

// PLAYER_ACTION_STATES도 재export
export { PLAYER_ACTION_STATES };
