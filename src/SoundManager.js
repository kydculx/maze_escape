/**
 * 게임 사운드를 총괄 관리하는 클래스
 */
import { CONFIG } from './Config.js';
import { ASSETS } from './Assets.js';
import { SaveManager } from './SaveManager.js';

export class SoundManager {
    constructor() {
        this.bgm = null;
        this.sfxMap = new Map();
        this.masterVolume = 1.0;

        // 저장된 볼륨 설정 로드
        const savedSettings = SaveManager.loadSettings();
        console.log('[SoundManager] Loaded settings from localStorage:', savedSettings);
        this.bgmVolume = savedSettings.bgmVolume;
        this.sfxVolume = savedSettings.sfxVolume;
        console.log('[SoundManager] BGM Volume:', this.bgmVolume, 'SFX Volume:', this.sfxVolume);

        this.enabled = true;
        this.initialized = false;
        this.currentBGMBaseVolume = 0.5; // 현재 재생 중인 BGM의 기본 볼륨 저장

        // Web Audio API Context
        this.context = null;
        this.buffers = new Map(); // URL -> AudioBuffer
        this.activeLoops = new Set(); // Track all active loop controllers
        this.allAudioElements = new Set(); // Track all HTMLAudioElement instances
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

        // 대기 중이던 루프(빗소리 등)가 있다면 재생 시도
        for (const controller of this.activeLoops) {
            if (controller.wasPlayingBeforePause && !controller.isPlaying) {
                controller.play();
                controller.wasPlayingBeforePause = false;
            }
        }
    }

    /**
     * 오디오 파일 로드 (Web Audio API용)
     * @param {string} url 
     * @returns {Promise<AudioBuffer>}
     */
    async loadSound(url) {
        if (this.buffers.has(url)) return this.buffers.get(url);
        console.log(`[SoundManager] Loading sound: ${url}`);

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
    playLoop(url, initialVolume = 0, autoPlay = false) {
        if (!this.enabled) return null;
        if (!this.initialized) this.init(); // 상호작용 내 호출 보장

        const controller = {
            source: null,
            gainNode: null,
            url: url,
            isPlaying: false,
            isLoading: false,
            volume: initialVolume,
            shouldStop: false,
            wasPlayingBeforePause: false, // 재개 및 초기화용 플래그

            // 볼륨 설정 메서드
            setVolume: (v) => {
                controller.volume = v;
                if (controller.gainNode && controller.isPlaying) {
                    try {
                        // 부드러운 볼륨 전환 (Click 방지)
                        controller.gainNode.gain.setTargetAtTime(v * this.sfxVolume * this.masterVolume, this.context.currentTime, 0.1);
                    } catch (e) {
                        // Context가 닫혔거나 에러 발생 시 무시
                    }
                }
            },

            // 재생 시작 (비동기)
            play: async () => {
                if (controller.isPlaying || controller.isLoading) return;

                // Context가 아직 없다면 재생 의사만 밝히고 트래킹에 추가 (init/resume에서 처리)
                if (!this.context) {
                    console.log(`[SoundManager] Context not ready. Queuing loop: ${url}`);
                    controller.wasPlayingBeforePause = true;
                    this.activeLoops.add(controller);
                    return;
                }

                controller.isLoading = true;
                controller.shouldStop = false;

                let buffer = this.buffers.get(url);
                if (!buffer) {
                    buffer = await this.loadSound(url);
                }

                // 로딩 완료 후 상태 확인 (그 사이에 stop 요청이 있었는지)
                controller.isLoading = false;
                if (controller.shouldStop || !buffer) return;

                const source = this.context.createBufferSource();
                source.buffer = buffer;
                source.loop = true;

                const gainNode = this.context.createGain();
                // 초기 볼륨 설정 (SFX 볼륨 및 마스터 볼륨 적용)
                gainNode.gain.value = controller.volume * this.sfxVolume * this.masterVolume;

                source.connect(gainNode);
                gainNode.connect(this.context.destination);

                source.start(0);

                controller.source = source;
                controller.gainNode = gainNode;
                controller.isPlaying = true;
                this.activeLoops.add(controller);
            },

            // 재생 중지
            stop: () => {
                // 로딩 중이었다면 정지 플래그 설정
                if (controller.isLoading) {
                    controller.shouldStop = true;
                }

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
                this.activeLoops.delete(controller);
            }
        };

        if (autoPlay) {
            controller.play();
        }

        return controller;
    }

    /**
     * 배경음악 설정 및 재생
     * @param {string} url - 오디오 파일 경로
     * @param {number} volume - 초기 볼륨 (0~1)
     */
    playBGM(url, volume = 0.5) {
        if (!this.enabled) return;
        if (!this.initialized) this.init(); // 상호작용 내 호출 보장

        // 기존 BGM 중단
        if (this.bgm) {
            this.bgm.pause();
            this.bgm = null;
        }

        this.bgm = new Audio(url);
        this.allAudioElements.add(this.bgm);
        this.bgm.loop = true;
        this.currentBGMBaseVolume = volume; // 기본 볼륨 저장
        this.bgm.volume = volume * this.bgmVolume * this.masterVolume;

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
            this.bgm = null; // Clear object to prevent re-triggers
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
            gainNode.gain.value = volume * this.sfxVolume * this.masterVolume;

            source.connect(gainNode);
            gainNode.connect(this.context.destination);
            source.start(0);
        } else {
            // 사용자 인터랙션이 없어 초기화되지 않았다면 오디오 자동 재생 정책으로 차단됨
            if (!this.initialized) return;
            this._playSFXFallback(url, volume);
        }
    }

    _playSFXFallback(url, volume) {
        const sfx = new Audio(url);
        this.allAudioElements.add(sfx);
        sfx.volume = volume * this.sfxVolume * this.masterVolume;
        sfx.play().catch(error => {
            console.warn('SFX play failed:', error);
        }).finally(() => {
            sfx.addEventListener('ended', () => {
                this.allAudioElements.delete(sfx);
            }, { once: true });
        });
    }

    /**
     * 전체 마스터 볼륨 설정
     * @param {number} volume - 볼륨 (0~1)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this._updateBGMVolume();
    }

    /**
     * BGM 볼륨 설정 (0~1)
     */
    setBGMVolume(volume) {
        this.bgmVolume = Math.max(0, Math.min(1, volume));
        this._updateBGMVolume();
        // 볼륨 변경 시 저장
        console.log('[SoundManager] Saving BGM volume:', this.bgmVolume);
        SaveManager.saveSettings(this.bgmVolume, this.sfxVolume);
    }

    /**
     * SFX 볼륨 설정 (0~1)
     */
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        // 볼륨 변경 시 저장
        console.log('[SoundManager] Saving SFX volume:', this.sfxVolume);
        SaveManager.saveSettings(this.bgmVolume, this.sfxVolume);
    }

    /**
     * 현재 재생 중인 BGM 볼륨 업데이트
     */
    _updateBGMVolume() {
        if (this.bgm) {
            // 저장된 기본 볼륨 * BGM 볼륨 설정 * 마스터 볼륨
            this.bgm.volume = this.currentBGMBaseVolume * this.bgmVolume * this.masterVolume;
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

    /**
     * 일시정지: BGM과 모든 '루프 가동 중인 소리'를 일시정지
     * 컨텍스트를 suspend하지 않으므로 버튼음 등의 SFX는 계속 작동함
     */
    pauseAll() {
        console.log(`[SoundManager] Pausing BGM and ${this.activeLoops.size} loops.`);

        // 1. BGM 일시정지 (내장 HTML Audio)
        if (this.bgm && !this.bgm.paused) {
            this.bgm.pause();
            this.bgm.wasPlayingBeforePause = true;
        }

        // 2. 모든 Web Audio 루프 일시정지 (상태 저장 후 소스만 중지)
        // controller.stop()을 직접 부르면 activeLoops에서 삭제되므로 여기서 수동 중지
        for (const controller of this.activeLoops) {
            if (controller.isPlaying) {
                controller.wasPlayingBeforePause = true;

                // 소스 중단 로직 (isPlaying=false는 유지하되 세트에서는 지우지 않음)
                if (controller.source) {
                    try { controller.source.stop(); } catch (e) { }
                    controller.source.disconnect();
                    controller.source = null;
                }
                if (controller.gainNode) {
                    controller.gainNode.disconnect();
                    controller.gainNode = null;
                }
                controller.isPlaying = false;
            }
        }
    }

    /**
     * 재개: 사운드 다시 재생
     */
    /**
     * 재개: BGM과 이전에 재생 중이던 루프 사운드 복구
     */
    resumeAll() {
        console.log('[SoundManager] Resuming sounds...');

        // 1. 컨텍스트 확인 (상호작용 유도용)
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }

        // 2. BGM 복구
        if (this.bgm && this.bgm.wasPlayingBeforePause) {
            this.bgm.play().catch(() => { });
            this.bgm.wasPlayingBeforePause = false;
        }

        // 3. 루프 사운드 복구
        for (const controller of this.activeLoops) {
            if (controller.wasPlayingBeforePause) {
                controller.play();
                controller.wasPlayingBeforePause = false;
            }
        }
    }

    /**
     * 모든 루프 사운드(비, 몬스터 등)만 정지
     */
    stopAllLoops() {
        console.log(`[SoundManager] Stopping all loop sounds. Count: ${this.activeLoops.size}`);
        for (const controller of this.activeLoops) {
            try {
                controller.stop();
            } catch (e) { }
        }
        this.activeLoops.clear();
    }

    /**
     * 모든 사운드 강제 중지 (장면 전환 시 안전장치)
     * 컨텍스트를 서스펜드하지 않아 버튼음 등은 계속 작동 가능하게 함
     */
    stopAll() {
        console.log(`[SoundManager] Stopping all sounds (BGM + Loops).`);
        this.stopBGM();
        this.stopAllLoops();
    }
}
