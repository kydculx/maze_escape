/**
 * 플레이어 행동 상태 정의
 */
export const PLAYER_ACTION_STATES = {
    IDLE: 'IDLE',
    MOVE: 'MOVE',
    JUMP: 'JUMP'
};

/**
 * 플레이어 관련 설정
 */
export const PLAYER_CONFIG = {
    MOVE_DURATION: 0.7,       // 한 칸 이동 시 소요되는 시간 (초)
    ROTATION_DURATION: 0.3,   // 90도 회전 시 소요되는 시간 (초)
    PLAYER_RADIUS: 0.15,      // 플레이어 충돌 판정 반지름
    MAX_HEALTH: 100,          // 최대 체력
    DAMAGE_COOLDOWN: 1.0,     // 무적 시간 (대미지 입은 후 다시 입을 때까지의 시간)
    REGEN_DELAY: 3.0,         // 체력 회복 시작 대기 시간 (초)
    REGEN_RATE: 5.0,          // 초당 체력 회복량
    JUMP_HEIGHT: 5.0,         // 기본 점프 높이
    JUMP_DURATION: 1.5,       // 점프 전체 사이클 시간 (초)
    // 점프 시 시각 효과 설정
    JUMP_EFFECT: {
        MAX_EXTRA_VISIBILITY: 10,  // 점프 시 추가로 확보되는 안개 가시거리
        VISIBILITY_THRESHOLD: 0.50, // 가시거리가 넓어지기 시작하는 높이 임계값 (0~1)
        SPECIAL_MULTIPLIER: 1.5,   // 아이템 점프 시 높이 배율 추가
        FIRST_PERSON_TILT: 1.2,    // 1인칭 점프 시 아래를 내려다보는 강도
        BOB_FREQUENCY: 12,        // 이동 시 상하 흔들림 속도
        BOB_AMPLITUDE: 0.05,      // 이동 시 상하 흔들림 크기
        IDLE_SWAY_FREQUENCY: 0.8, // 대기 시 도리도리 속도 (더 천천히)
        IDLE_SWAY_AMPLITUDE: 0.02, // 대기 시 도리도리 강도 (더 좁은 반경으로 축소)
        IDLE_SWAY_DELAY: 3.0       // 대기 후 효과 시작까지의 지연 시간 (초)
    },

    // 카메라 설정 (FOV, 렌더링 거리, 시점 높이)
    CAMERA: {
        FOV: 75,                      // 시야각 (Field of View, 단위: 도)
        NEAR: 0.1,                    // 렌더링 시작 최소 거리 (이보다 가까우면 잘림)
        FAR: 10,                      // 렌더링 끝 최대 거리 (이보다 멀면 안 보임)
        FIRST_PERSON_HEIGHT: 0.5      // 1인칭 시점의 눈높이 (Y축 좌표, 바닥 기준)
    }
};
