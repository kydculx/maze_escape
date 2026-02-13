import { Bomb } from './Bomb.js';

/**
 * 맵 내의 모든 폭탄 인스턴스를 관리하는 매니저
 */
export class BombManager {
    constructor(scene, soundManager) {
        this.scene = scene;
        this.sound = soundManager;
        this.bombs = [];
    }

    /**
     * 폭탄 설치
     * @param {THREE.Vector3} position - 설치 월드 좌표
     * @param {THREE.Vector3} normal - 벽면 노멀 (방향)
     * @param {Function} onDetonate - 폭발 시 실행할 콜백
     */
    plantBomb(position, normal, onDetonate) {
        const bomb = new Bomb(this.scene, position, normal, onDetonate, this.sound);
        this.bombs.push(bomb);
    }

    update(dt) {
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            bomb.update(dt);
            if (bomb.isDetonated) {
                this.bombs.splice(i, 1);
            }
        }
    }

    clear() {
        this.bombs.forEach(bomb => bomb.destroy());
        this.bombs = [];
    }
}
