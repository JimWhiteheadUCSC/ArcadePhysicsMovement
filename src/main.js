// main.js
// Creates the single Phaser.Game instance for the whole project.
// All four scenes are registered here; the game starts with 'Load'.
//
// World layout note:
//   Sprites are used at their natural (source) pixel size — no setScale().
//   Each playable scene sets camera zoom to 0.5, making the 1600×1200 world
//   appear as an 800×600 view. Physics body dimensions always match sprite
//   visuals exactly, with no manual body-size correction needed.

const config = {
    type: Phaser.AUTO,          // WebGL if available, fallback to Canvas
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 1000 },  // 3000 px/s² in 1600×1200 world
                                          // = same on-screen feel as 1500 in an 800×600 world
            debug: true                   // enables debug graphics (hidden by default; press D to toggle)
        }
    },
    scene: [Load, FixedVelocity, AccelerationDrag, PlatformerJump, PlatformerJump2]
};

const game = new Phaser.Game(config);
