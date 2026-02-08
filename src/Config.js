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
        MOVE_DURATION: 0.5,       // 한 칸 이동 시 소요되는 시간 (초)
        ROTATION_DURATION: 0.3,   // 90도 회전 시 소요되는 시간 (초)
        PLAYER_RADIUS: 0.15,      // 플레이어 충돌 판정 반지름
        JUMP_HEIGHT: 5.0,         // 기본 점프 높이
        JUMP_DURATION: 1.5,       // 점프 전체 사이클 시간 (초)
        // 점프 시 시각 효과 설정
        JUMP_EFFECT: {
            MAX_EXTRA_VISIBILITY: 10,  // 점프 시 추가로 확보되는 안개 가시거리
            VISIBILITY_THRESHOLD: 0.50, // 가시거리가 넓어지기 시작하는 높이 임계값 (0~1)
            FIRST_PERSON_TILT: 1.2,    // 1인칭 점프 시 아래를 내려다보는 강도
            BOB_FREQUENCY: 12,        // 이동 시 상하 흔들림 속도
            BOB_AMPLITUDE: 0.05,      // 이동 시 상하 흔들림 크기
            IDLE_SWAY_FREQUENCY: 0.8, // 대기 시 도리도리 속도 (더 천천히)
            IDLE_SWAY_AMPLITUDE: 0.02, // 대기 시 도리도리 강도 (더 좁은 반경으로 축소)
            IDLE_SWAY_DELAY: 3.0       // 대기 후 효과 시작까지의 지연 시간 (초)
        }
    },

    // [2] 카메라 기본 설정 (Camera Settings)
    CAMERA: {
        FOV: 75,                      // 시야각 (Field of View)
        NEAR: 0.1,                    // 렌더링 시작 최소 거리
        FAR: 10,                    // 렌더링 끝 최대 거리
        FIRST_PERSON_HEIGHT: 0.5,     // 1인칭 시점의 카메라 높이
        INITIAL_POS: { x: 0, y: 2, z: 5 }, // 스플래시/메뉴 화면에서의 초기 카메라 위치
        LOOK_AT: { x: 0, y: 0, z: 0 }       // 스플래시/메뉴 화면에서 카메라가 바라보는 지점
    },

    // [3] 환경 및 조명 (Environment & Lighting)
    ENVIRONMENT: {
        FOG: {
            COLOR: 0x000000,          // 안개 색상 (검정색은 어둠을 표현)
            NEAR: 0,                  // 안개가 시작되는 거리
            FAR: 4                    // 안개로 인해 아무것도 보이지 않게 되는 거리
        },
        LIGHTING: {
            // 메뉴/스플래시 화면용 조명
            MENU_AMBIENT: { COLOR: 0xffffff, INTENSITY: 0.05 },
            MENU_POINT: { COLOR: 0xffffff, INTENSITY: 1, POSITION: { x: 5, y: 5, z: 5 } },
            // 실제 게임 플레이 조명
            AMBIENT_INTENSITY: 0.1,  // 전체적인 환경 광도
            SUN_INTENSITY: 0.1        // 태양광(직사광) 강도
        }
    },

    // [4] 메뉴 애니메이션용 객체 설정 (Menu & Aesthetics)
    CUBE: {
        SIZE: [1, 1, 1],              // 큐브 크기 [가로, 세로, 높이]
        COLOR: 0x00ff00,              // 큐브 색상
        ROTATION_SPEED: 0.01          // 큐브 회전 속도
    },
    FLOOR: {
        SIZE: [20, 20],               // 바닥 크기 [가로, 세로]
        COLOR: 0x111111,              // 바닥 색상
        POSITION_Y: -2                // 바닥의 Y축 위치
    },

    // [5] 미로 기본 설정 (Maze Settings)
    MAZE: {
        DEFAULT_WIDTH: 15,            // 초기 미로 가로 칸 수
        DEFAULT_HEIGHT: 15,           // 초기 미로 세로 칸 수
        WALL_HEIGHT: 2,               // 벽의 높이
        WALL_THICKNESS: 1.5,          // 벽의 두께 (이동 거리 단위)
        WALL_COLOR: 0xffffff,         // 벽의 기본 색상 (텍스처와 곱해짐)
        TEXTURE_URL: 'textures/wall_brick.png',   // 벽 텍스처 경로
        FLOOR_TEXTURE_URL: 'textures/floor_stone.png', // 바닥 텍스처 경로
        SHAPE: 'RECTANGLE'            // 미로 모양 (RECTANGLE, DIAMOND, CIRCLE, TRIANGLE)
    },

    // [6] 사운드 리소스 및 설정 (Audio Assets)
    AUDIO: {
        BGM_URL: 'audio/bgm_background.mp3',      // 배경음악 경로
        CLICK_SFX_URL: 'audio/eff_teleport.mp3',   // 클릭 효과음 경로 (eff_click 대체)
        FOOTSTEP_SFX_URL: 'audio/eff_footstep.mp3', // 발소리 효과음 경로
        JUMP_SFX_URL: 'audio/eff_jump.wav',       // 점프 효과음 경로
        ITEM_PICKUP_SFX_URL: 'audio/eff_itemget.mp3', // 아이템 획득 효과음
        ZOMBIE_PATROL_SFX: 'audio/eff_zombie_1.mp3', // 좀비 배회음
        ZOMBIE_TRACK_SFX: 'audio/eff_zombie_2.mp3',      // 좀비 추적음
        DEFAULT_BGM_VOLUME: 0.4                   // 기본 배경음악 볼륨 (0~1)
    },

    // [7] 아이템 설정 (Item Settings)
    ITEMS: {
        SPAWN_COUNT: 20, // 스테이지 시작 시 생성될 아이템 총 개수
        TYPES: {
            JUMP: { TYPE: 'JUMP', COLOR: 0xFFFF00, SCALE: 0.12 },      // 점프 아이템 외형 설정
            FLASHLIGHT: { TYPE: 'FLASHLIGHT', COLOR: 0xffffff, SCALE: 0.1 }, // 손전등 아이템 외형 설정
            MAP: { TYPE: 'MAP', COLOR: 0xffaa00, SCALE: 0.15 },       // 지도 아이템 외형 설정
            HAMMER: { TYPE: 'HAMMER', COLOR: 0x888888, SCALE: 0.15 },  // 망치 아이템 외형 설정
            TRAP: { TYPE: 'TRAP', COLOR: 0xff0000, SCALE: 0.15 }       // 함정 아이템 외형 설정 (빨강)
        },
        // 지도 관련 세부 설정
        MAP: {
            COLORS: {
                WALL: '#444444',      // 미니맵 상의 벽 색상
                ROAD: '#222222',      // 미니맵 상의 길 색상
                PLAYER: '#00ff00',    // 플레이어 아이콘 색상
                MONSTER: '#ff3333', // 좀비 표시 색상 (불타는 빨강)
                ENTRANCE: '#ffff00',  // 입구 색상
                EXIT: '#0000ff'       // 출구 색상
            },
            ROTATION_FOLLOW: true     // 플레이어 회전에 따라 맵을 회전시킬지 여부
        },
        // 망치 관련 세부 설정
        HAMMER: {
            CAN_BREAK_BOUNDARY: false,   // 최외곽 경계 벽 파괴 가능 여부
            CAN_BREAK_THICK_WALLS: false // 두 겹 이상의 두꺼운 벽 파괴 가능 여부
        },
        // 함정 관련 세부 설정
        TRAP: {
            FREEZE_DURATION: 5.0,     // 좀비 정지 시간 (초)
            TRIGGER_RADIUS: 0.5       // 함정 발동 반경 (타일 단위 아님, 월드 좌표 기준)
        },
        // 점프 강화 관련 설정
        JUMP_BOOST: {
            MULTIPLIER: 1 // 특수 점프 시의 높이 배율
        },
        // 손전등 관련 세부 설정
        FLASHLIGHT: {
            DURATION: 30.0,           // 배터리 지속 시간 (초)
            RECHARGE_DURATION: 30.0,  // 완충에 소요되는 시간 (초, 대기 및 OFF 시)
            RECHARGE_DELAY: 3.0,     // 충전이 시작되기 위한 최소 대기 시간 (초)
            INTENSITY: 10,            // 빛의 밝기 (강도)
            DISTANCE: 4,              // 빛이 도달하는 최대 거리
            ANGLE: Math.PI / 7,       // 빛의 조사 각도 (라디안)
            PENUMBRA: 1,              // 빛 가장자리의 부드러움 정도 (0~1)
            FLICKER_THRESHOLD: 3.0,    // 깜빡임 시작 기준 배터리 잔량 시간 (초)
            POSITION_OFFSET: { x: 0, y: 0.5, z: 0 }, // 플레이어 위치 기준 손전등 배치 오프셋
            TARGET_OFFSET: { x: 0, y: 0.5, z: -1 },   // 손전등이 조준하는 방향 오프셋
            MOVEMENT: {
                LAG_SPEED: 15.0,        // 시선 따라가는 속도 (초당 반응성)
                SWAY_AMPLITUDE: 0.03,  // 손전등 자체 흔들림 강도 (미세한 흔들림)
                SWAY_FREQUENCY: 1.5    // 손전등 자체 흔들림 속도
            }
        }
    },

    // [8] 스테이지 성장 설정 (Stage Settings)
    STAGE: {
        INITIAL_LEVEL: 1,             // 시작 레벨
        INITIAL_SIZE: 11,             // 시작 미로 크기 (11x11)
        SIZE_INCREMENT: 2,            // 레벨업 시 증가할 미로 크기
        MAX_SIZE: 31                  // 최대 미로 크기 제한
    },

    // [9] 몬스터 설정 (Monster Settings)
    MONSTERS: {
        TYPES: {
            ZOMBIE: 'ZOMBIE'
        },
        STATES: {
            IDLE: 'IDLE',
            MOVE: 'MOVE',
            ATTACK: 'ATTACK',
            HURT: 'HURT',
            DIE: 'DIE'
        },
        ZOMBIE: {
            SPEED: 1.5,                // 이동 속도 (미사용 예정 - MOVE_DURATION으로 대체 가능)
            MOVE_DURATION: 2,        // 한 칸 이동 대략 시간 (초)
            DETECTION_RANGE: 3,        // 플레이어 감지 범위 (타일)
            IDLE_SWAY_SPEED: 1,        // 대기 시 흔들림 속도
            IDLE_SWAY_AMPLITUDE: 0.1,  // 대기 시 흔들림 크기
            WALK_BOB_SPEED: 3,        // 이동 시 움찔거리는 속도
            WALK_BOB_AMPLITUDE: 0.05,  // 이동 시 움찔거리는 크기
            MODEL_SCALE: 0.3,          // 모델 크기
            COLOR: 0x77aa77,           // 좀비 기본 색상 (창백한 초록)
            PATH_RECALC_INTERVAL: 1, // 길찾기 경로 갱신 간격 (초)
            PATROL_RADIUS: 3,          // 배회 반경 (타일)
            PATROL_WAIT_MIN: 0.5,      // 배회 목적지 도착 후 최소 대기 시간 (초)
            PATROL_WAIT_MAX: 2.0,      // 배회 목적지 도착 후 최대 대기 시간 (초)
            SAFE_SPAWN_DISTANCE: 10     // 플레이어(입구)와의 최소 스폰 안전 거리 (타일)
        }
    }
};
