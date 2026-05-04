**Arcade Physics Movement**

A demonstration of player avatar movement using Phaser's Arcade Physics.

*Fixed Velocity:* Left/right movement only using a fixed velocity. Once a key is released, movement stops immediately.

*Acceleration Drag:* Movement only using acceleration, with stopping caused by drag. Once a key is released, the avatar slows down gradually due to drag.

*Platformer Jump:* Acceleration movement left/right, and then acceleration movement for jumping, with gravity controlling the fall back to ground.

This demo also shows world boundary checking using setCollideWorldBounds(true), ground collisions using static groups, and a collider using a collision function for platform collisions.

Art assets provided by the Kenney Assets [Platformer Pack Remastered](https://kenney.nl/assets/platformer-pack-remastered), with gratitude.

Code by Claude (Sonnet 4.6), prompting by Jim Whitehead.