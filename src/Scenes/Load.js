// Load.js
// ────────
// Scene: Asset Preloader
//
// This scene demonstrates the standard Phaser preloading pattern:
//   1. Load all assets in preload() — Phaser handles the async work
//   2. Do setup work in create() — assets are guaranteed ready here
//   3. Define all game-wide animations once here so every later scene can use them
//
// Key API shown:
//   this.load.atlasXML(key, imagePath, xmlPath)
//     Loads a spritesheet PNG together with an XML file that names each sub-region.
//     Frame names in code = XML "name" attribute with .png stripped.

class Load extends Phaser.Scene {
    constructor() {
        super('Load');
    }

    preload() {
        this.cameras.main.setBackgroundColor('#1a1a2e');

        // Simple loading feedback — useful for larger projects with many assets
        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 20,
            'Loading assets...',
            { fontSize: '24px', fill: '#ffffff' }
        ).setOrigin(0.5);

        this.load.setPath("./assets/");

        // atlasXML: one PNG + one XML → accessed by a single key ('players', etc.)
        // The XML maps region names to pixel coordinates within the PNG.
        this.load.atlasXML(
            'players',
            'spritesheet_players.png',
            'spritesheet_players.xml'
        );
        this.load.atlasXML(
            'enemies',
            'spritesheet_enemies.png',
            'spritesheet_enemies.xml'
        );
        this.load.atlasXML(
            'ground',
            'spritesheet_ground.png',
            'spritesheet_ground.xml'
        );
    }

    create() {
        // ── Player animations ────────────────────────────────────────────────
        // Walking: 2-frame loop between walk1 and walk2
        this.anims.create({
            key: 'player-walk',
            frames: [
                { key: 'players', frame: 'alienBlue_walk1.png' },
                { key: 'players', frame: 'alienBlue_walk2.png' }
            ],
            frameRate: 8,
            repeat: -1      // -1 = loop forever
        });

        // Standing idle: single frame
        this.anims.create({
            key: 'player-stand',
            frames: [{ key: 'players', frame: 'alienBlue_stand.png' }],
            frameRate: 1
        });

        // Airborne: single frame shown while jumping or falling
        this.anims.create({
            key: 'player-jump',
            frames: [{ key: 'players', frame: 'alienBlue_jump.png' }],
            frameRate: 1
        });

        // ── Enemy animations ─────────────────────────────────────────────────
        // Note: the XML idle frame is named 'wormGreen' (not 'wormGreen_idle')
        this.anims.create({
            key: 'worm-walk',
            frames: [
                { key: 'enemies', frame: 'wormGreen.png' },
                { key: 'enemies', frame: 'wormGreen_move.png' }
            ],
            frameRate: 4,
            repeat: -1
        });

        // Note: the XML idle frame is named 'bee' (not 'bee_idle')
        this.anims.create({
            key: 'bee-fly',
            frames: [
                { key: 'enemies', frame: 'bee.png' },
                { key: 'enemies', frame: 'bee_move.png' }
            ],
            frameRate: 6,
            repeat: -1
        });

        // All assets loaded and animations defined — move to the first playable scene
        this.scene.start('FixedVelocity');
    }
}
