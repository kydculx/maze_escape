/**
 * 인게임 밸런스 및 게임 메카닉 설정
 * (플레이어, 미로, 아이템, 스테이지, 몬스터)
 */

/**
 * 플레이어 행동 상태 정의
 */
export const PLAYER_ACTION_STATES = {
    IDLE: 'IDLE',
    MOVE: 'MOVE',
    JUMP: 'JUMP'
};

export const GAME_CONFIG = {
    // [1] 플레이어 설정 (Player Settings)
    PLAYER: {
        MOVE_DURATION: 0.7,       // 한 칸 이동 시 소요되는 시간 (초)
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

    // [2] 미로 기본 설정 (Maze Settings)
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

    // [3] 아이템 설정 (Item Settings)
    ITEMS: {
        SPAWN_COUNT: 20, // 스테이지 시작 시 생성될 아이템 총 개수

        // 레벨별 아이템 등장 시점 (외부 조절 가능)
        UNLOCK_LEVELS: {
            FLASHLIGHT: 1,   // 레벨 1부터 (손전등만)
            SENSOR: 6,       // 레벨 6부터 센서 등장
            JUMP: 11,        // 레벨 11부터 점프 등장
            HAMMER: 16,      // 레벨 16부터 망치 등장
            TRAP: 21,        // 레벨 21부터 함정 등장
            TELEPORT: 26,    // 레벨 26부터 텔레포트 등장
            MAP: 1           // 레벨 1부터 (지도는 항상 가능)
        },

        TYPES: {
            JUMP: { TYPE: 'JUMP', COLOR: 0xFFFF00, SCALE: 0.12 },
            FLASHLIGHT: { TYPE: 'FLASHLIGHT', COLOR: 0xffffff, SCALE: 0.1 },
            MAP: { TYPE: 'MAP', COLOR: 0xffaa00, SCALE: 0.15 },
            HAMMER: { TYPE: 'HAMMER', COLOR: 0x888888, SCALE: 0.15 },
            TRAP: { TYPE: 'TRAP', COLOR: 0xff0000, SCALE: 0.15 },
            TELEPORT: { TYPE: 'TELEPORT', COLOR: 0x8800ff, SCALE: 0.15 },
            SENSOR: { TYPE: 'SENSOR', COLOR: 0x00ffff, SCALE: 0.15 }
        },
        // 지도 관련 세부 설정
        MAP: {
            COLORS: {
                WALL: '#444444',
                ROAD: '#222222',
                PLAYER: '#00ff00',
                MONSTER: '#ff3333',
                ENTRANCE: '#ffff00',
                EXIT: '#0000ff'
            },
            ROTATION_FOLLOW: true
        },
        // 망치 관련 세부 설정
        HAMMER: {
            CAN_BREAK_BOUNDARY: false,
            CAN_BREAK_THICK_WALLS: false
        },
        // 함정 관련 세부 설정
        TRAP: {
            FREEZE_DURATION: 3.0,
            TRIGGER_RADIUS: 0.1
        },
        // 텔레포트 관련 세부 설정
        TELEPORT: {
            RADIUS: 3
        },
        // 점프 강화 관련 설정
        JUMP_BOOST: {
            MULTIPLIER: 1
        },
        // 사운드 센서 관련 설정
        SENSOR: {
            DURATION: 30.0,
            RECHARGE_DELAY: 3.0,
            RECHARGE_DURATION: 5.0,
            FLICKER_THRESHOLD: 3.0,
            COLOR: 0x00ffff
        },
        // 손전등 관련 세부 설정
        FLASHLIGHT: {
            DURATION: 30.0,
            RECHARGE_DURATION: 30.0,
            RECHARGE_DELAY: 3.0,
            INTENSITY: 50,
            DISTANCE: 5,
            ANGLE: Math.PI / 7,
            PENUMBRA: 1,
            FLICKER_THRESHOLD: 3.0,
            COLOR: 0xffffff,
            FOG_TRANSITION_SPEED: 8.0,
            POSITION_OFFSET: { x: 0, y: 0.5, z: 0 },
            TARGET_OFFSET: { x: 0, y: 0.5, z: -1 },
            MOVEMENT: {
                LAG_SPEED: 15.0,
                SWAY_AMPLITUDE: 0.03,
                SWAY_FREQUENCY: 1.5
            }
        }
    },

    // [4] 스테이지 성장 설정 (Stage Settings)
    STAGE: {
        INITIAL_LEVEL: 1,
        INITIAL_SIZE: 5,
        SIZE_INCREMENT: 1,
        MAX_SIZE: 31
    },

    // [5] 몬스터 설정 (Monster Settings)
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
            SPEED: 1.5,
            MOVE_DURATION: 2,
            DETECTION_RANGE: 2,
            IDLE_SWAY_SPEED: 1,
            IDLE_SWAY_AMPLITUDE: 0.1,
            WALK_BOB_SPEED: 2,
            WALK_BOB_AMPLITUDE: 0.2,
            MODEL_SCALE: 0.3,
            COLOR: 0x77aa77,
            PATH_RECALC_INTERVAL: 1,
            PATROL_RADIUS: 3,
            PATROL_WAIT_MIN: 0.5,
            PATROL_WAIT_MAX: 2.0,
            SAFE_SPAWN_DISTANCE: 10,
            PATROL_AUDIO_MAX_DIST: 10,
            // 레벨별 속도 증가 설정
            SPEED_INCREASE_PER_LEVEL: 0.05,  // 레벨당 5% 속도 증가
            MAX_SPEED_MULTIPLIER: 2.0         // 최대 2배속까지
        }
    }
};
