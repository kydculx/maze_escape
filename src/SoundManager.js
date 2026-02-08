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

        // Web Audio API Context
        this.context = null;
        this.buffers = new Map(); // URL -> AudioBuffer
    }

    /**
     * 사용자 상호작용 후 오디오 컨텍스트 등 활성화
     */
    init() {
        if (this.initialized) return;

        // AudioContext 초기화 (브라우저 호환성)
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContext();

        this.initialized = true;
        console.log('SoundManager initialized (Audio unlocked)');

        // Context Resume (모바일 등에서 필요)
        if (this.context.state === 'suspended') {
            this.context.resume().then(() => {
                console.log('AudioContext resumed!');
            }).catch(e => console.error('AudioContext resume failed:', e));
        }

        // 대기 중이던 BGM이 있다면 재생 시도
        if (this.bgm && this.bgm.paused) {
            this.bgm.play().catch(() => { });
        }
    }

    /**
     * 오디오 파일 로드 (Web Audio API용)
     * @param {string} url 
     * @returns {Promise<AudioBuffer>}
     */
    async loadSound(url) {
        if (this.buffers.has(url)) return this.buffers.get(url);

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            this.buffers.set(url, audioBuffer);
            return audioBuffer;
        } catch (error) {
            console.error(`Failed to load sound: ${url}`, error);
            return null;
        }
    }

    /**
     * 루프 사운드 재생 (볼륨 조절용 핸들 반환)
     * @param {string} url 
     * @returns {Object} Sound Controller { setVolume(0~1), stop() }
     */
    playLoop(url, initialVolume = 0) {
        if (!this.enabled || !this.context) return null;

        const controller = {
            source: null,
            gainNode: null,
            url: url,
            isPlaying: false,
            volume: initialVolume,

            // 볼륨 설정 메서드
            setVolume: (v) => {
                controller.volume = v;
                if (controller.gainNode && controller.isPlaying) {
                    // 부드러운 볼륨 전환 (Click 방지)
                    controller.gainNode.gain.setTargetAtTime(v, this.context.currentTime, 0.1);
                }
                // 볼륨이 0이면 소스 중지 (CPU 절약) 로직은 복잡해지므로
                // 간단하게 Gain만 0으로 유지하거나, 좀비 로직에서 handle.stop()을 호출하게 유도
            },

            // 재생 시작
            play: async () => {
                if (controller.isPlaying) return;

                let buffer = this.buffers.get(url);
                if (!buffer) {
                    buffer = await this.loadSound(url);
                }
                if (!buffer) return;

                const source = this.context.createBufferSource();
                source.buffer = buffer;
                source.loop = true;

                const gainNode = this.context.createGain();
                gainNode.gain.value = controller.volume;

                source.connect(gainNode);
                gainNode.connect(this.context.destination);

                source.start(0);

                controller.source = source;
                controller.gainNode = gainNode;
                controller.isPlaying = true;
            },

            // 재생 중지
            stop: () => {
                if (controller.source) {
                    try {
                        controller.source.stop();
                    } catch (e) { }
                    controller.source.disconnect();
                    controller.source = null;
                }
                if (controller.gainNode) {
                    controller.gainNode.disconnect();
                    controller.gainNode = null;
                }
                controller.isPlaying = false;
            }
        };

        return controller;
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
    async playSFX(url, volume = 0.8) {
        if (!this.enabled) return;

        // Web Audio API가 준비되었다면 우선 사용
        if (this.context && this.initialized) {
            let buffer = this.buffers.get(url);
            if (!buffer) {
                // 캐시 없으면 로드 시도 (비동기라 즉시 재생은 안 될 수 있음 - 최초 1회 딜레이 감수)
                // 또는 그냥 기존 Audio 방식 폴백
                this._playSFXFallback(url, volume);
                // 백그라운드에서 로드해둠
                this.loadSound(url);
                return;
            }

            const source = this.context.createBufferSource();
            source.buffer = buffer;
            const gainNode = this.context.createGain();
            gainNode.gain.value = volume * this.masterVolume;

            source.connect(gainNode);
            gainNode.connect(this.context.destination);
            source.start(0);
        } else {
            this._playSFXFallback(url, volume);
        }
    }

    _playSFXFallback(url, volume) {
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
