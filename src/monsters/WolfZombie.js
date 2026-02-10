import * as THREE from 'three';
import { Monster } from './Monster.js';
import { CharacterBuilder } from '../CharacterBuilder.js';
import { CONFIG } from '../Config.js';

/**
 * 늑대 좀비 클래스 - 빠르고 공격적인 사족보행 몬스터
 */
export class WolfZombie extends Monster {
    constructor(scene, mazeGen, options = {}) {
        const wolfCfg = CONFIG.MONSTERS.WOLF_ZOMBIE;
        super(scene, mazeGen, CONFIG.MONSTERS.TYPES.WOLF_ZOMBIE, {
            color: wolfCfg.COLOR,
            scale: wolfCfg.MODEL_SCALE,
            ...options
        });

        // 레벨 기반 속도 계산
        const level = options.level || 1;
        const baseSpeed = wolfCfg.SPEED;
        const speedIncrease = wolfCfg.SPEED_INCREASE_PER_LEVEL;
        const maxMultiplier = wolfCfg.MAX_SPEED_MULTIPLIER;

        const speedMultiplier = Math.min(maxMultiplier, 1 + (level * speedIncrease));
        this.speed = baseSpeed * speedMultiplier;

        console.log(`Wolf Zombie spawned at level ${level}: speed ${this.speed.toFixed(2)}x`);

        this.sound = options.sound;
        this._initAudio();

        // Freeze 효과
        this.isFrozen = false;
        this.freezeTimer = 0;
        this.originalColor = new THREE.Color(wolfCfg.COLOR);
        this.frozenColor = new THREE.Color(0x00ffff);
    }

    _getConfig() {
        return CONFIG.MONSTERS.WOLF_ZOMBIE;
    }

    freeze(duration) {
        this.isFrozen = true;
        this.freezeTimer = duration;
        this._setBodyColor(this.frozenColor);
        this.isMovingTile = false;
        this.path = [];
    }

    _setBodyColor(color) {
        if (!this.model) return;
        this.model.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.color.copy(color);
            }
        });
    }

    _initAudio() {
        const audioCfg = CONFIG.AUDIO;
        this.patrolSFXUrl = audioCfg.WOLF_PATROL_SFX;
        this.trackSFXUrl = audioCfg.WOLF_TRACK_SFX; // 늑대 추격음이 좀비 추격음과 같게 설정되어 있던 부분 (Config 확인 필요)
        // WolfZombie는 WOLF_TRACK_SFX를 써야 함. EngineConfig.js 확인 결과 WOLF_TRACK_SFX 있음.
        // 기존 코드: this.trackSFXUrl = audioCfg.ZOMBIE_TRACK_SFX;  <-- 버그였음! 수정.
        this.attackSFXUrl = audioCfg.WOLF_ATTACK_SFX;
        this.soundCooldown = 0;

        if (this.sound) {
            this.trackSoundController = this.sound.playLoop(this.trackSFXUrl, 0);
        }
    }

    update(deltaTime, player) {
        super.update(deltaTime, player);
        this._updateAudioVolumes(deltaTime, player);
    }

    _updateAudioVolumes(deltaTime, player) {
        if (!this.trackSoundController) return;

        if (!player) return;

        const distInTiles = this.position.distanceTo(player.position) / CONFIG.MAZE.WALL_THICKNESS;
        const maxDist = this._getConfig().DETECTION_RANGE;
        const isTracking = !this.isPatrolling && this.state === CONFIG.MONSTERS.STATES.MOVE;

        let targetVolume = this._calculateVolume(distInTiles, maxDist);

        if (isTracking && targetVolume > 0) {
            if (!this.trackSoundController.isPlaying) {
                console.log(`[WolfZombie] Starting track audio. Dist: ${distInTiles.toFixed(2)}, Vol: ${targetVolume.toFixed(2)}`);
                this.trackSoundController.play();
            }
            const sfxVolume = this.sound.sfxVolume || 1.0;
            this.trackSoundController.setVolume(targetVolume * sfxVolume);
        } else {
            if (this.trackSoundController.isPlaying) {
                console.log('[WolfZombie] Stopping track audio');
                this.trackSoundController.stop();
            }
        }
    }

    _initModel(options) {
        this.model = CharacterBuilder.createWolf(options);
        this.group.add(this.model);

        this.frontLeftLeg = this.model.getObjectByName('frontLeftLeg');
        this.frontRightLeg = this.model.getObjectByName('frontRightLeg');
        this.backLeftLeg = this.model.getObjectByName('backLeftLeg');
        this.backRightLeg = this.model.getObjectByName('backRightLeg');
        this.head = this.model.getObjectByName('headGroup');
    }

    _updateAnimation(deltaTime) {
        if (!this.model || this.isFrozen) return;

        const cfg = this._getConfig();

        if (this.isMovingTile) {
            const bobSpeed = cfg.WALK_BOB_SPEED;
            const bobAmp = cfg.WALK_BOB_AMPLITUDE;

            if (this.frontLeftLeg) this.frontLeftLeg.rotation.x = Math.sin(this.animTime * bobSpeed) * bobAmp;
            if (this.frontRightLeg) this.frontRightLeg.rotation.x = -Math.sin(this.animTime * bobSpeed) * bobAmp;
            if (this.backLeftLeg) this.backLeftLeg.rotation.x = -Math.sin(this.animTime * bobSpeed) * bobAmp;
            if (this.backRightLeg) this.backRightLeg.rotation.x = Math.sin(this.animTime * bobSpeed) * bobAmp;
            if (this.head) this.head.rotation.y = Math.sin(this.animTime * bobSpeed * 0.5) * 0.1;
        } else {
            const swaySpeed = cfg.IDLE_SWAY_SPEED;
            const swayAmp = cfg.IDLE_SWAY_AMPLITUDE;

            if (this.head) this.head.rotation.y = Math.sin(this.animTime * swaySpeed) * swayAmp;
            if (this.frontLeftLeg) this.frontLeftLeg.rotation.x = 0;
            if (this.frontRightLeg) this.frontRightLeg.rotation.x = 0;
            if (this.backLeftLeg) this.backLeftLeg.rotation.x = 0;
            if (this.backRightLeg) this.backRightLeg.rotation.x = 0;
        }
    }

    update(deltaTime, player) {
        if (!this.group) return;

        if (this.isFrozen) {
            this.freezeTimer -= deltaTime;
            if (this.freezeTimer <= 0) {
                this.isFrozen = false;
                this._setBodyColor(this.originalColor);
            }
            return;
        }

        super.update(deltaTime, player);
        this._updateAudioVolumes(deltaTime);

        if (this.minimapMarker) {
            this.minimapMarker.position.copy(this.position);
        }
    }

    destroy() {
        if (this.trackAudio) {
            this.trackAudio.pause();
            this.trackAudio.currentTime = 0;
        }
        super.destroy();
    }

    _calculateVolume(distInTiles, maxDist) {
        if (distInTiles >= maxDist) return 0;
        const steps = Math.floor(maxDist);
        const stepSize = 1.0 / steps;
        const currentStep = Math.floor(distInTiles);
        return Math.max(0, 1.0 - (currentStep * stepSize));
    }

    isMakingSound() {
        if (!this.trackAudio) return false;
        return !this.trackAudio.paused && this.trackAudio.volume > 0.01;
    }
}
