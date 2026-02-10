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

        this._initAudio();
    }

    /**
     * 늑대 좀비 설정 반환
     */
    _getConfig() {
        return CONFIG.MONSTERS.WOLF_ZOMBIE;
    }


    /**
     * 오디오 설정 초기화
     */
    _initAudio() {
        const audioCfg = CONFIG.AUDIO;
        this.patrolSFXUrl = audioCfg.WOLF_PATROL_SFX;
        this.trackSFXUrl = audioCfg.WOLF_TRACK_SFX;
        this.attackSFXUrl = audioCfg.WOLF_ATTACK_SFX;
        this.soundCooldown = 0;

        // 부모 클래스의 오디오 시스템 초기화 호출
        this._initAudioSystem();
    }




    /**
     * 늑대 모델 생성 (CharacterBuilder 사용)
     */
    _initModel(options) {
        this.model = CharacterBuilder.createWolf(options);
        this.group.add(this.model);

        this.frontLeftLeg = this.model.getObjectByName('frontLeftLeg');
        this.frontRightLeg = this.model.getObjectByName('frontRightLeg');
        this.backLeftLeg = this.model.getObjectByName('backLeftLeg');
        this.backRightLeg = this.model.getObjectByName('backRightLeg');
        this.head = this.model.getObjectByName('headGroup');
    }

    /**
     * 늑대 애니메이션 업데이트 (사족보행/대기)
     */
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



}
