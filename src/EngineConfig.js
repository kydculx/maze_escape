/**
 * 엔진/시스템 설정
 * (카메라, 환경, 조명, 오디오, 메뉴 오브젝트)
 */

export const ENGINE_CONFIG = {
    // [1] 카메라 기본 설정 (Camera Settings)
    CAMERA: {
        FOV: 75,                      // 시야각 (Field of View)
        NEAR: 0.1,                    // 렌더링 시작 최소 거리
        FAR: 10,                      // 렌더링 끝 최대 거리
        FIRST_PERSON_HEIGHT: 0.5,     // 1인칭 시점의 카메라 높이
        INITIAL_POS: { x: 0, y: 2, z: 5 }, // 스플래시/메뉴 화면에서의 초기 카메라 위치
        LOOK_AT: { x: 0, y: 0, z: 0 }       // 스플래시/메뉴 화면에서 카메라가 바라보는 지점
    },

    // [2] 환경 및 조명 (Environment & Lighting)
    ENVIRONMENT: {
        FOG: {
            COLOR: 0x000000,          // 안개 색상 (검정색은 어둠을 표현)
            NEAR: 0,                  // 안개가 시작되는 거리
            FAR: 3,                   // 기본 안개 거리 (손전등 OFF)
            FAR_FLASHLIGHT: 5         // 손전등 ON 시 안개 거리
        },
        LIGHTING: {
            // 메뉴/스플래시 화면용 조명
            MENU_AMBIENT: { COLOR: 0xffffff, INTENSITY: 0.05 },
            MENU_POINT: { COLOR: 0xffffff, INTENSITY: 1, POSITION: { x: 5, y: 5, z: 5 } },
            // 실제 게임 플레이 조명
            AMBIENT_INTENSITY: 0.1,
            SUN_INTENSITY: 0.1
        }
    },

    // [3] 메뉴 애니메이션용 객체 설정 (Menu & Aesthetics)
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

    // [4] 사운드 리소스 및 설정 (Audio Assets)
    AUDIO: {
        BGM_URL: 'audio/bgm_background.mp3',
        CLICK_SFX_URL: 'audio/eff_click.mp3',
        FOOTSTEP_SFX_URL: 'audio/eff_footstep.mp3',
        JUMP_SFX_URL: 'audio/eff_jump.wav',
        ITEM_PICKUP_SFX_URL: 'audio/eff_itemget.mp3',
        ZOMBIE_PATROL_SFX: 'audio/eff_zombie_1.mp3',
        ZOMBIE_TRACK_SFX: 'audio/eff_zombie_2.mp3',
        FLASHLIGHT_SWITCH_SFX_URL: 'audio/eff_flashlight_switch.mp3',
        SENSOR_TOGGLE_SFX_URL: 'audio/eff_sensor_switch.mp3',
        TELEPORT_SFX_URL: 'audio/eff_teleport.mp3',
        HAMMER_SFX_URL: 'audio/eff_hammer_smash.mp3',
        DEFAULT_BGM_VOLUME: 0.4
    }
};
