import { GAME_CONFIG } from './GameConfig.js';
import { ENGINE_CONFIG } from './EngineConfig.js';
import { MONSTER_CONFIG } from './monsters/MonsterConfig.js';
import { ITEM_CONFIG } from './items/ItemConfig.js';
import { MAP_CONFIG, STAGE_CONFIG } from './maps/MapConfig.js';
import { PLAYER_CONFIG, PLAYER_ACTION_STATES } from './player/PlayerConfig.js';

// 기존 코드 호환을 위해 통합 CONFIG 생성
export const CONFIG = {
    ...GAME_CONFIG,
    ...ENGINE_CONFIG,
    MONSTERS: MONSTER_CONFIG,
    ITEMS: ITEM_CONFIG,
    MAZE: MAP_CONFIG,
    STAGE: STAGE_CONFIG,
    PLAYER: PLAYER_CONFIG
};

// PLAYER_ACTION_STATES도 재export
export { PLAYER_ACTION_STATES };
