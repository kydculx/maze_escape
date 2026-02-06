import * as THREE from 'three';
import { CONFIG } from './Config.js';

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
            roughness: 0.9,
            metalness: 0.05
        });

        // 바닥 타일 설정
        const floorTexture = this.textureLoader.load(config.FLOOR_TEXTURE_URL);
        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(1, 1);

        const floorGeometry = new THREE.PlaneGeometry(config.WALL_THICKNESS, config.WALL_THICKNESS);
        const floorMaterial = new THREE.MeshStandardMaterial({
            map: floorTexture,
            color: 0x888888,
            roughness: 0.8,
            metalness: 0.1
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
                0.01,
                offsetZ + (mazeGen.entrance.y * thickness) + thickness / 2
            );
            this.markers.add(startMarker);
        }

        if (mazeGen.exit) {
            const exitMarker = this.createMarkerMesh(0xff4444);
            exitMarker.position.set(
                offsetX + (mazeGen.exit.x * thickness) + thickness / 2,
                0.01,
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

        // 육각형 및 별 생략 (CharacterBuilder 등과 중복 로직) - 간단하게 원형만 유지 가능하나 기존 디자인 유지
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
