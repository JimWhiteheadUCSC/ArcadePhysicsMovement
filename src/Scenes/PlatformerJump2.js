// PlatformerJump2.js
// ──────────────────
// Scene: Advanced Platformer Jump
//
// Extends PlatformerJump with three game-feel improvements:
//
// 1. Height-based jump configuration
//    Instead of tuning a raw velocityY, set JUMP_HEIGHT (world px to rise) and
//    GRAVITY_MULT (how fast the player falls relative to the world). The required
//    initial velocity is derived from kinematics:
//
//       v² = 2gh   →   v = sqrt(2 * totalGravity * JUMP_HEIGHT)
//
//    GRAVITY_MULT is applied per-body via body.setGravityY() so world gravity
//    stays constant while this player falls faster than other objects.
//    body.setGravityY is ADDITIVE — it adds to world gravity, not replaces it:
//
//       totalGravity      = WORLD_GRAVITY * GRAVITY_MULT
//       body.setGravityY  = WORLD_GRAVITY * (GRAVITY_MULT - 1)
//
// 2. Double jump
//    The player gets MAX_JUMPS jumps before needing to touch the ground.
//    jumpsRemaining resets every frame while body.blocked.down is true.
//
// 3. Jump buffer
//    Pressing jump up to JUMP_BUFFER_MS ms before landing is "remembered" and
//    fires the instant the player touches down. Makes inputs feel responsive even
//    when the timing is slightly early.
//
//    All three cases are handled by one unified condition:
//      jumpsRemaining > 0 && (time - jumpBufferTimer) < JUMP_BUFFER_MS
//
//    Normal jump:   grounded + just pressed → buffer fresh, jumpsRemaining = MAX_JUMPS
//    Double jump:   airborne + just pressed → buffer fresh, jumpsRemaining > 0
//    Buffered jump: pressed just before landing → buffer still young, jumpsRemaining
//                   just reset by the grounded check in the same frame
//
// Level layout (world px; divide by 2 for screen px at zoom 0.5):
//   Platform 1: surface y=796  (276 px above ground) — reachable with single jump
//   Platform 2: surface y=616  (180 px above P1)     — reachable with single jump from P1
//   Platform 3: surface y=420  (376 px above P1)     — requires double jump from P1

class PlatformerJump2 extends Phaser.Scene {
    constructor() {
        super('PlatformerJump2');
    }

    create() {
        this.my = { sprite: {}, text: {} };

        // ── Jump tuning parameters ────────────────────────────────────────────
        //
        // Adjust these to feel — the jump velocity is calculated automatically.
        //
        // JUMP_HEIGHT:    Desired peak rise above the jump point, in world px.
        // GRAVITY_MULT:   Player falls at this multiple of world gravity (1000 px/s²).
        //                 Higher values = snappier, less floaty arc.
        //                 Only this body is affected; other physics objects unchanged.
        // MAX_JUMPS:      1 = standard, 2 = double jump, etc.
        // JUMP_BUFFER_MS: Window (ms) during which a jump press before landing still fires.
        this.JUMP_HEIGHT    = 320;   // world px
        this.GRAVITY_MULT   = 2.0;   // multiplier on world gravity (must be >= 1)
        this.MAX_JUMPS      = 2;     // jumps available before requiring ground contact
        this.JUMP_BUFFER_MS = 150;   // ms

        // World gravity must match arcade.gravity.y in main.js
        this.WORLD_GRAVITY = 1000;

        // Derived values — recalculate whenever JUMP_HEIGHT or GRAVITY_MULT changes
        const totalG = this.WORLD_GRAVITY * this.GRAVITY_MULT;
        this.JUMP_VELOCITY = -Math.sqrt(2 * totalG * this.JUMP_HEIGHT); // negative = upward

        // Jump state
        this.jumpsRemaining  = this.MAX_JUMPS;
        this.jumpBufferTimer = -Infinity;   // timestamp of last jump keypress; -Infinity = no pending buffer

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

        // body.setGravityY is additive: total = worldGravity + bodyGravityY
        // We want total = WORLD_GRAVITY * GRAVITY_MULT, so:
        //   bodyGravityY = WORLD_GRAVITY * (GRAVITY_MULT - 1)
        this.my.sprite.player.body.setGravityY(
            this.WORLD_GRAVITY * (this.GRAVITY_MULT - 1)
        );

        // ── Colliders ─────────────────────────────────────────────────────────
        this.physics.add.collider(this.my.sprite.player, this.groundGroup);

        // One-way platforms: only collide when player is falling and hasn't
        // passed through the tile (allows jumping up through platforms).
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
            'Scene: Advanced Platformer\n' +
            'Left / Right: move  |  Up: jump (double jump!)  |  Platform 3 needs double jump\n' +
            'TAB: back to scene 1  |  R: restart  |  D: physics debug',
            { fontSize: '32px', fill: '#000000', backgroundColor: '#ffffffcc', padding: { x: 12, y: 8 } }
        );

        this.playerAnim = 'player-stand';
        this.my.sprite.player.play('player-stand');
    }

    update(time, delta) {
        const player  = this.my.sprite.player;
        const cursors = this.cursors;
        let dt = delta / 1000;

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

        // ── Step 1: Record jump input ─────────────────────────────────────────
        // Store the timestamp every time jump is pressed, whether grounded or not.
        // This timestamp is what enables both double jump and the jump buffer.
        if (Phaser.Input.Keyboard.JustDown(cursors.up)) {
            this.jumpBufferTimer = time;
        }

        // ── Step 2: Reset jump count on landing ───────────────────────────────
        // body.blocked.down is true every frame the player rests on a surface,
        // so jumpsRemaining is replenished for as long as the player is grounded.
        if (player.body.blocked.down) {
            this.jumpsRemaining = this.MAX_JUMPS;
        }

        // ── Step 3: Execute jump ──────────────────────────────────────────────
        // One condition covers all three cases:
        //
        //   Normal jump:   player pressed jump while grounded
        //                  → buffer just set, jumpsRemaining = MAX_JUMPS from step 2
        //
        //   Double jump:   player pressed jump while airborne, has jumps left
        //                  → buffer just set, step 2 skipped (not grounded)
        //
        //   Buffered jump: player pressed jump slightly before landing
        //                  → buffer still within window, step 2 just reset jumpsRemaining
        if (this.jumpsRemaining > 0 && (time - this.jumpBufferTimer) < this.JUMP_BUFFER_MS) {
            player.setVelocityY(this.JUMP_VELOCITY);
            this.jumpsRemaining--;
            this.jumpBufferTimer = -Infinity;   // consume the press so it only fires once
        }

        // ── Animation state machine ───────────────────────────────────────────
        if (!player.body.blocked.down) {
            this.setPlayerAnim('player-jump');
        } else if (Math.abs(player.body.velocity.x) > 20) {
            this.setPlayerAnim('player-walk');
        } else {
            this.setPlayerAnim('player-stand');
        }

        if (player.body.velocity.x < -20) {
            player.setFlipX(true);
        } else if (player.body.velocity.x > 20) {
            player.setFlipX(false);
        }

        // ── Worm movement ─────────────────────────────────────────────────────
        const worm = this.my.sprite.worm;
        worm.x += worm.wormDir * worm.wormSpeed * dt;

        if (worm.x > 1400) { worm.wormDir = -1; worm.setFlipX(false); }
        if (worm.x < 200)  { worm.wormDir =  1; worm.setFlipX(true);  }

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
            this.scene.start('FixedVelocity');
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
        // Platform 1: surface y=796 (276 px above ground) — reachable with one jump
        const p1 = ['grassLeft.png', 'grassMid.png', 'grassMid.png', 'grassRight.png'];
        p1.forEach((frame, i) => {
            group.create(384 + i * 128, 860, 'ground', frame);
        });

        // Platform 2: surface y=616 (180 px above P1) — reachable with one jump from P1
        const p2 = ['grassLeft.png', 'grassMid.png', 'grassRight.png'];
        p2.forEach((frame, i) => {
            group.create(1024 + i * 128, 680, 'ground', frame);
        });

        // Platform 3: surface y=420 (376 px above P1, exceeds single jump height of 320)
        // Requires a double jump from Platform 1 to reach.
        const p3 = ['grassLeft.png', 'grassMid.png', 'grassRight.png'];
        p3.forEach((frame, i) => {
            group.create(384 + i * 128, 484, 'ground', frame);
        });
    }
}
