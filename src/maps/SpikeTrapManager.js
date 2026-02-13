import * as THREE from 'three';
import { CONFIG } from '../Config.js';

/**
 * 바닥 함정 타일 + 옆면 벽 스파이크를 관리하는 매니저
 * - 플레이어가 특정 타일을 밟으면 인접 벽에서 스파이크가 튀어나왔다가 서서히 들어감
 * - 피해 대상: 플레이어만
 */
export class SpikeTrapManager {
    /**
     * @param {THREE.Scene} scene 
     * @param {MazeGenerator} mazeGen 
     */
    constructor(scene, mazeGen) {
        this.scene = scene;
        this.mazeGen = mazeGen;

        /**
         * traps 배열 요소 구조
         * - tileGridX, tileGridY: 함정 바닥 타일 그리드 좌표
         * - wallGridX, wallGridY: 옆면 스파이크가 위치'했던' 벽 좌표 (배치 로직용)
         * - marker: 바닥 함정 타일(경고 문양 + 바닥 가시 그룹)
         * - floorSpike: marker 안에 있는 바닥 가시 그룹 (y 애니메이션 전용)
         * - floorState: 바닥 가시 상태 (IDLE/EXTENDING/HOLDING/RETRACTING)
         * - floorTimer: 상태 시간
         * - floorHeight: 현재 바닥 가시가 튀어나온 높이
         */
        /** @type {{ tileGridX:number, tileGridY:number, tileWorldPos:THREE.Vector3, wallGridX:number, wallGridY:number, direction:'N'|'S'|'E'|'W', cooldownTimer:number, marker?:THREE.Object3D, pulseOffset?:number, floorSpike?:THREE.Object3D, floorState?:string, floorTimer?:number, floorHeight?:number }[]} */
        this.traps = [];

        // 전체 스파이크를 묶는 그룹 (디버그/관리용)
        this.group = new THREE.Group();
        this.group.name = 'spike-traps';
        this.scene.add(this.group);

        // 쿨다운 시간 (초)
        this.triggerCooldown = 1.8;

        this._spawnTraps();
    }

    /**
     * 미로 데이터가 바뀔 때 호출 (스테이지 리셋/변경)
     * - 기존 스파이크를 모두 제거하고 새로 생성
     */
    rebuild(mazeGen) {
        this.clear();
        this.mazeGen = mazeGen;
        this._spawnTraps();
    }

    /**
     * 내부 스파이크 및 데이터 전부 제거
     */
    clear() {
        if (this.traps) {
            for (const trap of this.traps) {
                /* wallSpike 제거됨 */
                if (trap.marker) {
                    this._disposeMarker(trap.marker);
                }
            }
        }
        this.traps = [];
    }

    /**
     * 리소스 정리
     */
    dispose() {
        this.clear();
        if (this.group) {
            this.scene.remove(this.group);
        }
    }

    /**
     * 스파이크 함정 후보를 찾고 일부를 실제 함정으로 배치
     * - 규칙: 길(0) 타일 중에서, 네 방향 중 하나에 벽(1)이 인접한 타일을 후보로 사용
     */
    _spawnTraps() {
        if (!this.mazeGen || !this.mazeGen.grid) return;

        const grid = this.mazeGen.grid;
        const width = this.mazeGen.width;
        const height = this.mazeGen.height;
        const thickness = CONFIG.MAZE.WALL_THICKNESS;

        const candidates = [];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                if (grid[y][x] !== 0) continue; // 길 타일만 대상

                // 네 방향 중 하나에 벽이 있으면 해당 방향을 후보로 사용
                const dirs = [
                    { dx: 0, dy: -1, dir: 'N' },
                    { dx: 0, dy: 1, dir: 'S' },
                    { dx: 1, dy: 0, dir: 'E' },
                    { dx: -1, dy: 0, dir: 'W' }
                ];

                for (const { dx, dy, dir } of dirs) {
                    const wx = x + dx;
                    const wy = y + dy;
                    if (wx < 0 || wx >= width || wy < 0 || wy >= height) continue;
                    if (grid[wy][wx] === 1) {
                        candidates.push({
                            tileGridX: x,
                            tileGridY: y,
                            wallGridX: wx,
                            wallGridY: wy,
                            direction: dir
                        });
                        // 한 타일 당 하나만 사용
                        break;
                    }
                }
            }
        }

        if (candidates.length === 0) return;

        // 너무 많지 않도록 개수 제한 (미로 크기에 비례)
        const maxTraps = Math.max(3, Math.floor((width * height) / 80));
        const shuffled = this._shuffleArray(candidates);
        const selected = shuffled.slice(0, maxTraps);

        const offsetX = -(width * thickness) / 2;
        const offsetZ = -(height * thickness) / 2;

        for (const c of selected) {
            const worldX = offsetX + c.tileGridX * thickness + thickness / 2;
            const worldZ = offsetZ + c.tileGridY * thickness + thickness / 2;
            const tileWorldPos = new THREE.Vector3(worldX, 0, worldZ);

            /* wallSpike 생성 중단 */

            // 바닥 함정 타일 전용 메쉬 (타일 전체를 덮는 붉은 금속 판 + 경고 무늬)
            const marker = this._createTrapFloorMarker(tileWorldPos, thickness);
            this.group.add(marker);

            // marker 내부의 바닥 가시 그룹 참조
            const floorSpike = marker.getObjectByName('trap-floor-spikes') || null;
            const centerSpike = floorSpike ? floorSpike.getObjectByName('center-spike') : null;
            const crossGlint = centerSpike ? centerSpike.getObjectByName('cross-glint-group') : null;

            this.traps.push({
                tileGridX: c.tileGridX,
                tileGridY: c.tileGridY,
                tileWorldPos,
                wallGridX: c.wallGridX,
                wallGridY: c.wallGridY,
                direction: c.direction,
                cooldownTimer: 0,
                marker,
                pulseOffset: Math.random() * Math.PI * 2,
                rotationSpeed: 1.5 + Math.random() * 2.5, // 회전 속도 다양화
                floorSpike,
                centerSpike,
                crossGlint,
                floorState: 'IDLE',
                floorTimer: 0,
                floorHeight: 0
            });
        }
    }

    /**
     * 매 프레임 업데이트
     * @param {number} deltaTime 
     * @param {Player} player 
     */
    update(deltaTime, player) {
        if (!player || this.traps.length === 0) return;

        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const offsetX = -(this.mazeGen.width * thickness) / 2;
        const offsetZ = -(this.mazeGen.height * thickness) / 2;

        const playerPos = player.position;
        const playerGridX = Math.floor((playerPos.x - offsetX) / thickness);
        const playerGridY = Math.floor((playerPos.z - offsetZ) / thickness);

        for (const trap of this.traps) {
            // 1) 쿨다운 감소
            if (trap.cooldownTimer > 0) {
                trap.cooldownTimer -= deltaTime;
            }

            // 2) 타일 트리거 체크
            if (trap.cooldownTimer <= 0 &&
                playerGridX === trap.tileGridX &&
                playerGridY === trap.tileGridY) {
                // 바닥 가시 발동
                trap.floorState = 'EXTENDING';
                trap.floorTimer = 0;
                trap.cooldownTimer = this.triggerCooldown;
            }

            // 3) 바닥 가시 피해 판정
            if (trap.floorState === 'EXTENDING' || trap.floorState === 'HOLDING') {
                if (playerGridX === trap.tileGridX && playerGridY === trap.tileGridY) {
                    player.takeDamage(10);
                }
            }
        }

        // 5) 바닥 함정 타일 시각 효과 (맥동하는 붉은 빛 + 바닥 가시 애니메이션)
        const time = performance.now() * 0.002;
        for (const trap of this.traps) {
            if (!trap.marker) continue;

            // 5-1) 바닥 가시 애니메이션 (플레이어가 밟으면 타일 중앙에서 가시가 휙 올라왔다가 천천히 들어감)
            if (trap.floorSpike) {
                const maxHeight = CONFIG.MAZE.WALL_THICKNESS * 0.45;
                const extendSpeed = maxHeight / 0.15;   // 빠르게 튀어나옴
                const retractSpeed = maxHeight / 3.5;   // 천천히 들어감 (약 3.5초)
                const holdDuration = 0.2;               // 0.2초 유지

                trap.floorTimer += deltaTime;

                if (trap.floorState === 'EXTENDING') {
                    trap.floorHeight = Math.min(
                        trap.floorHeight + extendSpeed * deltaTime,
                        maxHeight
                    );
                    if (trap.floorHeight >= maxHeight - 1e-3) {
                        trap.floorState = 'HOLDING';
                        trap.floorTimer = 0;
                    }
                } else if (trap.floorState === 'HOLDING') {
                    if (trap.floorTimer >= holdDuration) {
                        trap.floorState = 'RETRACTING';
                        trap.floorTimer = 0;
                    }
                } else if (trap.floorState === 'RETRACTING') {
                    trap.floorHeight = Math.max(
                        trap.floorHeight - retractSpeed * deltaTime,
                        0
                    );
                    if (trap.floorHeight <= 1e-3) {
                        trap.floorHeight = 0;
                        trap.floorState = 'IDLE';
                        trap.floorTimer = 0;
                    }
                }

                // 바닥 가시 그룹 전체를 위로/아래로 이동 (restY = -spikeHeight/2 + 0.05)
                const restY = -(CONFIG.MAZE.WALL_THICKNESS * 0.9) / 2 + 0.05;
                trap.floorSpike.position.y = restY + trap.floorHeight;
            }

            // 5-2) 중앙 가시 반짝임 효과 (Sharp Sparkle/Glint)
            if (trap.centerSpike && trap.centerSpike.material) {
                // 더 날카롭고 강렬한 반짝임을 위해 고차항 파워 함수 사용 (주기 대폭 상향으로 빈도 감소)
                const time = performance.now();
                const glintTime = time * 0.0015 + trap.pulseOffset; // 0.004 -> 0.0015 (약 2.5배 느려짐)

                // 1. 기본 주기적 반짝임 (매우 좁은 피크)
                const baseGlint = Math.pow(Math.max(0, Math.sin(glintTime)), 60); // 파워 상향 (더 좁은 구멍)

                // 2. 고주파 지터 (시각적 아리함 유지)
                const shimmer = Math.sin(time * 0.05) * 0.15;

                // 3. 무작위 돌발 광풍 (Glint - 확률 더 낮춤)
                let extraFlash = 0;
                if (Math.sin(glintTime * 0.41) > 0.99) { // 0.98 -> 0.99 (확률 절반 이하)
                    extraFlash = Math.pow(Math.max(0, Math.sin(time * 0.01)), 5) * 4.0;
                }

                // 강도 조합
                const intensity = 0.1 + baseGlint * 4.0 + extraFlash + shimmer;

                // 십자 광광(Cross Glint) 애니메이션 동기화 (더 자연스러운 트랜지션)
                if (trap.crossGlint) {
                    // 강도가 일정 수준 이상일 때 서서히 나타남 (리니어 대신 커브 적용)
                    const targetScale = Math.max(0, (intensity - 2.2) * 0.35);
                    const currentScale = trap.crossGlint.scale.x;

                    // 서서히 커지고 작아지도록 보간 (Lerp)
                    const newScale = currentScale + (targetScale - currentScale) * 0.2;
                    trap.crossGlint.scale.set(newScale, newScale, newScale);
                    trap.crossGlint.visible = newScale > 0.005;

                    // 무작위 회전 속도 적용
                    trap.crossGlint.rotation.z += deltaTime * (trap.rotationSpeed || 2.0);
                    // 가끔 무작위로 축 비틀기 (생동감)
                    if (intensity > 4.5) {
                        trap.crossGlint.rotation.x = Math.sin(time * 0.1) * 0.2;
                    }
                }
            }
        }
    }

    _shuffleArray(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    /**
     * 함정 전용 바닥 타일 메쉬 생성
     * - 기본 어두운 금속 판 + 붉은 십자 경고 문양
     */
    _createTrapFloorMarker(tileWorldPos, thickness) {
        const group = new THREE.Group();
        group.name = 'spike-trap-marker';

        const size = thickness * 0.9;

        // (기존 금속 판 제거됨)

        /* 붉은 십자 경고 무늬 제거됨 */

        // 바닥에서 솟구치는 가시 다발 추가
        const spikesGroup = new THREE.Group();
        spikesGroup.name = 'trap-floor-spikes';

        const spikeHeight = thickness * 0.9;
        const spikeRadius = thickness * 0.09;
        const floorSpikeGeom = new THREE.ConeGeometry(spikeRadius, spikeHeight, 6);
        const floorSpikeMat = new THREE.MeshStandardMaterial({
            color: 0xbbbbbb,
            metalness: 0.85,
            roughness: 0.2,
            emissive: 0x110000,
            emissiveIntensity: 0.6
        });

        const spacing = thickness * 0.18;
        const positions = [
            { x: 0, z: 0, y: 0 },                        // Center
            { x: -spacing, z: -spacing, y: -0.05 },      // Front Left
            { x: spacing, z: -spacing, y: -0.05 },       // Front Right
            { x: -spacing, z: spacing, y: -0.05 },       // Back Left
            { x: spacing, z: spacing, y: -0.05 }         // Back Right
        ];

        positions.forEach((pos, idx) => {
            const spike = new THREE.Mesh(floorSpikeGeom, floorSpikeMat);

            // 중앙 가시(idx 0)는 별도의 이름과 독립된 재질을 가짐 (반짝임용)
            if (idx === 0) {
                spike.name = 'center-spike';
                spike.material = floorSpikeMat.clone();

                // 십자 광광(Cross Glint) 메쉬 추가
                const glintGroup = new THREE.Group();
                glintGroup.name = 'cross-glint-group';
                glintGroup.position.y = spikeHeight * 0.5; // 가시 끝부분

                const rayGeo = new THREE.PlaneGeometry(thickness * 0.18, thickness * 0.012);
                const rayMat = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.7, // 약간 더 투명하게
                    side: THREE.DoubleSide,
                    blending: THREE.AdditiveBlending
                });

                const ray1 = new THREE.Mesh(rayGeo, rayMat);
                glintGroup.add(ray1);

                const ray2 = new THREE.Mesh(rayGeo, rayMat);
                ray2.rotation.z = Math.PI / 2;
                glintGroup.add(ray2);

                // 중앙의 작은 핵심 광점 (Core)
                const coreGeo = new THREE.SphereGeometry(thickness * 0.02, 8, 8);
                const coreMat = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    blending: THREE.AdditiveBlending
                });
                const core = new THREE.Mesh(coreGeo, coreMat);
                glintGroup.add(core);

                glintGroup.scale.set(0, 0, 0);
                glintGroup.visible = false;
                spike.add(glintGroup);
            }

            spike.position.set(pos.x, pos.y * spikeHeight, pos.z);
            spike.castShadow = true;
            spike.receiveShadow = true;
            spikesGroup.add(spike);
        });

        // 처음에는 바닥 안에 거의 잠겨 있게 (끝 부분이 바닥 표면 0.01보다 약간 솟은 0.05 위치)
        const restY = -spikeHeight / 2 + 0.05;
        spikesGroup.position.set(tileWorldPos.x, restY, tileWorldPos.z);

        group.add(spikesGroup);

        return group;
    }

    _disposeMarker(marker) {
        if (!marker) return;
        marker.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
        this.group.remove(marker);
    }
}

