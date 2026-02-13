// 모든 에셋(이미지, 오디오)을 이곳에서 import하여 관리합니다.
// 이렇게 하면 다른 설정 파일들이 import 구문으로 지저분해지는 것을 방지할 수 있습니다.

// [Audio - BGM]
// [Audio - BGM]
const bgmUrl = new URL('./assets/audio/bgm_background.mp3', import.meta.url).href;

// [Audio - SFX]
const thunderSfxUrl = new URL('./assets/audio/eff_thunder.mp3', import.meta.url).href;
const rainBgsUrl = new URL('./assets/audio/eff_rain.mp3', import.meta.url).href;
const clickSfxUrl = new URL('./assets/audio/eff_click.mp3', import.meta.url).href;
const footstepSfxUrl = new URL('./assets/audio/eff_footstep.mp3', import.meta.url).href;
const jumpSfxUrl = new URL('./assets/audio/eff_jump.wav', import.meta.url).href;
const itemPickupSfxUrl = new URL('./assets/audio/eff_itemget.mp3', import.meta.url).href;
const zombiePatrolSfx = new URL('./assets/audio/eff_zombie_patrol.mp3', import.meta.url).href;
const zombieTrackSfx = new URL('./assets/audio/eff_zombie_track.mp3', import.meta.url).href;
const zombieAttackSfx = new URL('./assets/audio/eff_zombie_attack.mp3', import.meta.url).href;
const wolfPatrolSfx = new URL('./assets/audio/eff_wolf_patrol.mp3', import.meta.url).href;
const wolfTrackSfx = new URL('./assets/audio/eff_wolf_track.mp3', import.meta.url).href;
const wolfAttackSfx = new URL('./assets/audio/eff_wolf_attack.mp3', import.meta.url).href;
const damageSfxUrl = new URL('./assets/audio/eff_damage.mp3', import.meta.url).href;

const flashlightSwitchSfxUrl = new URL('./assets/audio/eff_flashlight_switch.mp3', import.meta.url).href;
const sensorToggleSfxUrl = new URL('./assets/audio/eff_sensor_switch.mp3', import.meta.url).href;
const teleportSfxUrl = new URL('./assets/audio/eff_teleport.mp3', import.meta.url).href;
const trapSfxUrl = new URL('./assets/audio/eff_trap.mp3', import.meta.url).href;
const wallCollapseSfxUrl = new URL('./assets/audio/eff_wall_collapse.mp3', import.meta.url).href;
const bombTickSfxUrl = new URL('./assets/audio/eff_click.mp3', import.meta.url).href; // Ticking sound reuse click or add new
const bombExplosionSfxUrl = new URL('./assets/audio/eff_bomb.mp3', import.meta.url).href;

// [Textures]
const wallBrickUrl = new URL('./assets/textures/wall_brick.png', import.meta.url).href;
const floorStoneUrl = new URL('./assets/textures/floor_stone.png', import.meta.url).href;

const wallGothicUrl = new URL('./assets/textures/wall_gothic.png', import.meta.url).href;
const floorGothicUrl = new URL('./assets/textures/floor_gothic.png', import.meta.url).href;

// [Dungeon Themes]
const wallDungeonAUrl = new URL('./assets/textures/dungeon_A_wall.png', import.meta.url).href;
const floorDungeonAUrl = new URL('./assets/textures/dungeon_A_floor.png', import.meta.url).href;
const wallDungeonBUrl = new URL('./assets/textures/dungeon_B_wall.png', import.meta.url).href;
const floorDungeonBUrl = new URL('./assets/textures/dungeon_B_floor.png', import.meta.url).href;
const wallDungeonCUrl = new URL('./assets/textures/dungeon_C_wall.png', import.meta.url).href;
const floorDungeonCUrl = new URL('./assets/textures/dungeon_C_floor.png', import.meta.url).href;

// [New Themes]
const wallSlimeUrl = new URL('./assets/textures/wall_slime.png', import.meta.url).href;
const floorSlimeUrl = new URL('./assets/textures/floor_slime.png', import.meta.url).href;
const wallMagmaUrl = new URL('./assets/textures/wall_magma.png', import.meta.url).href;
const floorMagmaUrl = new URL('./assets/textures/floor_magma.png', import.meta.url).href;
const wallGhostlyUrl = new URL('./assets/textures/wall_ghostly.png', import.meta.url).href;
const floorGhostlyUrl = new URL('./assets/textures/floor_ghostly.png', import.meta.url).href;
const wallWoodenUrl = new URL('./assets/textures/wall_wooden.png', import.meta.url).href;
const floorWoodenUrl = new URL('./assets/textures/floor_wooden.png', import.meta.url).href;
const wallFleshUrl = new URL('./assets/textures/wall_flesh.png', import.meta.url).href;
const floorFleshUrl = new URL('./assets/textures/floor_flesh.png', import.meta.url).href;
const zombieSkinUrl = new URL('./assets/textures/zombie_skin_v3.png', import.meta.url).href;
const zombieClothesUrl = new URL('./assets/textures/zombie_clothes_v2.png', import.meta.url).href;
const zombieHeadOverhaulUrl = new URL('./assets/textures/zombie_head_v3.png', import.meta.url).href;
const zombieBodyOverhaulUrl = new URL('./assets/textures/zombie_body_v3.png', import.meta.url).href;


export const ASSETS = {
    AUDIO: {
        BGM: bgmUrl,
        SFX: {
            THUNDER: thunderSfxUrl,
            RAIN: rainBgsUrl,
            CLICK: clickSfxUrl,
            FOOTSTEP: footstepSfxUrl,
            JUMP: jumpSfxUrl,
            DAMAGE: damageSfxUrl,
            ITEM_PICKUP: itemPickupSfxUrl,
            ZOMBIE: {
                PATROL: zombiePatrolSfx,
                TRACK: zombieTrackSfx,
                ATTACK: zombieAttackSfx
            },
            WOLF: {
                PATROL: wolfPatrolSfx,
                TRACK: wolfTrackSfx,
                ATTACK: wolfAttackSfx
            },
            ITEM: {
                FLASHLIGHT: flashlightSwitchSfxUrl,
                SENSOR: sensorToggleSfxUrl,
                TELEPORT: teleportSfxUrl,
                TRAP: trapSfxUrl,
                WALL_COLLAPSE: wallCollapseSfxUrl,
                BOMB_TICK: bombTickSfxUrl,
                EXPLOSION: bombExplosionSfxUrl
            }
        }
    },
    TEXTURES: {
        WALL_BRICK: wallBrickUrl,
        FLOOR_STONE: floorStoneUrl,
        WALL_GOTHIC: wallGothicUrl,
        FLOOR_GOTHIC: floorGothicUrl,

        // Dungeon Themes
        DUNGEON: {
            TYPE_A: { WALL: wallDungeonAUrl, FLOOR: floorDungeonAUrl },
            TYPE_B: { WALL: wallDungeonBUrl, FLOOR: floorDungeonBUrl },
            TYPE_C: { WALL: wallDungeonCUrl, FLOOR: floorDungeonCUrl }
        },
        NEW_THEMES: {
            BIO_LAB: { WALL: wallSlimeUrl, FLOOR: floorSlimeUrl },
            VOLCANIC: { WALL: wallMagmaUrl, FLOOR: floorMagmaUrl },
            ETHER_VOID: { WALL: wallGhostlyUrl, FLOOR: floorGhostlyUrl },
            OLD_CABIN: { WALL: wallWoodenUrl, FLOOR: floorWoodenUrl },
            ORGANIC: { WALL: wallFleshUrl, FLOOR: floorFleshUrl }
        },
        ZOMBIE: {
            SKIN: zombieSkinUrl,
            CLOTHES: zombieClothesUrl,
            HEAD_OVERHAUL: zombieHeadOverhaulUrl,
            BODY_OVERHAUL: zombieBodyOverhaulUrl
        }
    }
};
