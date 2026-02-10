import * as THREE from 'three';
import { Monster } from './Monster.js';
import { CharacterBuilder } from '../CharacterBuilder.js';
import { CONFIG } from '../Config.js';

/**
 * 기본 좀비 클래스
 */
export class Zombie extends Monster {
    constructor(scene, mazeGen, options = {}) {
        const zombieCfg = CONFIG.MONSTERS.ZOMBIE;
        super(scene, mazeGen, CONFIG.MONSTERS.TYPES.ZOMBIE, {
            color: zombieCfg.COLOR,
            scale: zombieCfg.MODEL_SCALE,
            ...options
        });

        this._initAudio();
    }

    /**
     * 좀비 설정 반환
     */
    _getConfig() {
        return CONFIG.MONSTERS.ZOMBIE;
    }


    /**
     * 좀비 모델 생성 (CharacterBuilder 사용)
     */
    _initModel(options) {
        this.model = CharacterBuilder.createZombie(options);
        this.group.add(this.model);

        this.leftLeg = this.model.getObjectByName('leftLeg');
        this.rightLeg = this.model.getObjectByName('rightLeg');
        this.leftArm = this.model.getObjectByName('leftArm');
        this.rightArm = this.model.getObjectByName('rightArm');
        this.head = this.model.getObjectByName('head');
    }

    /**
     * 좀비 애니메이션 업데이트 (걷기/대기)
     */
    _updateAnimation(deltaTime) {
        if (!this.model || this.isFrozen) return;

        const cfg = this._getConfig();

        if (this.isMovingTile) {
            const bobSpeed = cfg.WALK_BOB_SPEED;
            const bobAmp = cfg.WALK_BOB_AMPLITUDE;

            if (this.leftLeg) this.leftLeg.rotation.x = Math.sin(this.animTime * bobSpeed) * bobAmp;
            if (this.rightLeg) this.rightLeg.rotation.x = -Math.sin(this.animTime * bobSpeed) * bobAmp;
            if (this.leftArm) this.leftArm.rotation.x = -Math.sin(this.animTime * bobSpeed) * bobAmp * 0.5;
            if (this.rightArm) this.rightArm.rotation.x = Math.sin(this.animTime * bobSpeed) * bobAmp * 0.5;
            if (this.head) this.head.rotation.y = Math.sin(this.animTime * bobSpeed * 0.5) * 0.1;
        } else {
            const swaySpeed = cfg.IDLE_SWAY_SPEED;
            const swayAmp = cfg.IDLE_SWAY_AMPLITUDE;

            if (this.head) this.head.rotation.y = Math.sin(this.animTime * swaySpeed) * swayAmp;
            if (this.leftLeg) this.leftLeg.rotation.x = 0;
            if (this.rightLeg) this.rightLeg.rotation.x = 0;
            if (this.leftArm) this.leftArm.rotation.x = 0;
            if (this.rightArm) this.rightArm.rotation.x = 0;
        }
    }

    /**
     * 오디오 설정 초기화
     */
    _initAudio() {
        const audioCfg = CONFIG.AUDIO;
        this.patrolSFXUrl = audioCfg.ZOMBIE_PATROL_SFX;
        this.trackSFXUrl = audioCfg.ZOMBIE_TRACK_SFX;
        this.attackSFXUrl = audioCfg.ZOMBIE_ATTACK_SFX;
        this.soundCooldown = 0;

        // 부모 클래스의 오디오 시스템 초기화 호출
        this._initAudioSystem();
    }


}
