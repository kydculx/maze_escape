import * as THREE from 'three';
import { CONFIG } from '../Config.js';
import { ASSETS } from '../Assets.js';

/**
 * 미로의 시각적 표현(3D 메쉬)을 관리하는 클래스
 */
export class MazeView {
    constructor(scene) {
        this.scene = scene;
        this.mazeMesh = null;
        this.markers = null;
        this.textureLoader = new THREE.TextureLoader();
    }

    /**
     * 미로 시각적 요소 전체 갱신 (Atomic Sweep)
     */
    refresh(mazeGen, mazeConfig) {
        console.log("--- MazeView: Atomic Visual Refresh ---");

        // 1. 기존 메쉬 및 마커 제거
        this.clear();

        // 2. 새 메쉬 생성 및 추가
        this.mazeMesh = this.generateThreeMesh(mazeGen, mazeConfig);
        this.mazeMesh.name = 'maze-mesh';
        this.scene.add(this.mazeMesh);

        // 3. 입구/출구 마커 추가
        this.addMarkers(mazeGen, mazeConfig);
    }

    /**
     * 씬에서 미로 관련 오브젝트 소탕
     */
    clear() {
        const toRemove = [];
        this.scene.traverse(child => {
            if (child.name && (child.name.startsWith('maze-') || child.name === 'magic-circle')) {
                toRemove.push(child);
            }
        });

        toRemove.forEach(obj => {
            this.scene.remove(obj);
            this.disposeObject(obj);
        });

        this.mazeMesh = null;
        this.markers = null;
    }

    /**
     * Three.js 메시 그룹 생성 (MazeGenerator에서 이관됨)
     */
    generateThreeMesh(mazeGen, config) {
        const group = new THREE.Group();
        const wallTexture = this.textureLoader.load(config.TEXTURE_URL);

        // 텍스처 수직 반복 설정
        wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
        wallTexture.repeat.set(1, config.WALL_HEIGHT / 1.5);

        const wallGeometry = new THREE.BoxGeometry(config.WALL_THICKNESS, config.WALL_HEIGHT, config.WALL_THICKNESS);
        const wallMaterial = new THREE.MeshStandardMaterial({
            map: wallTexture,
            color: config.WALL_COLOR,
            roughness: config.MATERIAL.ROUGHNESS,
            metalness: config.MATERIAL.METALNESS,
            emissive: config.MATERIAL.EMISSIVE,
            emissiveIntensity: config.MATERIAL.EMISSIVE_INTENSITY
        });

        // 바닥 타일 설정
        const floorTexture = this.textureLoader.load(config.FLOOR_TEXTURE_URL);
        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(1, 1);

        const floorGeometry = new THREE.PlaneGeometry(config.WALL_THICKNESS, config.WALL_THICKNESS);
        const floorMaterial = new THREE.MeshStandardMaterial({
            map: floorTexture,
            color: config.FLOOR_COLOR,
            roughness: 0.35,         // 물웅덩이 효과를 위한 매끄러운 바닥
            metalness: 0.2
        });

        const offsetX = -(mazeGen.width * config.WALL_THICKNESS) / 2;
        const offsetZ = -(mazeGen.height * config.WALL_THICKNESS) / 2;

        for (let y = 0; y < mazeGen.height; y++) {
            for (let x = 0; x < mazeGen.width; x++) {
                const posX = offsetX + (x * config.WALL_THICKNESS) + config.WALL_THICKNESS / 2;
                const posZ = offsetZ + (y * config.WALL_THICKNESS) + config.WALL_THICKNESS / 2;

                // 바닥 생성
                const floorTile = new THREE.Mesh(floorGeometry, floorMaterial);
                floorTile.position.set(posX, 0.01, posZ);
                floorTile.rotation.x = -Math.PI / 2;
                floorTile.receiveShadow = true;
                floorTile.name = 'maze-floor-tile';
                group.add(floorTile);

                // 벽 생성
                if (mazeGen.grid[y][x] === 1) {
                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                    wall.position.set(posX, config.WALL_HEIGHT / 2 + 0.01, posZ);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    wall.name = 'maze-wall';
                    wall.userData = { gridX: x, gridY: y }; // 위치 데이터 추가
                    group.add(wall);
                }
            }
        }

        return group;
    }

    addMarkers(mazeGen, config) {
        this.markers = new THREE.Group();
        this.markers.name = 'maze-markers';

        const thickness = config.WALL_THICKNESS;
        const offsetX = -(mazeGen.width * thickness) / 2;
        const offsetZ = -(mazeGen.height * thickness) / 2;

        if (mazeGen.entrance) {
            const startMarker = this.createMarkerMesh(0x00ffaa);
            startMarker.position.set(
                offsetX + (mazeGen.entrance.x * thickness) + thickness / 2,
                0.03, // 바닥(0.01)보다 확실히 위로 띄움
                offsetZ + (mazeGen.entrance.y * thickness) + thickness / 2
            );
            this.markers.add(startMarker);
        }

        if (mazeGen.exit) {
            const exitMarker = this.createMarkerMesh(0xff4444);
            exitMarker.position.set(
                offsetX + (mazeGen.exit.x * thickness) + thickness / 2,
                0.03, // 바닥(0.01)보다 확실히 위로 띄움
                offsetZ + (mazeGen.exit.y * thickness) + thickness / 2
            );
            this.markers.add(exitMarker);
        }

        this.scene.add(this.markers);
    }

    createMarkerMesh(color) {
        const group = new THREE.Group();
        const texture = this.createMagicCircleTexture(color);
        const geo = new THREE.PlaneGeometry(1.2, 1.2);
        const mat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const marker = new THREE.Mesh(geo, mat);
        marker.name = 'magic-circle';
        marker.rotation.x = -Math.PI / 2;
        group.add(marker);
        return group;
    }

    createMagicCircleTexture(colorHex) {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const color = `#${colorHex.toString(16).padStart(6, '0')}`;

        ctx.clearRect(0, 0, size, size);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        const center = size / 2;

        ctx.beginPath();
        ctx.arc(center, center, 120, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(center, center, 100, 0, Math.PI * 2);
        ctx.stroke();

        // 육각형 및 별 생략 - 간단하게 원형만 유지 가능하나 기존 디자인 유지
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            ctx.lineTo(center + Math.cos(angle) * 100, center + Math.sin(angle) * 100);
        }
        ctx.closePath(); ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    animateMarkers(deltaTime) {
        if (!this.markers) return;
        this.markers.children.forEach(markerGroup => {
            markerGroup.children.forEach(child => {
                if (child.name === 'magic-circle') {
                    child.rotation.z += deltaTime * 0.5;
                }
            });
        });
    }

    /**
     * 특정 벽이 진동하며 아래로 내려가게 애니메이션
     */
    animateWallRemoval(gridX, gridY, duration, soundManager = null, side = 'N', onComplete = null) {
        if (!this.mazeMesh) return;

        // 해당 좌표의 벽 메쉬 찾기
        let targetWall = null;
        this.mazeMesh.traverse(child => {
            if (child.name === 'maze-wall' && child.userData.gridX === gridX && child.userData.gridY === gridY) {
                targetWall = child;
            }
        });

        if (!targetWall) {
            if (onComplete) onComplete();
            return;
        }

        const shakeDuration = 0.5; // 진동 시간 (초)
        const slideDuration = Math.max(0.1, duration - shakeDuration); // 슬라이딩 시간

        const startX = targetWall.position.x;
        const startZ = targetWall.position.z;
        const startY = targetWall.position.y;
        const targetY = -CONFIG.MAZE.WALL_HEIGHT / 2;

        const startTime = performance.now();
        let collapseSoundPlayed = false;

        const animate = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000;

            // 흔들림 시작 시점에 효과음 재생
            if (!collapseSoundPlayed) {
                if (soundManager) {
                    soundManager.playSFX(ASSETS.AUDIO.SFX.ITEM.WALL_COLLAPSE, 0.7);
                }
                collapseSoundPlayed = true;
            }

            if (elapsed < shakeDuration) {
                // Phase 1: Large Shake (강력한 초기 진동)
                // 스위치가 붙은 면에 따라 흔들리는 축 결정
                const intensity = 0.04; // 초기 진동 강도 강화
                const freq = 40;
                const offset = Math.sin(elapsed * freq) * intensity;

                if (side === 'N' || side === 'S') {
                    targetWall.position.x = startX + offset;
                    targetWall.position.z = startZ;
                } else {
                    targetWall.position.x = startX;
                    targetWall.position.z = startZ + offset;
                }
            } else {
                // Phase 2: Slide Down with Micro-shake (미세 진동과 함께 가라앉음)

                const slideElapsed = elapsed - shakeDuration;
                const progress = Math.min(slideElapsed / slideDuration, 1);

                // 슬라이딩 중 미세한 덜덜거림 (마찰 표현)
                const microIntensity = 0.005;
                const microFreq = 60;
                const microOffset = Math.sin(elapsed * microFreq) * microIntensity;

                if (side === 'N' || side === 'S') {
                    targetWall.position.x = startX + microOffset;
                    targetWall.position.z = startZ;
                } else {
                    targetWall.position.x = startX;
                    targetWall.position.z = startZ + microOffset;
                }

                // Ease-in
                const ease = progress * progress;
                targetWall.position.y = startY + (targetY - startY) * ease;

                if (progress >= 1) {
                    if (onComplete) onComplete();
                    return; // 애니메이션 종료
                }
            }

            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }

    disposeObject(obj) {
        if (!obj) return;
        obj.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            }
        });
    }
}
