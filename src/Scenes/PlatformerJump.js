// PlatformerJump.js
// ──────────────────
// Scene: Platformer with Jumping
//
// Adds jumping to the acceleration+drag movement from AccelerationDrag scene,
// plus two floating platforms the player can land on.
//
// Key API:
//   player.body.blocked.down         true only when standing on a surface
//   player.setVelocityY(-1400)       upward jump impulse (negative = up in Phaser)
//   this.physics.add.collider(       process callback makes platforms one-way:
//       player, platforms, null,     the player can jump up through a platform
//       (p, plat) => ...)            but lands on top when falling
//
// One-way platform process callback explained:
//   The callback fires before each collision is resolved. Return false to cancel it.
//   Condition: player.body.velocity.y >= 0 && player.body.bottom <= platform.body.bottom
//     - velocity.y >= 0: player is falling (or stationary) — not jumping upward
//     - body.bottom <= platform.body.bottom: player's feet haven't passed through the
//       platform yet. This prevents collision when the player is walking ON THE GROUND
//       directly below a platform (where the player's body overlaps the platform body
//       from below, but feet are far below the platform's bottom edge).
//
// World layout:
//   Sprites are at their natural source size (no setScale).
//   camera.setZoom(0.5) makes the 1600×1200 world fill the 800×600 canvas.
//
// Level layout (world px; divide by 2 for screen px at zoom 0.5):
//   Ground tiles: 128×128, row at y=1136, surface at y=1072
//   Platform 1:   3 tiles at y=860, surface at y=796  (276 world px above ground)
//   Platform 2:   3 tiles at y=680, surface at y=616  (456 world px above ground)
//   Max jump height with velocityY=-1400, gravity=3000: ~327 world px
//   Both platforms are reachable by stairstepping: ground → P1 → P2

class PlatformerJump extends Phaser.Scene {
    constructor() {
        super('PlatformerJump');
    }

    create() {
        this.my = { sprite: {}, text: {} };

        // ── Camera & world ────────────────────────────────────────────────────
        this.cameras.main.setZoom(0.5);
        this.cameras.main.setBackgroundColor('#87ceeb');
        this.cameras.main.setBounds(0, 0, 1600, 1200);
        this.physics.world.setBounds(0, 0, 1600, 1200);

        // ── Ground (two-way collider) ─────────────────────────────────────────
        this.groundGroup = this.physics.add.staticGroup();
        this.buildGround(this.groundGroup);

        // ── Platforms (one-way collider) ─────────────────────────────────────
        this.platformGroup = this.physics.add.staticGroup();
        this.buildPlatforms(this.platformGroup);

        // ── Player ───────────────────────────────────────────────────────────
        this.my.sprite.player = this.physics.add.sprite(
            200, 944, 'players', 'alienBlue_stand.png'
        ).setCollideWorldBounds(true);

        this.my.sprite.player.setDragX(1600);

        // ── Colliders ─────────────────────────────────────────────────────────
        // Ground: standard two-way collision
        this.physics.add.collider(this.my.sprite.player, this.groundGroup);

        // Platforms: process callback runs before each collision is resolved.
        // Returning false cancels the collision for that frame.
        //
        // Two conditions must both be true for a platform collision to activate:
        //   1. player.body.velocity.y >= 0  — player is moving down (or stationary)
        //   2. player.body.bottom <= platform.body.bottom  — player's feet are still
        //      within the platform tile's body height (prevents false collisions when
        //      the player stands on the ground below a platform and their body overlaps
        //      the platform from below).
        this.physics.add.collider(
            this.my.sprite.player,
            this.platformGroup,
            null,
            (player, platform) => {
                return player.body.velocity.y >= 0 &&
                       player.body.bottom <= platform.body.bottom;
            }
        );

        // ── Enemies (decorative) ─────────────────────────────────────────────
        this.my.sprite.worm = this.add.sprite(400, 1008, 'enemies', 'wormGreen.png')
            .setFlipX(true);
        this.my.sprite.worm.play('worm-walk');
        this.my.sprite.worm.wormDir   = 1;
        this.my.sprite.worm.wormSpeed = 100;

        this.my.sprite.bee = this.add.sprite(1160, 360, 'enemies', 'bee.png');
        this.my.sprite.bee.play('bee-fly');
        this.my.sprite.bee.beeBaseY = 360;

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
            'Scene: Platformer Jump\n' +
            'Left / Right: move  |  Up arrow: jump onto platforms\n' +
            'TAB: back to scene 1  |  R: restart  |  D: physics debug',
            { fontSize: '32px', fill: '#000000', backgroundColor: '#ffffffcc', padding: { x: 12, y: 8 } }
        );

        this.playerAnim = 'player-stand';
        this.my.sprite.player.play('player-stand');
    }

    update(time, delta) {
        const player  = this.my.sprite.player;
        const cursors = this.cursors;
        let dt = delta/1000;

        // ── Horizontal movement ───────────────────────────────────────────────
        if (cursors.left.isDown) {
            player.setAccelerationX(-1200);
            player.setFlipX(true);
        } else if (cursors.right.isDown) {
            player.setAccelerationX(1200);
            player.setFlipX(false);
        } else {
            player.setAccelerationX(0);
        }

        // ── Jump ──────────────────────────────────────────────────────────────
        // body.blocked.down is true only when the physics body is resting on
        // a surface (ground or platform). This prevents jumping in mid-air.
        if (cursors.up.isDown && player.body.blocked.down) {
            player.setVelocityY(-1400);   // upward impulse; max height ≈ v²/(2g) ≈ 327 world px
        }

        // ── Animation state machine ───────────────────────────────────────────
        // Priority: airborne > walking > standing
        if (!player.body.blocked.down) {
            this.setPlayerAnim('player-jump');
        } else if (Math.abs(player.body.velocity.x) > 20) {
            this.setPlayerAnim('player-walk');
        } else {
            this.setPlayerAnim('player-stand');
        }

        // Flip sprite to match horizontal direction even while airborne
        if (player.body.velocity.x < -20) {
            player.setFlipX(true);
        } else if (player.body.velocity.x > 20) {
            player.setFlipX(false);
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
            this.scene.start('FixedVelocity');  // loop back to the beginning
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

    buildPlatforms(group) {
        // Platform 1: 3 tiles, y=860, left edge at x=320
        // Tile centers: x = 384, 512, 640
        // Surface top: 860 - 64 = 796  (138 screen px above ground at zoom 0.5)
        const p1 = ['grassLeft.png', 'grassMid.png', 'grassRight.png'];
        p1.forEach((frame, i) => {
            group.create(384 + i * 128, 860, 'ground', frame);
        });

        // Platform 2: 3 tiles, y=680, left edge at x=960
        // Tile centers: x = 1024, 1152, 1280
        // Surface top: 680 - 64 = 616  (228 screen px above ground at zoom 0.5)
        // Reachable by jumping from Platform 1 (90 screen px gap, max jump ≈ 163 screen px)
        const p2 = ['grassLeft.png', 'grassMid.png', 'grassRight.png'];
        p2.forEach((frame, i) => {
            group.create(1024 + i * 128, 680, 'ground', frame);
        });
    }
}
