/**
 * 게임 사운드를 총괄 관리하는 클래스
 */
export class SoundManager {
    constructor() {
        this.bgm = null;
        this.sfxMap = new Map();
        this.masterVolume = 1.0;
        this.enabled = true;
    }

    /**
     * 배경음악 설정 및 재생
     * @param {string} url - 오디오 파일 경로
     * @param {number} volume - 초기 볼륨 (0~1)
     */
    playBGM(url, volume = 0.5) {
        if (!this.enabled) return;

        // 기존 BGM 중단
        if (this.bgm) {
            this.bgm.pause();
            this.bgm = null;
        }

        this.bgm = new Audio(url);
        this.bgm.loop = true;
        this.bgm.volume = volume * this.masterVolume;

        // 브라우저 정책상 사용자 상호작용 후 재생 가능하므로 에러 핸들링
        this.bgm.play().catch(error => {
            console.warn('BGM play failed (User interaction might be needed):', error);
        });
    }

    /**
     * 배경음악 중지
     */
    stopBGM() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0;
        }
    }

    /**
     * 효과음(SFX) 즉시 재생
     * @param {string} url - 오디오 파일 경로
     * @param {number} volume - 볼륨 (0~1)
     */
    playSFX(url, volume = 0.8) {
        if (!this.enabled) return;

        const sfx = new Audio(url);
        sfx.volume = volume * this.masterVolume;
        sfx.play().catch(error => {
            console.warn('SFX play failed:', error);
        });
    }

    /**
     * 전체 마스터 볼륨 설정
     * @param {number} volume - 볼륨 (0~1)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.bgm) {
            this.bgm.volume = 0.5 * this.masterVolume; // 기존 BGM 볼륨 업데이트 예시
        }
    }

    /**
     * 모든 사운드 활성화/비활성화
     * @param {boolean} value
     */
    setEnabled(value) {
        this.enabled = value;
        if (!value) {
            this.stopBGM();
        }
    }
}
