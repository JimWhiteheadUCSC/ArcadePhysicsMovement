// AccelerationDrag.js
// ────────────────────
// Scene: Acceleration + Drag Movement
//
// Demonstrates physics-based movement that feels "weighty":
//   - Holding a key applies acceleration → speed builds over time
//   - Releasing the key removes acceleration → drag slows the player naturally
//   - Result: gradual start, sliding stop — more realistic than FixedVelocity
//
// Key API (compare to FixedVelocity.js):
//   player.setDragX(value)          friction-like force applied when no acceleration
//   player.setAccelerationX(value)  push force (px/s²); zero = coasting, drag takes over
//
// World layout:
//   Sprites are at their natural source size (no setScale).
//   camera.setZoom(0.5) makes the 1600×1200 world fill the 800×600 canvas.

class AccelerationDrag extends Phaser.Scene {
    constructor() {
        super('AccelerationDrag');
    }

    create() {
        this.my = { sprite: {}, text: {} };

        // ── Camera & world ────────────────────────────────────────────────────
        this.cameras.main.setZoom(0.5);
        this.cameras.main.setBackgroundColor('#87ceeb');
        this.cameras.main.setBounds(0, 0, 1600, 1200);
        this.physics.world.setBounds(0, 0, 1600, 1200);

        // ── Ground ───────────────────────────────────────────────────────────
        this.groundGroup = this.physics.add.staticGroup();
        this.buildGround(this.groundGroup);

        // ── Player ───────────────────────────────────────────────────────────
        this.my.sprite.player = this.physics.add.sprite(
            200, 944, 'players', 'alienBlue_stand.png'
        ).setCollideWorldBounds(true);

        // Drag slows the player when no acceleration is applied.
        // Higher value = quicker stop. Try changing this value to feel the difference.
        this.my.sprite.player.setDragX(1600);   // world px/s² deceleration

        // ── Enemies (decorative) ─────────────────────────────────────────────
        this.my.sprite.worm = this.add.sprite(600, 1008, 'enemies', 'wormGreen.png')
            .setFlipX(true);
        this.my.sprite.worm.play('worm-walk');
        this.my.sprite.worm.wormDir   = 1;
        this.my.sprite.worm.wormSpeed = 120;

        this.my.sprite.bee = this.add.sprite(1100, 500, 'enemies', 'bee.png');
        this.my.sprite.bee.play('bee-fly');
        this.my.sprite.bee.beeBaseY = 500;

        // ── Collider ─────────────────────────────────────────────────────────
        this.physics.add.collider(this.my.sprite.player, this.groundGroup);

        // ── Input ────────────────────────────────────────────────────────────
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyTAB  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
        this.keyR    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.keyD    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        // ── Debug graphics ───────────────────────────────────────────────────
        this.physics.world.drawDebug = false;
        this.physics.world.debugGraphic.clear();

        // ── UI ───────────────────────────────────────────────────────────────
        this.my.text.info = this.add.text(20, 20,
            'Scene: Acceleration + Drag\n' +
            'Left / Right arrows: move (feel the wind-up and slide!)\n' +
            'TAB: next scene  |  R: restart  |  D: physics debug',
            { fontSize: '32px', fill: '#000000', backgroundColor: '#ffffffcc', padding: { x: 12, y: 8 } }
        );

        this.playerAnim = 'player-stand';
        this.my.sprite.player.play('player-stand');
    }

    update(time, delta) {
        const player  = this.my.sprite.player;
        const cursors = this.cursors;
        let dt = delta / 1000;

        // ── Player movement: acceleration + drag ─────────────────────────────
        // setAccelerationX pushes the player in a direction each frame.
        // When the key is released, acceleration = 0 and drag gradually
        // reduces velocity to zero — the player slides to a stop.
        if (cursors.left.isDown) {
            player.setAccelerationX(-1200);
            player.setFlipX(true);
            this.setPlayerAnim('player-walk');
        } else if (cursors.right.isDown) {
            player.setAccelerationX(1200);
            player.setFlipX(false);
            this.setPlayerAnim('player-walk');
        } else {
            player.setAccelerationX(0);
            // Only switch to standing when nearly stopped, to avoid flickering
            if (Math.abs(player.body.velocity.x) < 20) {
                this.setPlayerAnim('player-stand');
            }
        }

        // ── Worm movement ─────────────────────────────────────────────────────
        const worm = this.my.sprite.worm;
        worm.x += worm.wormDir * worm.wormSpeed * dt;

        if (worm.x > 1400) { worm.wormDir = -1; worm.setFlipX(false);  }
        if (worm.x < 200)  { worm.wormDir =  1; worm.setFlipX(true); }

        // ── Bee movement ──────────────────────────────────────────────────────
        const bee = this.my.sprite.bee;
        bee.y = bee.beeBaseY + Math.sin(time / 1000) * 60;

        // ── Debug toggle ─────────────────────────────────────────────────────
        if (Phaser.Input.Keyboard.JustDown(this.keyD)) {
            this.physics.world.drawDebug = !this.physics.world.drawDebug;
            if (!this.physics.world.drawDebug) {
                this.physics.world.debugGraphic.clear();
            }
        }

        // ── Scene transitions ─────────────────────────────────────────────────
        if (Phaser.Input.Keyboard.JustDown(this.keyTAB)) {
            this.scene.start('PlatformerJump');
        }
        if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
            this.scene.restart();
        }
    }

    setPlayerAnim(key) {
        if (this.playerAnim !== key) {
            this.playerAnim = key;
            this.my.sprite.player.play(key);
        }
    }

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
