/**
 * 엔진/시스템 설정
 * (카메라, 환경, 조명, 오디오, 메뉴 오브젝트)
 */

export const ENGINE_CONFIG = {
    // [1] 화면 및 렌더링 (Display & Rendering)
    RENDERER: {
        CLEAR_COLOR: 0x000000,        // 렌더링 배경 초기화 색상 (검정)
        ANTIALIAS: true,              // 계단 현상 제거 (안티앨리어싱) 활성화 여부
        PIXEL_RATIO: Math.min(window.devicePixelRatio, 2) // 픽셀 비율 제한 (고해상도에서의 성능 저하 방지, 최대 2배)
    },

    // [2] 환경 및 조명 (Environment & Lighting)
    ENVIRONMENT: {
        LIGHTING: {
            // 메뉴/스플래시 화면용 조명 설정
            MENU_AMBIENT: {
                COLOR: 0xffffff,      // 주변광 색상
                INTENSITY: 0.05       // 주변광 강도 (0~1)
            },
            MENU_POINT: {
                COLOR: 0xffffff,      // 포인트 라이트 색상
                INTENSITY: 1,         // 포인트 라이트 강도
                POSITION: { x: 5, y: 5, z: 5 } // 조명 위치 (x, y, z)
            }
        },
        // 날씨 설정
        WEATHER: {
            RAIN: {
                ENABLED: true,
                COUNT: 3000,          // 비 입자 개수
                COLOR: 0xaaaaaa,      // 비 색상 (약간 회색)
                SPEED_Y: 25,          // 낙하 속도
                RANGE_X: 40,          // 생성 범위 X (플레이어 기준)
                RANGE_Z: 40,          // 생성 범위 Z (플레이어 기준)
                HEIGHT: 30,           // 생성 높이
                SIZE: 0.001,           // 빗줄기 굵기
                LENGTH: 0.5           // 빗줄기 길이
            },
            LIGHTNING: {
                ENABLED: true,
                COLOR: 0xffffff,      // 번개 빛 색상
                INTENSITY: 2.5,       // 번개 빛 강도 (순간적)
                INTERVAL_MIN: 10,     // 최소 간격 (초)
                INTERVAL_MAX: 30,     // 최대 간격 (초)
                DURATION: 0.2         // 번개 지속 시간 (초)
            },
            FOG: {
                COLOR: 0x050505,      // 어두운 안개 색상 (비오는 날)
                NEAR: 2,
                FAR: 10               // 시야를 좁게 하여 공포감 조성
            }
        }
    },

    // [4] 사운드 리소스 및 설정 (Audio Assets)
    AUDIO: {
        // 배경음 및 효과음 파일 경로
        BGM_URL: 'audio/bgm_background.mp3',             // 배경음악
        THUNDER_SFX_URL: 'audio/eff_thunder.mp3',        // 천둥 소리
        RAIN_BGS_URL: 'audio/eff_rain.mp3',         // 빗소리 (배경)
        CLICK_SFX_URL: 'audio/eff_click.mp3',            // UI 클릭음
        FOOTSTEP_SFX_URL: 'audio/eff_footstep.mp3',      // 발소리
        JUMP_SFX_URL: 'audio/eff_jump.wav',              // 점프 소리
        ITEM_PICKUP_SFX_URL: 'audio/eff_itemget.mp3',    // 아이템 획득 소리
        ZOMBIE_PATROL_SFX: 'audio/eff_zombie_patrol.mp3',     // 좀비 배회 소리 (그르렁)
        ZOMBIE_TRACK_SFX: 'audio/eff_zombie_track.mp3',      // 좀비 추격 소리 (크아앙)
        ZOMBIE_ATTACK_SFX: 'audio/eff_zombie_attack.mp3', // 좀비 공격 소리 (추격음과 동일하게 설정)
        WOLF_PATROL_SFX: 'audio/eff_wolf_patrol.mp3',     // 늑대 배회 소리 (그르렁)
        WOLF_TRACK_SFX: 'audio/eff_wolf_track.mp3',      // 늑대 추격 소리 (크아앙)
        WOLF_ATTACK_SFX: 'audio/eff_wolf_attack.mp3',     // 늑대 공격 소리 (추격음과 동일하게 설정)

        FLASHLIGHT_SWITCH_SFX_URL: 'audio/eff_flashlight_switch.mp3', // 손전등 스위치 소리
        SENSOR_TOGGLE_SFX_URL: 'audio/eff_sensor_switch.mp3', // 센서 스위치 소리
        TELEPORT_SFX_URL: 'audio/eff_teleport.mp3',      // 텔레포트 효과음
        HAMMER_SFX_URL: 'audio/eff_hammer_smash.mp3',    // 망치 사용 소리
        TRAP_SFX_URL: 'audio/eff_trap.mp3',              // 함정 설치 소리

        DEFAULT_BGM_VOLUME: 0.4                          // 기본 배경음악 볼륨 (0.0 ~ 1.0)
    }
};
