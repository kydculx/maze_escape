import { CONFIG } from './Config.js';
import { ASSETS } from './Assets.js';

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
            jump: document.getElementById('use-jump-btn'),
            flashlight: document.getElementById('use-flashlight-btn'),
            minimap: document.getElementById('minimap-container'),
            map: document.getElementById('random-map-btn'),
            trap: document.getElementById('use-trap-btn'),
            c4: document.getElementById('use-c4-btn'),
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
            ingameSettingsBtn: document.getElementById('ingame-settings-btn'),
            disguiseOverlay: document.getElementById('disguise-overlay'),
            // Settings elements
            settingsPopup: document.getElementById('settings-popup'),
            closeSettingsBtn: document.getElementById('close-settings-btn'),
            settingsOkBtn: document.getElementById('settings-ok-btn'),
            bgmSlider: document.getElementById('bgm-volume-slider'),
            sfxSlider: document.getElementById('sfx-volume-slider'),
            weatherSlider: document.getElementById('weather-volume-slider'),
            bgmVal: document.getElementById('bgm-volume-val'),
            sfxVal: document.getElementById('sfx-volume-val'),
            weatherVal: document.getElementById('weather-volume-val'),
            itemActions: document.getElementById('item-actions'),
            bittenOverlay: document.getElementById('bitten-overlay'),
            healthContainer: document.getElementById('health-bar-container'),
            healthFill: document.getElementById('health-fill'),
            // Death screen elements
            deathScreen: document.getElementById('death-screen'),
            deathRestartBtn: document.getElementById('death-restart-btn'),
            deathMainMenuBtn: document.getElementById('death-main-menu-btn')
        };

        this._cleanupFns = [];
        this._lastItemOrder = ""; // Optimization: only reorder on change
    }

    /**
     * 전체 UI 동기화
     */
    updateAll(force = false) {
        this.updateHUD();
        this.updateItemButtons(force);
        this.updateHealthBar();
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
        this._updateBatteryBar(
            this.player.inventory.hasFlashlight,
            this.player.isFlashlightOn,
            this.player.flashlightTimer,
            CONFIG.ITEMS.FLASHLIGHT.DURATION,
            'use-flashlight-btn'
        );

        // 6. 사운드 센서 배터리 바 업데이트
        this._updateBatteryBar(
            this.player.inventory.hasSensor,
            this.player.isSensorOn,
            this.player.sensorTimer,
            CONFIG.ITEMS.SENSOR.DURATION,
            'use-sensor-btn'
        );
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

        // 5. 미니맵 가시성 (기본적으로 표시)
        if (this.elements.minimap) {
            this.elements.minimap.style.display = 'flex';
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
     * 사망 화면 표시
     */
    showDeathScreen() {
        if (this.elements.deathScreen) {
            this.elements.deathScreen.classList.remove('hidden');
            if (this.onPause) this.onPause(); // 게임 일시정지 트리거
        }
    }

    /**
     * 사망 화면 숨김
     */
    hideDeathScreen() {
        if (this.elements.deathScreen) {
            this.elements.deathScreen.classList.add('hidden');
            // Resume은 수동으로 제어 (다시하기 등에서)
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
        const currentWeather = Math.round(soundManager.weatherVolume * 100);

        this.elements.bgmSlider.value = currentBGM;
        this.elements.bgmVal.textContent = `${currentBGM}%`;
        this.elements.sfxSlider.value = currentSFX;
        this.elements.sfxVal.textContent = `${currentSFX}%`;
        this.elements.weatherSlider.value = currentWeather;
        this.elements.weatherVal.textContent = `${currentWeather}%`;

        console.log('[UIManager] Initialized settings UI - BGM:', currentBGM, '% SFX:', currentSFX, '% Weather:', currentWeather, '%');

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

        const updateWeather = () => {
            const val = this.elements.weatherSlider.value;
            this.elements.weatherVal.textContent = `${val}%`;
            console.log(`[UIManager] Weather volume changed to: ${val}%`); // Debug log
            soundManager.setWeatherVolume(val / 100);
        };

        this.elements.bgmSlider.addEventListener('input', updateBGM);
        this.elements.sfxSlider.addEventListener('input', updateSFX);
        this.elements.weatherSlider.addEventListener('input', updateWeather);

        this._setupButton(this.elements.closeSettingsBtn, () => this.hideSettings());
        this._setupButton(this.elements.settingsOkBtn, () => {
            soundManager.playSFX(ASSETS.AUDIO.SFX.CLICK);
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
    updateItemButtons(force = false) {
        if (!this.player) return;

        // 아이템-액션 컨테이너 표시 상태 확인
        if (this.elements.itemActions && this.elements.itemActions.style.display === 'none') {
            this.elements.itemActions.style.display = 'flex';
        }

        // 아이템 타입과 엘리먼트 매핑
        const typeToElement = {
            'C4': this.elements.c4,
            'JUMP': this.elements.jump,
            'FLASHLIGHT': this.elements.flashlight,
            'TRAP': this.elements.trap,
            'TELEPORT': this.elements.teleport,
            'ZOMBIE_DISGUISE': this.elements.disguise,
            'SENSOR': this.elements.sensor,
            'MAP_PIECE': this.elements.map // 기존 맵 버튼 연결 유지 (필요 시)
        };

        const itemOrder = this.player.inventory.itemOrder || [];
        const orderKey = itemOrder.join(',');

        // 최적화: 유의미한 변화가 있을 때만 DOM을 조작합니다. (다만 force=true면 강제로 실행)
        if (force || this._lastItemOrder !== orderKey) {
            console.log('[UIManager] Updating item HUD order:', orderKey);

            // 1. 현재 획득한 순서대로 DOM 재배치 및 가시성 설정
            itemOrder.forEach(type => {
                const el = typeToElement[type];
                if (el) {
                    this.elements.itemActions.appendChild(el);
                    el.classList.remove('hidden');
                }
            });

            // 2. 획득하지 않은 아이템은 숨김
            Object.keys(typeToElement).forEach(type => {
                if (!itemOrder.includes(type)) {
                    const el = typeToElement[type];
                    if (el) el.classList.add('hidden');
                }
            });

            this._lastItemOrder = orderKey;
        }

        // 3. 각 아이템 세부 상태 업데이트 (기존 로직)

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

        // 사운드 센서 배터리 업데이트
        if (this.elements.sensor) {
            const sensorCfg = CONFIG.ITEMS.SENSOR;
            const progress = (this.player.sensorTimer / sensorCfg.DURATION) * 100;
            const fill = this.elements.sensor.querySelector('.battery-bar-fill');
            if (fill) fill.style.height = `${progress}%`;
            this.elements.sensor.classList.toggle('active', this.player.isSensorOn);
            this.elements.sensor.classList.toggle('locked', this.player.sensorTimer <= 0);
        }

        // C4 폭탄
        if (this.elements.c4) {
            const count = this.player.inventory.c4Count;
            const countEl = this.elements.c4.querySelector('.count');
            if (countEl) countEl.textContent = count.toString().padStart(2, '0');
            this.elements.c4.classList.toggle('locked', count <= 0);
        }

        // 미니맵 표시 여부 (기본 활성)
        if (this.elements.minimap) {
            this.elements.minimap.style.display = 'flex';
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

        this._setupButton(this.elements.jump, callbacks.onJump);
        this._setupButton(this.elements.flashlight, callbacks.onFlashlight);
        this._setupButton(this.elements.map, callbacks.onMap);
        this._setupButton(this.elements.trap, callbacks.onTrap);
        this._setupButton(this.elements.teleport, callbacks.onTeleport);
        this._setupButton(this.elements.disguise, callbacks.onDisguise);
        this._setupButton(this.elements.sensor, callbacks.onSensor); // Added sensor binding
        this._setupButton(this.elements.c4, callbacks.onC4);

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
            // hideMenu()를 직접 호출하면 onResume()이 트리거되어 소리가 다시 켜짐
            // 대신 팝업만 직접 숨기고 콜백 실행
            if (this.elements.menuPopup) {
                this.elements.menuPopup.classList.add('hidden');
            }
            if (callbacks.onMainMenu) callbacks.onMainMenu();
        });

        this._setupButton(this.elements.ingameSettingsBtn, () => {
            this.showSettings();
        });

        // Re-bind internal menu events (since unbindButtons clears everything)
        this._setupButton(this.elements.menuBtn, () => this.toggleMenu());
        this._setupButton(this.elements.resumeBtn, () => this.hideMenu());
        this._setupButton(this.elements.fullscreen, () => this.toggleFullscreen());

        // Death screen buttons
        this._setupButton(this.elements.deathRestartBtn, () => {
            this.hideDeathScreen();
            if (callbacks.onRestart) callbacks.onRestart();
        });
        this._setupButton(this.elements.deathMainMenuBtn, () => {
            if (this.elements.deathScreen) {
                this.elements.deathScreen.classList.add('hidden');
            }
            if (callbacks.onMainMenu) callbacks.onMainMenu();
        });

        // ESC key support for toggling menu
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                const isSettingsOpen = !this.elements.settingsPopup.classList.contains('hidden');
                const isMenuOpen = !this.elements.menuPopup.classList.contains('hidden');
                const isHelpOpen = !document.getElementById('help-popup').classList.contains('hidden');

                // If splash or main menu, let main.js handle it
                if (document.getElementById('splash-screen').offsetParent !== null ||
                    document.getElementById('main-menu-screen').offsetParent !== null) {
                    return;
                }

                if (isHelpOpen) {
                    document.getElementById('help-popup').classList.add('hidden');
                } else if (isSettingsOpen) {
                    this.elements.settingsPopup.classList.add('hidden');
                } else {
                    this.toggleMenu();
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        this._cleanupFns.push(() => window.removeEventListener('keydown', onKeyDown));
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

        const radius = 45; // 컨테이너 반지름 (50px) - 여유분

        blips.forEach(blip => {
            // ... (rotation logic remains same)
            const rot = blip.rotation;
            const rx = blip.dx * Math.cos(rot) - blip.dz * Math.sin(rot);
            const ry = blip.dx * Math.sin(rot) + blip.dz * Math.cos(rot);

            // 거리 비율 고정 (0.9) - 방향만 표시
            const dist = Math.sqrt(rx * rx + ry * ry);
            const normX = rx / dist;
            const normY = ry / dist;

            // 화면상 위치 (Center: 50, 50)
            const screenX = 50 + normX * (0.9 * radius);
            const screenY = 50 + normY * (0.9 * radius);

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
            el.style.opacity = '1.0';

            container.appendChild(el);
        });
    }

    /**
     * 좀비에게 물렸을 때 화면 효과 실행
     */
    showBittenEffect() {
        if (!this.elements.bittenOverlay) return;

        // 기존 애니메이션 클래스 제거 후 다시 추가하여 트리거
        this.elements.bittenOverlay.classList.remove('active');
        void this.elements.bittenOverlay.offsetWidth; // Reflow 트리거
        this.elements.bittenOverlay.classList.add('active');

        // 0.5초 후 제거 (애니메이션 시간과 일치)
        setTimeout(() => {
            if (this.elements.bittenOverlay) {
                this.elements.bittenOverlay.classList.remove('active');
            }
        }, 500);
    }

    /**
     * 플레이어 체력 바 업데이트
     */
    updateHealthBar() {
        if (!this.player || !this.elements.healthFill) return;

        const healthRatio = this.player.health / this.player.maxHealth;
        const fillWidth = Math.max(0, Math.min(100, healthRatio * 100));

        this.elements.healthFill.style.width = `${fillWidth}%`;

        // 저체력 경고 (25% 이하)
        if (this.elements.healthContainer) {
            this.elements.healthContainer.classList.toggle('low-health', healthRatio <= 0.25);
        }
    }

    /**
     * 대미지 입었을 때 글리치 효과 트리거
     */
    triggerDamageEffect() {
        if (!this.elements.healthContainer) return;

        this.elements.healthContainer.classList.add('damaged');

        setTimeout(() => {
            if (this.elements.healthContainer) {
                this.elements.healthContainer.classList.remove('damaged');
            }
        }, 300);
    }

    /**
     * 인게임 HUD(체력바 등) 표시 설정
     * @param {boolean} visible 
     */
    showInGameHUD(visible) {
        if (this.elements.healthContainer) {
            this.elements.healthContainer.classList.toggle('hidden', !visible);
        }
    }

    /**
     * 아이템 버튼의 배터리 바 업데이트 (공용 헬퍼)
     */
    _updateBatteryBar(hasItem, isOn, currentTimer, maxDuration, btnId) {
        const btn = document.getElementById(btnId);
        if (!btn) return;

        if (hasItem) {
            btn.classList.remove('locked');
            if (isOn) btn.classList.add('active');
            else btn.classList.remove('active');

            const bar = btn.querySelector('.battery-bar-fill');
            if (bar) {
                const ratio = currentTimer / maxDuration;
                bar.style.height = `${Math.max(0, Math.min(100, ratio * 100))}%`;

                // 색상 변경 (부족하면 빨강)
                if (ratio < 0.2) bar.style.backgroundColor = '#ff3333';
                else bar.style.backgroundColor = '#00ff00';
            }
        } else {
            btn.classList.add('locked');
            btn.classList.remove('active');
        }
    }

    /**
     * C4 폭탄 사용 (내부 처리)
     */
    _useC4() {
        if (this.elements.c4 && this.elements.c4.classList.contains('locked')) return;

        // PlayScene의 델리게이트를 통해 처리하도록 이벤트를 발생시켜야 함
        // 현재는 bindButtons에서 callbacks.onC4로 직접 연결되어 있음
        // 만약 추가적인 UI 처리가 필요하다면 여기서 수행
    }
}
