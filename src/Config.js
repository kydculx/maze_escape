/**
 * 플레이어 행동 상태 정의
 */
export const PLAYER_ACTION_STATES = {
    IDLE: 'IDLE',
    MOVE: 'MOVE',
    JUMP: 'JUMP'
};

/**
 * 게임 전반의 설정값을 관리하는 객체
 */
export const CONFIG = {
    // [1] 플레이어 설정 (Player Settings)
    PLAYER: {
        ROTATION_SPEED: 0.05,
        ROTATION_DURATION: 0.5,
        MOVE_DURATION: 0.5,
        PLAYER_RADIUS: 0.15,
        JUMP_HEIGHT: 4.4,
        JUMP_DURATION: 2.0,
        TOGGLE_VIEW_KEY: 'KeyV'
    },

    // [2] 카메라 기본 설정 (Camera Settings)
    CAMERA: {
        FOV: 75,
        NEAR: 0.1,
        FAR: 1000,
        FIRST_PERSON_HEIGHT: 0.5,
        INITIAL_POS: { x: 0, y: 2, z: 5 }, // 스플래시/메뉴용
        LOOK_AT: { x: 0, y: 0, z: 0 },      // 스플래시/메뉴용
        THIRD_PERSON: {
            OFFSET: { x: 0, y: 0.43, z: 0.29 },
            LOOK_AT_OFFSET: { x: 0, y: 0.41, z: -1 }
        }
    },

    // [3] 환경 및 조명 (Environment & Lighting)
    ENVIRONMENT: {
        FOG: {
            COLOR: 0x000000,
            NEAR: 1,
            FAR: 4
        },
        LIGHTING: {
            // 주방 설정 (Menu/Splash)
            MENU_AMBIENT: { COLOR: 0xffffff, INTENSITY: 0.05 },
            MENU_POINT: { COLOR: 0xffffff, INTENSITY: 1, POSITION: { x: 5, y: 5, z: 5 } },
            // 게임 플레이 설정
            AMBIENT_INTENSITY: 0.05,
            SUN_INTENSITY: 0.1
        },
        SPOTLIGHT: {
            COLOR: 0xffffff,
            INTENSITY: 2.0,
            DISTANCE: 10,
            ANGLE: Math.PI / 7,
            PENUMBRA: 0.1,
            DECAY: 0
        },
        MOON: {
            SIZE: 2,
            COLOR: 0xddddff,
            EMISSIVE: 0x222244,
            POSITION: { x: -20, y: 15, z: -20 }
        },
        STARS: {
            COUNT: 2000,
            COLOR: 0xffffff,
            SIZE: 0.1
        }
    },

    // [4] 메뉴 및 미학적 요소 (Menu & Aesthetics)
    CUBE: {
        SIZE: [1, 1, 1],
        COLOR: 0x00ff00,
        ROTATION_SPEED: 0.01
    },
    FLOOR: {
        SIZE: [20, 20],
        COLOR: 0x111111,
        POSITION_Y: -2
    },

    // [4] 미로 설정 (Maze Settings)
    MAZE: {
        DEFAULT_WIDTH: 15,
        DEFAULT_HEIGHT: 15,
        WALL_HEIGHT: 2,
        WALL_THICKNESS: 1.5,
        WALL_COLOR: 0xffffff,
        TEXTURE_URL: 'textures/wall_brick.png',
        FLOOR_TEXTURE_URL: 'textures/floor_stone.png'
    },

    // [5] 사운드 리소스 (Audio Assets)
    AUDIO: {
        BGM_URL: 'audio/bgm_background.mp3',
        CLICK_SFX_URL: 'audio/eff_click.mp3',
        FOOTSTEP_SFX_URL: 'audio/eff_footstep.mp3',
        JUMP_SFX_URL: 'audio/eff_jump.wav',
        DEFAULT_BGM_VOLUME: 0.4
    }
};
