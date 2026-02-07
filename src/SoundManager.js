/**
 * 게임 사운드를 총괄 관리하는 클래스
 */
export class SoundManager {
    constructor() {
        this.bgm = null;
        this.sfxMap = new Map();
        this.masterVolume = 1.0;
        this.enabled = true;
        this.initialized = false;
    }

    /**
     * 사용자 상호작용 후 오디오 컨텍스트 등 활성화
     */
    init() {
        if (this.initialized) return;
        this.initialized = true;
        console.log('SoundManager initialized (Audio unlocked)');

        // 대기 중이던 BGM이 있다면 재생 시도
        if (this.bgm && this.bgm.paused) {
            this.bgm.play().catch(() => { });
        }
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

        // 이미 상호작용이 있었다면 바로 재생, 아니면 대기 (init()에서 재생됨)
        if (this.initialized) {
            this.bgm.play().catch(error => {
                console.warn('BGM play failed:', error);
            });
        }
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
