// --- Obstacle sprites ---
const fence = new Image();
fence.src = "images/fence.png"; // fence obstacle
const hayStack = new Image();
hayStack.src = "images/hay_stack.png"; // haystack obstacle
const tractor = new Image();
tractor.src = "images/tractor.png"; // tractor obstacle

// Every sprite is pixel art blown up by the same factor as the cow. The tractor
// used to be drawn at 5x while everything else was 3x, which made it a wall the
// cow could not clear without a frame-perfect double jump.
const SPRITE_SCALE = 3;

// Sizes and hitbox insets are written in *source* pixels and scaled once below,
// so they stay in step with the artwork. `inset` trims the drawn box down to the
// part that should actually hurt: the tractor keeps its body and wheels but not
// its exhaust pipe or cab roof, and the haystack loses its loose straw edges.
const OBSTACLE_TYPES = [
    {
        type: "fence",
        image: fence,
        chance: 0.4,
        srcWidth: 37,
        srcHeight: 21,
        inset: { left: 0, top: 3, right: 0, bottom: 0 }
    },
    {
        type: "hayStack",
        image: hayStack,
        chance: 0.4,
        srcWidth: 30,
        srcHeight: 20,
        inset: { left: 2, top: 2, right: 2, bottom: 0 }
    },
    {
        type: "tractor",
        image: tractor,
        chance: 0.2,
        srcWidth: 32,
        srcHeight: 25,
        inset: { left: 3, top: 7, right: 3, bottom: 0 }
    }
].map((type) => ({
    type: type.type,
    image: type.image,
    chance: type.chance,
    width: type.srcWidth * SPRITE_SCALE,
    height: type.srcHeight * SPRITE_SCALE,
    hitbox: {
        left: type.inset.left * SPRITE_SCALE,
        top: type.inset.top * SPRITE_SCALE,
        right: type.inset.right * SPRITE_SCALE,
        bottom: type.inset.bottom * SPRITE_SCALE
    }
}));

// --- Random obstacle ---
// `groundY` is the y coordinate the obstacle rests on; `spawnX` is the right edge
// of the screen, so it always walks in from just off-camera.
function randomObstacle(groundY, spawnX) {
    let roll = Math.random();
    let choice = OBSTACLE_TYPES[OBSTACLE_TYPES.length - 1];

    for (const type of OBSTACLE_TYPES) {
        if (roll < type.chance) {
            choice = type;
            break;
        }
        roll -= type.chance;
    }

    return {
        type: choice.type,
        image: choice.image,
        x: spawnX + Math.random() * 300, // spawn slightly off-screen
        y: groundY - choice.height,      // sits on the ground
        width: choice.width,
        height: choice.height,
        hitbox: choice.hitbox,
        passed: false
    };
}

function getHitboxForObstacle(obs) {
    const inset = obs.hitbox || { left: 0, top: 0, right: 0, bottom: 0 };

    return {
        x: obs.x + inset.left,
        y: obs.y + inset.top,
        width: obs.width - inset.left - inset.right,
        height: obs.height - inset.top - inset.bottom
    };
}
