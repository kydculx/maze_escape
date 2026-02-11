/**
 * 맵(미로) 관련 설정
 */
import { ASSETS } from '../Assets.js';

export const MAP_CONFIG = {
    DEFAULT_WIDTH: 15,            // 초기 미로 가로 칸 수
    DEFAULT_HEIGHT: 15,           // 초기 미로 세로 칸 수
    WALL_HEIGHT: 2,               // 벽의 높이
    WALL_THICKNESS: 1.5,          // 벽의 두께 (이동 거리 단위)
    WALL_COLOR: 0xffffff,         // 벽의 기본 색상 (텍스처와 곱해짐)
    TEXTURE_URL: ASSETS.TEXTURES.WALL_BRICK,     // 벽 텍스처
    FLOOR_TEXTURE_URL: ASSETS.TEXTURES.FLOOR_STONE, // 바닥 텍스처
    SHAPE: 'RECTANGLE',           // 미로 모양 (RECTANGLE, DIAMOND, CIRCLE, TRIANGLE)

    // 조명 설정 (게임플레이)
    LIGHTING: {
        AMBIENT_INTENSITY: 0.5,   // 주변광(Ambient Light) 강도 (전체적인 밝기)
        SUN_INTENSITY: 0.2        // 주광(Directional Light) 강도 (그림자 생성용)
    },

    // 안개 설정 (거리감 및 분위기 조성)
    FOG: {
        COLOR: 0x101010,          // 안개 색상 (검정색은 어둠을 표현)
        NEAR: 0,                  // 안개가 시작되는 거리 (플레이어 위치 기준)
        FAR: 3,                   // 기본 안개 끝 거리 (손전등 OFF 시 가시거리)
        FAR_FLASHLIGHT: 5         // 손전등 ON 시 안개 끝 거리 (가시거리 확장)
    },

    // 배경 바닥 설정 (미로 바닥 아래에 깔리는 거대한 평면)
    BG_FLOOR: {
        SIZE: [20, 20],           // 바닥 크기 [가로, 세로]
        COLOR: 0x111111,          // 바닥 색상 (어두운 회색)
        POSITION_Y: -2            // 바닥의 Y 위치 (미로보다 아래에 배치)
    }
};

export const STAGE_CONFIG = {
    INITIAL_LEVEL: 1,       // 게임 시작 레벨
    INITIAL_SIZE: 5,        // 레벨 1의 미로 크기 (5x5)
    SIZE_INCREMENT: 1,      // 레벨 업 당 미로 크기 증가량
    MAX_SIZE: 31            // 미로의 최대 크기 제한
};
