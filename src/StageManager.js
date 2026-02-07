import { CONFIG } from './Config.js';

/**
 * 게임 스테이지와 난이도 성장을 관리하는 클래스
 */
export class StageManager {
    constructor() {
        this.level = CONFIG.STAGE.INITIAL_LEVEL;
        this.mazeSize = CONFIG.STAGE.INITIAL_SIZE;
        this.stageTime = 0;
        this.moveCount = 0;
    }

    /**
     * 다음 스테이지로 진행
     */
    nextStage() {
        this.level++;
        // 스테이지가 올라갈수록 미로 크기 증가 (최대 제한까지)
        if (this.mazeSize < CONFIG.STAGE.MAX_SIZE) {
            this.mazeSize += CONFIG.STAGE.SIZE_INCREMENT;
        }
        this.resetStats();

        console.log(`Advancing to Stage ${this.level} (Size: ${this.mazeSize})`);
        return {
            level: this.level,
            mazeSize: this.mazeSize
        };
    }

    /**
     * 스테이지 통계 초기화
     */
    resetStats() {
        this.stageTime = 0;
        this.moveCount = 0;
        this.isStageActive = false;
    }

    /**
     * 게임 리셋 (완전 처음부터)
     */
    reset() {
        this.level = CONFIG.STAGE.INITIAL_LEVEL;
        this.mazeSize = CONFIG.STAGE.INITIAL_SIZE;
        this.resetStats();
    }

    /**
     * 새 스테이지 시작 시 플레이어 상태 조정
     * (지도는 리셋, 손전등은 유지 등)
     */
    preparePlayerForNextStage(player) {
        if (!player) return;

        // 지도는 현재 스테이지 한정이므로 초기화
        player.inventory.hasMap = false;

        // 망치는 소모성이지만 획득한 것은 유지 (운반 개념)
        // 만약 '스테이지마다 리셋'을 원하시면 여기서 hammerCount = 0 처리

        // 손전등은 영구 보유이므로 유지 (충전량도 그대로 유지)
    }
}
