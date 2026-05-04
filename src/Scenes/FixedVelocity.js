// FixedVelocity.js
// ─────────────────
// Scene: Fixed Velocity Movement
//
// Demonstrates the simplest form of physics movement: setting velocity directly
// each frame. The player instantly reaches full speed and instantly stops.
//
// Key API:
//   player.setVelocityX(value)   set horizontal speed (pixels/second)
//   player.setVelocityX(0)       stop immediately — no slide
//
// Compare to AccelerationDrag.js where movement has a wind-up and slide.
//
// World layout:
//   Sprites are at their natural source size (no setScale).
//   camera.setZoom(0.5) makes the 1600×1200 world fill the 800×600 canvas.
//   Physics bodies match sprite visuals exactly — no body.setSize() needed.
//
// Arcade Physics groups used:
//   this.physics.add.staticGroup()   immovable level geometry (ground)
//   this.physics.add.sprite()        dynamic body for the player
//   this.physics.add.collider()      resolves overlap between player and ground

class FixedVelocity extends Phaser.Scene {
    constructor() {
        super('FixedVelocity');
    }

    create() {
        this.my = { sprite: {}, text: {} };

        // ── Camera & world ────────────────────────────────────────────────────
        // Zoom out to 0.5 so the 1600×1200 physics world fills the 800×600 canvas.
        // setBounds tells the physics engine where the world edges are so that
        // setCollideWorldBounds(true) works correctly.
        this.cameras.main.setZoom(0.5);
        this.cameras.main.setBackgroundColor('#87ceeb');   // sky blue
        this.cameras.main.setBounds(0, 0, 1600, 1200);
        this.physics.world.setBounds(0, 0, 1600, 1200);

        // ── Ground ───────────────────────────────────────────────────────────
        this.groundGroup = this.physics.add.staticGroup();
        this.buildGround(this.groundGroup);

        // ── Player ───────────────────────────────────────────────────────────
        // Source frame: 128×256 px. At zoom 0.5 it appears 64×128 on screen.
        // No setScale → the physics body is automatically 128×256 in world space,
        // perfectly matching the sprite visual. No body.setSize() correction needed.
        this.my.sprite.player = this.physics.add.sprite(
            200, 944,               // world coords; sits on ground surface at y=1072
            'players', 'alienBlue_stand.png'
        ).setCollideWorldBounds(true);
        this.playerSpeed = 300;     // world px/s (= 150 screen px/s at zoom 0.5)

        // ── Enemies (decorative — no physics body) ───────────────────────────
        // Created with this.add.sprite (not physics.add.sprite) — purely visual.
        //
        // Worm: walks back and forth on the ground surface.
        // Ground surface y=1072, worm half-height=64 (128px tall) → center y=1008
        this.my.sprite.worm = this.add.sprite(800, 1008, 'enemies', 'wormGreen.png')
            .setFlipX(true);
        this.my.sprite.worm.play('worm-walk');
        this.my.sprite.worm.wormDir   = 1;    // 1 = moving right, -1 = moving left
        this.my.sprite.worm.wormSpeed = 120;  // world px/s

        // Bee: floats in the air with a smooth sine-wave bobbing motion.
        this.my.sprite.bee = this.add.sprite(1200, 400, 'enemies', 'bee.png');
        this.my.sprite.bee.play('bee-fly');
        this.my.sprite.bee.beeBaseY = 400;   // vertical midpoint of oscillation

        // ── Collider ─────────────────────────────────────────────────────────
        this.physics.add.collider(this.my.sprite.player, this.groundGroup);

        // ── Input ────────────────────────────────────────────────────────────
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyTAB = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
        this.keyR   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.keyD   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        // ── Debug graphics ───────────────────────────────────────────────────
        this.physics.world.drawDebug = false;
        this.physics.world.debugGraphic.clear();

        // ── UI ───────────────────────────────────────────────────────────────
        // World coords and font size are doubled so they appear correct at zoom 0.5.
        // (20, 20) world → (10, 10) screen; 26px font → 13px on screen.
        this.my.text.info = this.add.text(20, 20,
            'Scene: Fixed Velocity\n' +
            'Left / Right arrows: move (instant start/stop)\n' +
            'TAB: next scene  |  R: restart  |  D: physics debug',
            { fontSize: '32px', fill: '#000000', backgroundColor: '#ffffffcc', padding: { x: 12, y: 8 } }
        );

        this.playerAnim = 'player-stand';
        this.my.sprite.player.play('player-stand');
    }

    update(time, delta) {
        const player  = this.my.sprite.player;
        const cursors = this.cursors;
        const dt = delta / 1000;

        // ── Player movement: fixed velocity ───────────────────────────────────
        // setVelocityX overwrites horizontal velocity each frame.
        // Releasing the key sets velocity to 0 → instant stop.
        if (cursors.left.isDown) {
            player.setVelocityX(-this.playerSpeed);
            player.setFlipX(true);
            this.setPlayerAnim('player-walk');
        } else if (cursors.right.isDown) {
            player.setVelocityX(this.playerSpeed);
            player.setFlipX(false);
            this.setPlayerAnim('player-walk');
        } else {
            player.setVelocityX(0);
            this.setPlayerAnim('player-stand');
        }

        // ── Worm movement ─────────────────────────────────────────────────────
        const worm = this.my.sprite.worm;
        worm.x += worm.wormDir * worm.wormSpeed * dt;

        if (worm.x > 1400) { worm.wormDir = -1; worm.setFlipX(false); }
        if (worm.x < 200)  { worm.wormDir =  1; worm.setFlipX(true);  }

        // ── Bee movement: sine wave oscillation ───────────────────────────────
        const bee = this.my.sprite.bee;
        bee.y = bee.beeBaseY + Math.sin(time / 1000) * 80;

        // ── Debug toggle ─────────────────────────────────────────────────────
        if (Phaser.Input.Keyboard.JustDown(this.keyD)) {
            this.physics.world.drawDebug = !this.physics.world.drawDebug;
            if (!this.physics.world.drawDebug) {
                this.physics.world.debugGraphic.clear();
            }
        }

        // ── Scene transitions ─────────────────────────────────────────────────
        if (Phaser.Input.Keyboard.JustDown(this.keyTAB)) {
            this.scene.start('AccelerationDrag');
        }
        if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
            this.scene.restart();
        }
    }

    // Only call play() when the animation state actually changes.
    setPlayerAnim(key) {
        if (this.playerAnim !== key) {
            this.playerAnim = key;
            this.my.sprite.player.play(key);
        }
    }

    // Build a row of 13 grass tiles spanning the bottom of the world.
    // Source tiles are 128×128 px. Ground center y=1136, surface top at y=1072.
    // No setScale, no refreshBody needed.
    buildGround(group) {
        const frames = [
            'grassLeft.png',
            'grassMid.png', 'grassMid.png', 'grassMid.png', 'grassMid.png', 'grassMid.png',
            'grassMid.png', 'grassMid.png', 'grassMid.png', 'grassMid.png', 'grassMid.png',
            'grassMid.png',
            'grassRight.png'
        ];
        frames.forEach((frame, i) => {
            group.create(64 + i * 128, 1136, 'ground', frame);
        });
    }
}
