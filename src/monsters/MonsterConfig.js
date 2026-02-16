/**
 * 몬스터 관련 설정
 */
export const MONSTER_CONFIG = {
    TYPES: {
        ZOMBIE: 'ZOMBIE',
        WOLF_ZOMBIE: 'WOLF_ZOMBIE'
    },
    STATES: {
        IDLE: 'IDLE',
        MOVE: 'MOVE',
        ATTACK: 'ATTACK',
        HURT: 'HURT',
        DIE: 'DIE'
    },
    // 스폰 규칙 설정
    SPAWN_RULES: {
        MAX_MONSTER_COUNT: 15,            // 최대 마릿수
        COUNT_CALC_DIVISOR: 3,            // 레벨당 개수 계산용 (level-1 / divisor)
        BASE_COUNT: 1                     // 기본 시작 개수
    },
    // 일반 좀비 설정
    ZOMBIE: {
        SPEED: 0.5,                       // 기본 이동 속도 (타일/초)
        DETECTION_RANGE: 3,              // 플레이어 감지 범위 (타일 거리 아님, 월드 유닛)
        IDLE_SWAY_SPEED: 2,               // 대기 중 좌우 흔들림 속도
        IDLE_SWAY_AMPLITUDE: 5,         // 대기 중 좌우 흔들림 크기
        WALK_BOB_SPEED: 20,                // 걷는 애니메이션 바운스 속도
        WALK_BOB_AMPLITUDE: 0.5,          // 걷는 애니메이션 바운스 크기
        MODEL_SCALE: 0.35,                 // 모델 크기 배율
        COLOR: 0x77aa77,                  // 모델 기본 색상 (녹색 계열)
        PATH_RECALC_INTERVAL: 0.5,          // 경로 재계산 간격 (초 단위, 낮을수록 똑똑하지만 성능 부하)
        PATROL_RADIUS: 2,                 // 배회 모드 시 이동 반경
        PATROL_WAIT_MIN: 0.5,             // 배회 지점 도착 후 최소 대기 시간 (초)
        PATROL_WAIT_MAX: 1.0,             // 배회 지점 도착 후 최대 대기 시간 (초)
        SAFE_SPAWN_DISTANCE: 6,          // 플레이어로부터의 안전 생성 거리 (이 거리 밖에서만 생성)
        PATROL_AUDIO_MAX_DIST: 10,        // 배회 사운드가 들리는 최대 거리
        // 레벨별 난이도 조정
        ATTACK_RANGE: 0.8,                // 공격 사거리 (월드 유닛)
        ATTACK_COOLDOWN: 2.0,             // 공격 쿨다운 (초)
        DAMAGE: 10,                        // 공격력
        SPAWN_MIN_STAGE: 1                // 스테이지 1 이상에서 등장
    },
    // 울프 좀비 (강화형) 설정
    WOLF_ZOMBIE: {
        SPEED: 0.5,                       // 좀비보다 빠름
        DETECTION_RANGE: 4,              // 플레이어 감지 범위
        IDLE_SWAY_SPEED: 2,             // 대기 동작도 더 빠름
        IDLE_SWAY_AMPLITUDE: 5,
        WALK_BOB_SPEED: 20,                // 걷는 동작이 더 역동적
        WALK_BOB_AMPLITUDE: 0.5,
        MODEL_SCALE: 0.4,                // 덩치가 약간 더 큼
        COLOR: 0xaa4444,                  // 붉은색 계열 (위협적)
        PATH_RECALC_INTERVAL: 0.5,        // 더 자주 경로를 탐색하여 끈질기게 추격
        PATROL_RADIUS: 2,                 // 더 넓은 구역을 배회
        PATROL_WAIT_MIN: 0.5,             // 대기 시간이 짧음 (공격적)
        PATROL_WAIT_MAX: 1.0,
        SAFE_SPAWN_DISTANCE: 6,
        PATROL_AUDIO_MAX_DIST: 10,        // 소리가 더 멀리까지 들림
        SPAWN_MIN_STAGE: 11,               // 스테이지 11 이상에서만 등장
        // 레벨별 난이도 조정
        ATTACK_RANGE: 0.8,               // 공격 사거리
        ATTACK_COOLDOWN: 1.5,             // 공격 쿨다운 (좀비보다 빠름)
        DAMAGE: 15                        // 공격력 (강화형)
    }
};
