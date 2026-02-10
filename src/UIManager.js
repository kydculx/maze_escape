import { CONFIG } from './Config.js';

/**
 * 게임 내 UI(HUD, 버튼 등)를 관리하는 클래스
 */
export class UIManager {
    constructor(player, mazeGen, stageManager) {
        this.player = player;
        this.mazeGen = mazeGen;
        this.stageManager = stageManager;

        // UI 요소 캐싱
        this.elements = {
            stage: document.querySelector('#hud-stage .count'),
            hammer: document.getElementById('use-hammer-btn'),
            jump: document.getElementById('use-jump-btn'),
            flashlight: document.getElementById('use-flashlight-btn'),
            minimap: document.getElementById('minimap-container'),
            map: document.getElementById('random-map-btn'),
            trap: document.getElementById('use-trap-btn'),
            teleport: document.getElementById('use-teleport-btn'),
            disguise: document.getElementById('use-disguise-btn'),
            sensor: document.getElementById('use-sensor-btn'), // Added sensor element
            fullscreen: document.getElementById('fullscreen-btn'),
            prevStage: document.getElementById('prev-stage-btn'),
            nextStage: document.getElementById('next-stage-btn'),
            // Menu elements
            menuBtn: document.getElementById('menu-btn'),
            menuPopup: document.getElementById('ingame-menu-popup'),
            resumeBtn: document.getElementById('close-menu-btn'),
            restartBtn: document.getElementById('restart-btn'),
            mainMenuBtn: document.getElementById('main-menu-btn'),
            disguiseOverlay: document.getElementById('disguise-overlay'),
            // Settings elements
            settingsPopup: document.getElementById('settings-popup'),
            closeSettingsBtn: document.getElementById('close-settings-btn'),
            settingsOkBtn: document.getElementById('settings-ok-btn'),
            bgmSlider: document.getElementById('bgm-volume-slider'),
            sfxSlider: document.getElementById('sfx-volume-slider'),
            bgmVal: document.getElementById('bgm-volume-val'),
            sfxVal: document.getElementById('sfx-volume-val')
        };


    }

    /**
     * 전체 UI 동기화
     */
    updateAll() {
        this.updateHUD();
        this.updateItemButtons();
    }

    /**
     * 상단 정보 및 좌표 표시 갱신
     */
    updateHUD() {
        // 1. 스테이지 표시
        // 1. 스테이지 표시 및 버튼 상태
        if (this.elements.stage) this.elements.stage.textContent = this.stageManager.level;

        if (this.elements.prevStage) {
            this.elements.prevStage.disabled = this.stageManager.level <= 1;
        }

        // 5. 손전등 배터리 바 업데이트
        const flBtn = document.getElementById('use-flashlight-btn');
        if (flBtn) {
            if (this.player.inventory.hasFlashlight) {
                flBtn.classList.remove('locked');
                if (this.player.isFlashlightOn) flBtn.classList.add('active');
                else flBtn.classList.remove('active');

                // 배터리 바
                const bar = flBtn.querySelector('.battery-bar-fill');
                if (bar) {
                    const ratio = this.player.flashlightTimer / CONFIG.ITEMS.FLASHLIGHT.DURATION;
                    // bar.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
                    bar.style.height = `${Math.max(0, Math.min(100, ratio * 100))}%`;

                    // 색상 변경 (부족하면 빨강)
                    if (ratio < 0.2) bar.style.backgroundColor = '#ff3333';
                    else bar.style.backgroundColor = '#00ff00';
                }
            } else {
                flBtn.classList.add('locked');
                flBtn.classList.remove('active');
            }
        }

        // 6. 사운드 센서 배터리 바 업데이트
        const sensorBtn = document.getElementById('use-sensor-btn');
        if (sensorBtn) {
            if (this.player.inventory.hasSensor) {
                sensorBtn.classList.remove('locked');
                if (this.player.isSensorOn) sensorBtn.classList.add('active');
                else sensorBtn.classList.remove('active');

                // 배터리 바
                const bar = sensorBtn.querySelector('.battery-bar-fill');
                if (bar) {
                    const ratio = this.player.sensorTimer / CONFIG.ITEMS.SENSOR.DURATION;
                    // bar.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
                    bar.style.height = `${Math.max(0, Math.min(100, ratio * 100))}%`;

                    if (ratio < 0.2) bar.style.backgroundColor = '#ff3333';
                    else bar.style.backgroundColor = '#00ff00'; // 손전등과 동일한 녹색
                }
            } else {
                sensorBtn.classList.add('locked');
                sensorBtn.classList.remove('active');
            }
        }
        // 4. 스테이지 시간 및 이동 수 표시
        const timeEl = document.getElementById('stat-time');
        const movesEl = document.getElementById('stat-moves');

        if (timeEl) {
            const totalSeconds = Math.floor(this.stageManager.stageTime);
            const m = Math.floor(totalSeconds / 60);
            const s = totalSeconds % 60;
            timeEl.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        if (movesEl) {
            movesEl.textContent = this.stageManager.moveCount;
        }

        // 5. 미니맵 가시성
        if (this.elements.minimap) {
            this.elements.minimap.style.display = this.player.inventory.hasMap ? 'block' : 'none';
        }

        // 6. 좀비 위장 오버레이
        if (this.elements.disguiseOverlay) {
            this.elements.disguiseOverlay.classList.toggle('active', this.player.isDisguised);
        }
    }

    /**
     * 메뉴 토글
     */
    toggleMenu() {
        if (this.elements.menuPopup) {
            const isHidden = this.elements.menuPopup.classList.contains('hidden');
            if (isHidden) this.showMenu();
            else this.hideMenu();
        }
    }

    /**
     * 일시정지/재개 콜백 등록
     */
    registerPauseCallbacks(onPause, onResume) {
        this.onPause = onPause;
        this.onResume = onResume;
    }

    showMenu() {
        if (this.elements.menuPopup) {
            this.elements.menuPopup.classList.remove('hidden');
            if (this.onPause) this.onPause();
        }
    }

    hideMenu() {
        if (this.elements.menuPopup) {
            this.elements.menuPopup.classList.add('hidden');
            if (this.onResume) this.onResume();
        }
    }

    /**
     * 설정 메뉴 초기화
     */
    initSettings(soundManager) {
        if (!this.elements.settingsPopup) return;

        // 현재 볼륨 값으로 슬라이더 초기화
        const currentBGM = Math.round(soundManager.bgmVolume * 100);
        const currentSFX = Math.round(soundManager.sfxVolume * 100);

        this.elements.bgmSlider.value = currentBGM;
        this.elements.bgmVal.textContent = `${currentBGM}%`;
        this.elements.sfxSlider.value = currentSFX;
        this.elements.sfxVal.textContent = `${currentSFX}%`;

        console.log('[UIManager] Initialized settings UI - BGM:', currentBGM, '% SFX:', currentSFX, '%');

        const updateBGM = () => {
            const val = this.elements.bgmSlider.value;
            this.elements.bgmVal.textContent = `${val}%`;
            soundManager.setBGMVolume(val / 100);
        };

        const updateSFX = () => {
            const val = this.elements.sfxSlider.value;
            this.elements.sfxVal.textContent = `${val}%`;
            soundManager.setSFXVolume(val / 100);
        };

        this.elements.bgmSlider.addEventListener('input', updateBGM);
        this.elements.sfxSlider.addEventListener('input', updateSFX);

        this._setupButton(this.elements.closeSettingsBtn, () => this.hideSettings());
        this._setupButton(this.elements.settingsOkBtn, () => {
            soundManager.playSFX(CONFIG.AUDIO.CLICK_SFX_URL);
            this.hideSettings();
        });
    }

    showSettings() {
        if (this.elements.settingsPopup) {
            this.elements.settingsPopup.classList.remove('hidden');
            this.elements.settingsPopup.style.display = 'flex';
        }
    }

    hideSettings() {
        if (this.elements.settingsPopup) {
            this.elements.settingsPopup.classList.add('hidden');
            this.elements.settingsPopup.style.display = 'none';
        }
    }

    /**
     * 아이템 버튼 활성/비활성 상태 갱신
     */
    updateItemButtons() {
        if (!this.player) return;

        // 망치
        if (this.elements.hammer) {
            const count = this.player.inventory.hammerCount;
            this.elements.hammer.querySelector('.count').textContent = count.toString().padStart(2, '0');
            this.elements.hammer.classList.toggle('locked', count <= 0);
        }

        // 점프
        if (this.elements.jump) {
            const count = this.player.inventory.jumpCount;
            this.elements.jump.querySelector('.count').textContent = count.toString().padStart(2, '0');
            this.elements.jump.classList.toggle('locked', count <= 0);
        }

        // 손전등
        if (this.elements.flashlight) {
            const canUse = this.player.inventory.hasFlashlight && this.player.flashlightTimer > 0;
            this.elements.flashlight.classList.toggle('locked', !canUse);
            this.elements.flashlight.classList.toggle('active', this.player.isFlashlightOn);
        }

        // 트랩
        if (this.elements.trap) {
            const count = this.player.inventory.trapCount;
            const countEl = this.elements.trap.querySelector('.count');
            if (countEl) countEl.textContent = count.toString().padStart(2, '0');
            this.elements.trap.classList.toggle('locked', count <= 0);
        }

        // 텔레포트
        if (this.elements.teleport) {
            const count = this.player.inventory.teleportCount;
            const countEl = this.elements.teleport.querySelector('.count');
            if (countEl) countEl.textContent = count.toString().padStart(2, '0');
            this.elements.teleport.classList.toggle('locked', count <= 0);
        }

        // 좀비 위장
        if (this.elements.disguise) {
            const count = this.player.inventory.disguiseCount;
            const countEl = this.elements.disguise.querySelector('.count');
            if (countEl) countEl.textContent = count.toString().padStart(2, '0');

            // 사용 중일 때 활성화 상태 표시 (깜빡임 효과 등)
            const isUsing = this.player.isDisguised;
            this.elements.disguise.classList.toggle('active', isUsing);
            this.elements.disguise.classList.toggle('locked', count <= 0 && !isUsing);
        }
    }

    /**
     * 버튼 이벤트 리스너 바인딩 (터치 대응)
     */
    /**
     * 버튼 이벤트 리스너 바인딩 (터치 대응)
     */
    bindButtons(callbacks) {
        console.log("UIManager: Binding buttons...");
        // Clear previous bindings if any
        this.unbindButtons();

        this._setupButton(this.elements.hammer, callbacks.onHammer);
        this._setupButton(this.elements.jump, callbacks.onJump);
        this._setupButton(this.elements.flashlight, callbacks.onFlashlight);
        this._setupButton(this.elements.map, callbacks.onMap);
        this._setupButton(this.elements.trap, callbacks.onTrap);
        this._setupButton(this.elements.teleport, callbacks.onTeleport);
        this._setupButton(this.elements.disguise, callbacks.onDisguise);
        this._setupButton(this.elements.sensor, callbacks.onSensor); // Added sensor binding

        const cheatBtn = document.getElementById('cheat-btn');
        this._setupButton(cheatBtn, callbacks.onCheat);

        this._setupButton(this.elements.prevStage, callbacks.onPrevStage);
        this._setupButton(this.elements.nextStage, callbacks.onNextStage); // Fixed duplicate prevStage binding

        // Menu buttons
        // Use cached elements from constructor
        this._setupButton(this.elements.restartBtn, () => {
            this.hideMenu();
            if (callbacks.onRestart) callbacks.onRestart();
        });
        this._setupButton(this.elements.mainMenuBtn, () => {
            this.hideMenu();
            if (callbacks.onMainMenu) callbacks.onMainMenu();
        });

        // Re-bind internal menu events (since unbindButtons clears everything)
        this._setupButton(this.elements.menuBtn, () => this.toggleMenu());
        this._setupButton(this.elements.resumeBtn, () => this.hideMenu());
        this._setupButton(this.elements.fullscreen, () => this.toggleFullscreen());
    }

    unbindButtons() {
        if (this._cleanupFns && this._cleanupFns.length > 0) {
            console.log(`UIManager: Unbinding ${this._cleanupFns.length} listeners...`);
            this._cleanupFns.forEach(fn => fn());
            this._cleanupFns = [];
        }
    }

    /**
     * 마우스와 터치를 모두 지원하는 버튼 바인딩 헬퍼
     */
    /**
     * 마우스와 터치를 모두 지원하는 버튼 바인딩 헬퍼
     */
    _setupButton(element, callback) {
        if (!element) return;
        if (!this._cleanupFns) this._cleanupFns = [];

        const handleAction = (e) => {
            if (callback) callback();
        };

        const onClick = (e) => {
            if (e.pointerType === 'touch') return;
            handleAction(e);
        };

        const onTouchStart = (e) => {
            if (element.classList.contains('locked')) return;
            element.classList.add('pressed');
        };

        const onTouchEnd = (e) => {
            if (element.classList.contains('locked')) return;
            element.classList.remove('pressed');
            e.preventDefault();
            handleAction(e);
        };

        const onTouchCancel = () => {
            element.classList.remove('pressed');
        };

        // Add listeners
        element.addEventListener('click', onClick);
        element.addEventListener('touchstart', onTouchStart, { passive: true });
        element.addEventListener('touchend', onTouchEnd, { passive: false });
        element.addEventListener('touchcancel', onTouchCancel);

        // Store cleanup
        this._cleanupFns.push(() => {
            element.removeEventListener('click', onClick);
            element.removeEventListener('touchstart', onTouchStart);
            element.removeEventListener('touchend', onTouchEnd);
            element.removeEventListener('touchcancel', onTouchCancel);
        });
    }

    /**
     * 사운드 방향 지시기 업데이트
     * @param {Object} dirs { top: boolean, bottom: boolean, left: boolean, right: boolean }
     */
    /**
     * 360도 레이더 업데이트
     * @param {Array} blips Array of { dx, dz, dist, rotation, maxDist }
     * @param {boolean} isActive 센서 활성화 여부
     */
    updateRadar(blips, isActive) {
        const container = document.getElementById('radar-container');
        if (!container) return;

        // 센서가 꺼져있으면 숨김
        if (!isActive) {
            container.style.display = 'none';
            return;
        }

        // 센서가 켜져있으면 항상 표시
        container.style.display = 'block';

        // 기존 블립 제거 (매 프레임 재생성 방식 - 최적화 필요 시 풀링 사용)
        const oldBlips = container.querySelectorAll('.radar-blip');
        oldBlips.forEach(el => el.remove());

        if (!blips || blips.length === 0) {
            return;
        }

        const radius = 90; // 컨테이너 반지름 (100px) - 여유분

        blips.forEach(blip => {
            // Three.js (World Space): X=Right, Z=South, Y=Up.
            // Player Rotation Y: CCW around Y axis.
            // We want to rotate the relative vector (dx, dz) by -playerRotation to align with player's forward.
            // Formula for rotating point (x, y) by theta:
            // x' = x cos(theta) - y sin(theta)
            // y' = x sin(theta) + y cos(theta)
            // Here, theta = -playerRotation.
            // Let's use the rotation formula derived from testing:
            // rx = dx * cos(rot) - dz * sin(rot)  (Maps to Screen X)
            // ry = dx * sin(rot) + dz * cos(rot)  (Maps to Screen Y)
            // Wait, let's re-verify with positive rotation (Left Turn).
            // If I turn Left 90 (rot = PI/2), North (0, -100) should be to my Right (+X).
            // cos(90)=0, sin(90)=1.
            // rx = 0*0 - (-100)*1 = 100. (Right). Correct.
            // ry = 0*1 + (-100)*0 = 0. (Center Y). Correct.

            const rot = blip.rotation;
            const rx = blip.dx * Math.cos(rot) - blip.dz * Math.sin(rot);
            const ry = blip.dx * Math.sin(rot) + blip.dz * Math.cos(rot);

            // 거리 비율 고정 (0.9) - 방향만 표시
            // 방향 벡터 정규화
            const dist = Math.sqrt(rx * rx + ry * ry);
            const normX = rx / dist;
            const normY = ry / dist;

            // 화면상 위치 (Center: 100, 100)
            const screenX = 100 + normX * (0.9 * radius);
            const screenY = 100 + normY * (0.9 * radius);

            const el = document.createElement('div');
            el.className = 'radar-blip';
            el.style.left = `${screenX}px`;
            el.style.top = `${screenY}px`;

            // 화살표 회전 (중심에서 바깥쪽으로 향하게)
            // atan2(y, x) -> 각도 (라디안)
            // 0 (Right) -> 90 deg rotation (Point Right)
            // -PI/2 (Up) -> 0 deg rotation (Point Up)
            // Formula: angle * 180 / PI + 90

            const angle = Math.atan2(normY, normX);
            const deg = (angle * 180 / Math.PI) + 90;
            el.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;

            el.style.opacity = 1.0;

            container.appendChild(el);

            // 거리가 멀면 투명도 조절 or 크기 조절 (거리는 유지하되 위치만 고정?)
            // 일단 다 선명하게 표시하거나, 거리에 따른 투명도만 남길 수도 있음.
            // "위치가 표시되면 안 되고" -> 거리 정보 숨김. 투명도도 1로 고정.
            el.style.opacity = 1.0;

            container.appendChild(el);
        });
    }
}
