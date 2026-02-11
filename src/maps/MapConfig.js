/**
 * 맵(미로) 관련 설정
 */
import { ASSETS } from '../Assets.js';

export const MAP_CONFIG = {
    WALL_HEIGHT: 2,               // 벽의 높이
    WALL_THICKNESS: 1.5,          // 벽의 두께 (이동 거리 단위)
    // 테마별 환경 설정 (TEXTURE, LIGHTING, FOG)
    THEMES: {
        ORIGINAL_BRICK: {
            WALL: ASSETS.TEXTURES.WALL_BRICK,
            FLOOR: ASSETS.TEXTURES.FLOOR_STONE,
            WALL_COLOR: 0xffffff,
            LIGHTING: { AMBIENT_INTENSITY: 0.5, SUN_INTENSITY: 0.2 },
            FOG: { COLOR: 0x101010, NEAR: 0, FAR: 3, FAR_FLASHLIGHT: 5 },
            BG_FLOOR: { SIZE: [30, 30], COLOR: 0x111111, POSITION_Y: -2 },
            MATERIAL: { ROUGHNESS: 0.8, METALNESS: 0.1, EMISSIVE: 0x000000, EMISSIVE_INTENSITY: 0.0 }
        },
        ORIGINAL_STONE: {
            WALL: ASSETS.TEXTURES.WALL_GOTHIC,
            FLOOR: ASSETS.TEXTURES.FLOOR_STONE,
            WALL_COLOR: 0xffffff,
            LIGHTING: { AMBIENT_INTENSITY: 0.5, SUN_INTENSITY: 0.2 },
            FOG: { COLOR: 0x101010, NEAR: 0, FAR: 3, FAR_FLASHLIGHT: 5 },
            BG_FLOOR: { SIZE: [30, 30], COLOR: 0x111111, POSITION_Y: -2 },
            MATERIAL: { ROUGHNESS: 0.8, METALNESS: 0.1, EMISSIVE: 0x000000, EMISSIVE_INTENSITY: 0.0 }
        },
        TYPE_A: { // Grim & Damp
            WALL: ASSETS.TEXTURES.DUNGEON.TYPE_A.WALL,
            FLOOR: ASSETS.TEXTURES.DUNGEON.TYPE_A.FLOOR,
            WALL_COLOR: 0xffffff,
            LIGHTING: { AMBIENT_INTENSITY: 0.5, SUN_INTENSITY: 0.2 },
            FOG: { COLOR: 0x101010, NEAR: 0, FAR: 3, FAR_FLASHLIGHT: 5 },
            BG_FLOOR: { SIZE: [30, 30], COLOR: 0x111111, POSITION_Y: -2 },
            MATERIAL: { ROUGHNESS: 0.8, METALNESS: 0.1, EMISSIVE: 0x000000, EMISSIVE_INTENSITY: 0.0 }
        },
        TYPE_B: { // Iron Prison
            WALL: ASSETS.TEXTURES.DUNGEON.TYPE_B.WALL,
            FLOOR: ASSETS.TEXTURES.DUNGEON.TYPE_B.FLOOR,
            WALL_COLOR: 0xffffff,
            LIGHTING: { AMBIENT_INTENSITY: 0.5, SUN_INTENSITY: 0.2 },
            FOG: { COLOR: 0x101010, NEAR: 0, FAR: 3, FAR_FLASHLIGHT: 5 },
            BG_FLOOR: { SIZE: [30, 30], COLOR: 0x111111, POSITION_Y: -2 },
            MATERIAL: { ROUGHNESS: 0.8, METALNESS: 0.1, EMISSIVE: 0x000000, EMISSIVE_INTENSITY: 0.0 }
        },
        TYPE_C: { // Ancient Catacombs
            WALL: ASSETS.TEXTURES.DUNGEON.TYPE_C.WALL,
            FLOOR: ASSETS.TEXTURES.DUNGEON.TYPE_C.FLOOR,
            WALL_COLOR: 0xffffff,
            LIGHTING: { AMBIENT_INTENSITY: 0.5, SUN_INTENSITY: 0.2 },
            FOG: { COLOR: 0x101010, NEAR: 0, FAR: 3, FAR_FLASHLIGHT: 5 },
            BG_FLOOR: { SIZE: [30, 30], COLOR: 0x111111, POSITION_Y: -2 },
            MATERIAL: { ROUGHNESS: 0.8, METALNESS: 0.1, EMISSIVE: 0x000000, EMISSIVE_INTENSITY: 0.0 }
        }
    },

    // 현재 테마 설정
    CURRENT_THEME: 'TYPE_C',

    // 현재 테마에 따른 동적 Getters
    get TEXTURE_URL() { return this.THEMES[this.CURRENT_THEME].WALL; },
    get FLOOR_TEXTURE_URL() { return this.THEMES[this.CURRENT_THEME].FLOOR; },
    get WALL_COLOR() { return this.THEMES[this.CURRENT_THEME].WALL_COLOR; },
    get LIGHTING() { return this.THEMES[this.CURRENT_THEME].LIGHTING; },
    get FOG() { return this.THEMES[this.CURRENT_THEME].FOG; },
    get BG_FLOOR() { return this.THEMES[this.CURRENT_THEME].BG_FLOOR; },
    get MATERIAL() { return this.THEMES[this.CURRENT_THEME].MATERIAL; },
    SHAPE: 'RECTANGLE',           // 미로 모양 (RECTANGLE, DIAMOND, CIRCLE, TRIANGLE)

};

export const STAGE_CONFIG = {
    INITIAL_LEVEL: 1,       // 게임 시작 레벨
    INITIAL_SIZE: 7,       // 레벨 1의 미로 크기 (15x15 그리드 = 7x7 이동 가능 구역)
    SIZE_INCREMENT: 2,      // 레벨 업 당 미로 크기 증가량 (홀수 유지를 위해 짝수로 증가 권장)
    MAX_SIZE: 35            // 미로의 최대 크기 제한
};
