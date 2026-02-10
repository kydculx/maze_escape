/**
 * 아이템 관련 설정
 */
export const ITEM_CONFIG = {
    SPAWN_COUNT: 20, // 매 스테이지 시작 시 생성될 아이템의 총 개수 (무작위 위치)

    // 레벨별 아이템 해금 시점 (Level Unlocks)
    UNLOCK_LEVELS: {
        FLASHLIGHT: 1,   // 시작부터 등장
        MAP: 1,          // 시작부터 등장
        SENSOR: 6,       // 레벨 6부터 등장
        ZOMBIE_DISGUISE: 6, // 레벨 6부터 등장 (가면)
        JUMP: 11,        // 레벨 11부터 등장
        HAMMER: 16,      // 레벨 16부터 등장
        TRAP: 21,        // 레벨 21부터 등장
        TELEPORT: 26     // 레벨 26부터 등장
    },

    // 아이템 종류 및 시각적 속성 정의
    TYPES: {
        JUMP: {
            TYPE: 'JUMP',
            COLOR: 0xFFFF00,  // 노란색
            SCALE: 0.18,      // 아이템 모델 크기
            CONSUMABLE: true  // 획득 시 바로 효과 적용되지 않고 인벤토리 소모품으로 분류됨
        },
        FLASHLIGHT: {
            TYPE: 'FLASHLIGHT',
            COLOR: 0xffffff,  // 흰색
            SCALE: 0.15,
            CONSUMABLE: false // 획득 즉시 장착/배터리 충전 (지속형 아이템)
        },
        MAP: {
            TYPE: 'MAP',
            COLOR: 0xffaa00,  // 주황색
            SCALE: 0.2,
            CONSUMABLE: false // 획득 즉시 미니맵 활성화 (영구/스테이지 한정)
        },
        HAMMER: {
            TYPE: 'HAMMER',
            COLOR: 0x888888,  // 회색
            SCALE: 0.2,
            CONSUMABLE: true  // 벽 파괴 시 소모
        },
        TRAP: {
            TYPE: 'TRAP',
            COLOR: 0xff0000,  // 빨간색
            SCALE: 0.2,
            CONSUMABLE: true  // 설치 시 소모
        },
        TELEPORT: {
            TYPE: 'TELEPORT',
            COLOR: 0x8800ff,  // 보라색
            SCALE: 0.2,
            CONSUMABLE: true  // 사용 시 소모
        },
        SENSOR: {
            TYPE: 'SENSOR',
            COLOR: 0x00ffff,  // 청록색
            SCALE: 0.2,
            CONSUMABLE: false // 획득 즉시 장착 (지속형)
        },
        ZOMBIE_DISGUISE: {
            TYPE: 'ZOMBIE_DISGUISE',
            COLOR: 0x44aa44,  // 짙은 녹색
            SCALE: 0.2,
            CONSUMABLE: true  // 사용 시 일정 시간 변신 (가면 착용)
        }
    },
    // 지도(Map) 관련 세부 설정
    MAP: {
        COLORS: {
            WALL: '#444444',      // 미니맵 벽 색상
            ROAD: '#222222',      // 미니맵 길 색상
            PLAYER: '#00ff00',    // 플레이어 마커 색상
            MONSTER: '#ff3333',   // 몬스터 마커 색상
            ENTRANCE: '#ffff00',  // 입구 마커 색상
            EXIT: '#0000ff'       // 출구 마커 색상
        },
        ROTATION_FOLLOW: true     // 플레이어 회전에 따라 미니맵 회전 여부
    },
    // 망치(Hammer) 관련 세부 설정
    HAMMER: {
        CAN_BREAK_BOUNDARY: false,   // 맵 가장자리 벽 파괴 허용 여부 (안됨)
        CAN_BREAK_THICK_WALLS: false // 두꺼운 벽(큰 기둥 등) 파괴 허용 여부
    },
    // 함정(Trap) 관련 세부 설정
    TRAP: {
        FREEZE_DURATION: 3.0,     // 몬스터가 함정을 밟았을 때 얼어있는 시간(초)
        TRIGGER_RADIUS: 0.1       // 함정 발동 반경
    },
    // 텔레포트(Teleport) 관련 세부 설정
    TELEPORT: {
        RADIUS: 3                 // 텔레포트 가능 최대 반경 (칸 단위)
    },
    // 점프 강화(Jump Potion) 관련 설정
    JUMP_BOOST: {
        MULTIPLIER: 1             // (현재 미사용 가능성 있음, 1.5배 등으로 설정 시 점프 높이 증가)
    },
    // 사운드 센서(Sound Sensor) 관련 설정
    SENSOR: {
        DURATION: 30.0,           // 센서 배터리 지속 시간 (초)
        RECHARGE_DELAY: 3.0,      // 사용 중단 후 충전 시작까지 걸리는 시간
        RECHARGE_DURATION: 5.0,   // 완전 방전에서 완충까지 걸리는 시간 (고속 충전)
        FLICKER_THRESHOLD: 3.0,   // 배터리 부족 경고 시점 (초)
        COLOR: 0x00ffff           // 센서 UI 색상
    },
    // 가면(Mask) 관련 설정 (기존 좀비 위장)
    ZOMBIE_DISGUISE: {
        DURATION: 10.0,           // 위장 지속 시간 (초)
        SPEED_FACTOR: 0.5,        // 가면 착용 중 이동 속도 패널티 (50% 속도로 느려짐 - 좀비 흉내)
        COLOR: 0x44aa44           // 위장 효과 오버레이 색상
    },
    // 손전등(Flashlight) 관련 세부 설정
    FLASHLIGHT: {
        DURATION: 30.0,           // 배터리 지속 시간 (초)
        RECHARGE_DURATION: 30.0,  // 완충 시간
        RECHARGE_DELAY: 3.0,      // 충전 대기 시간
        INTENSITY: 50,            // 조명 강도
        DISTANCE: 5,              // 조명 도달 거리
        ANGLE: Math.PI / 7,       // 조명 퍼짐 각도
        PENUMBRA: 1,              // 조명 가장자리 흐림 정도
        FLICKER_THRESHOLD: 3.0,   // 배터리 부족 시 깜빡임 시작 시점
        COLOR: 0xffffff,          // 조명 색상
        FOG_TRANSITION_SPEED: 8.0, // 안개 농도 변화 속도 (켜고 끌 때)
        POSITION_OFFSET: { x: 0, y: 0.5, z: 0 }, // 플레이어 기준 조명 위치
        TARGET_OFFSET: { x: 0, y: 0.5, z: -1 },  // 조명이 비추는 목표 지점 (정면)
        MOVEMENT: {
            LAG_SPEED: 15.0,      // 손전등이 시선을 따라오는 속도 (낮을수록 지연 효과 큼)
            SWAY_AMPLITUDE: 0.03, // 손떨림 효과 크기
            SWAY_FREQUENCY: 1.5   // 손떨림 속도
        }
    }
};
