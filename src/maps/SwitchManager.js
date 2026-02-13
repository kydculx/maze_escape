import * as THREE from 'three';
import { CONFIG } from '../Config.js';
import { ASSETS } from '../Assets.js';

/**
 * 미로 벽 스위치를 생성하고 상호작용을 관리하는 클래스
 */
export class SwitchManager {
    constructor(scene, mazeGen, soundManager) {
        this.scene = scene;
        this.mazeGen = mazeGen;
        this.sound = soundManager;
        this.switches = []; // { mesh, x, y } mapping
        this.switchGroup = new THREE.Group();
        this.switchGroup.name = 'placed-switches';
        this.scene.add(this.switchGroup);
    }

    /**
     * 유효한 위치에 스위치들을 배치
     */
    spawnSwitches() {
        this.clear();

        const swCfg = CONFIG.MAZE.SWITCH;
        const segmentLength = swCfg.MIN_WALL_SEGMENT;
        const validPos = this.mazeGen.getValidSwitchPositions(segmentLength);
        const mazeCfg = CONFIG.MAZE;

        const offsetX = -(this.mazeGen.width * mazeCfg.WALL_THICKNESS) / 2;
        const offsetZ = -(this.mazeGen.height * mazeCfg.WALL_THICKNESS) / 2;
        const thick = mazeCfg.WALL_THICKNESS;

        validPos.forEach(pos => {
            // 확률에 따라 생성
            if (Math.random() > swCfg.SPAWN_CHANCE) return;

            // 벽의 좌표
            const posX = offsetX + (pos.x * thick) + thick / 2;
            const posZ = offsetZ + (pos.y * thick) + thick / 2;

            // 스위치는 벽의 면에 붙어야 하므로, 방향에 따라 2개씩 생성 (양쪽 길에서 보이게)
            if (pos.orientation === 'HORIZONTAL') {
                // 서쪽 면 (-X)
                this._createSwitchMesh(posX - thick / 2, pos.y, posZ, 0, pos.x, pos.y, 'W');
                // 동쪽 면 (+X)
                this._createSwitchMesh(posX + thick / 2, pos.y, posZ, Math.PI, pos.x, pos.y, 'E');
            } else {
                // 북쪽 면 (-Z)
                this._createSwitchMesh(posX, pos.y, posZ - thick / 2, Math.PI / 2, pos.x, pos.y, 'N');
                // 남쪽 면 (+Z)
                this._createSwitchMesh(posX, pos.y, posZ + thick / 2, -Math.PI / 2, pos.x, pos.y, 'S');
            }
        });
    }

    _createSwitchMesh(x, gridY, z, rotationY, gx, gy, side) {
        const swCfg = CONFIG.MAZE.SWITCH;
        const group = new THREE.Group();
        group.position.set(x, CONFIG.MAZE.WALL_HEIGHT / 4.5, z);
        group.rotation.y = rotationY;

        // 1. 금속 베이스 프레임 (검은색/어두운 회색)
        const baseGeo = new THREE.BoxGeometry(swCfg.SIZE, swCfg.SIZE, swCfg.DEPTH);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.5,
            metalness: 0.8
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        group.add(base);

        // 2. 누르는 버튼 (빨간색 발광)
        // 베이스보다 약간 작고 튀어나온 형태
        const btnSize = swCfg.SIZE * 0.7;
        const btnGeo = new THREE.BoxGeometry(btnSize, btnSize, swCfg.DEPTH * 1.5);
        const btnMat = new THREE.MeshStandardMaterial({
            color: swCfg.COLOR,
            emissive: swCfg.COLOR,
            emissiveIntensity: 0.5
        });
        const button = new THREE.Mesh(btnGeo, btnMat);
        // 버튼이 베이스 중심에서 앞으로 튀어나오게 설정
        button.position.z = swCfg.DEPTH / 2;
        group.add(button);

        // 메타데이터 저장 (그룹을 등록하되, 상호작용은 그룹 단위로 처리)
        group.userData = {
            type: 'WALL_SWITCH',
            gridX: gx,
            gridY: gy,
            side: side,
            button: button // 애니메이션용 참조
        };

        this.switchGroup.add(group);
        this.switches.push(group);
    }

    /**
     * 스위치 클릭/터치 시 처리
     * @param {THREE.Object3D} object 
     * @param {Function} onWallRemoved 벽이 실제로 제거된 후 호출될 콜백
     * @returns {boolean} 상호작용이 시작되었는지 여부
     */
    interact(object, onWallRemoved) {
        // 클릭된 객체의 부모가 WALL_SWITCH 그룹인지 확인
        let target = object;
        while (target && target.userData.type !== 'WALL_SWITCH') {
            target = target.parent;
        }

        if (!target || target.userData.type !== 'WALL_SWITCH') return false;

        const { gridX, gridY, processing } = target.userData;

        // 이미 작동 중이거나 이미 길로 변했는지 확인
        if (processing || this.mazeGen.grid[gridY][gridX] === 0) return false;

        // 작동 중 플래그 설정 (중복 클릭 방지)
        const sameWallSwitches = this.switches.filter(s => s.userData.gridX === gridX && s.userData.gridY === gridY);
        sameWallSwitches.forEach(s => s.userData.processing = true);

        // 1. 효과음
        if (this.sound) this.sound.playSFX(ASSETS.AUDIO.SFX.ITEM.FLASHLIGHT);

        // 2. 애니메이션 실행
        sameWallSwitches.forEach(s => {
            const button = s.userData.button;

            // 색상 변경 (활성화)
            button.material.color.setHex(CONFIG.MAZE.SWITCH.ACTIVE_COLOR);
            button.material.emissive.setHex(CONFIG.MAZE.SWITCH.ACTIVE_COLOR);
            button.material.emissiveIntensity = 1.0;

            // 버튼 누름 애니메이션 (베이스 안으로 들어감)
            button.position.z = 0;
        });

        // 3. 애니메이션 완료 후 벽 스위치 모델 제거
        setTimeout(() => {
            // 스위치 모델 제거
            sameWallSwitches.forEach(s => {
                this.switchGroup.remove(s);
            });

            // 콜백 실행 (PlayScene에서 애니메이션 및 뷰 갱신)
            if (onWallRemoved) onWallRemoved(gridX, gridY, target.userData.side);
        }, 800);

        return true;
    }

    clear() {
        while (this.switchGroup.children.length > 0) {
            const obj = this.switchGroup.children[0];
            this.switchGroup.remove(obj);

            // Reccursively dispose of geometries and materials if it's a mesh or group
            obj.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        this.switches = [];
    }
}
