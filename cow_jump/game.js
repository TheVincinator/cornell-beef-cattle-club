const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 400;

// Every sprite is pixel art scaled up by drawImage, which bilinear-filters by
// default and turns the cow's 13 colours into ~390 muddy ones. The CSS
// `image-rendering: pixelated` does not cover this - it only applies when the
// canvas element itself is scaled - so the context has to be told directly.
ctx.imageSmoothingEnabled = false;

// --- CONSTANTS ---

// --- Game States ---
const GAME_STATE = {
    START: "START",
    PLAYING: "PLAYING",
    PAUSED: "PAUSED",
    GAME_OVER: "GAME_OVER"
  };

const GROUND_Y = 344; // the y coordinate where objects sit on the ground

// Arcade bitmap face, with a monospace fallback if Google Fonts is unreachable
const RETRO_FONT = '"Press Start 2P", "Courier New", monospace';
function retroFont(size) {
    return `${size}px ${RETRO_FONT}`;
}

// Gameplay runs on a fixed 1/60s step so the game plays at the same speed on a
// 60Hz and a 120Hz display; only the drawing happens once per animation frame.
const STEP = 1 / 60;
const COUNTDOWN_SECONDS = 3;   // "3, 2, 1" before the cow starts running
const GO_FLASH_SECONDS = 0.5;  // how long "GO!" stays up afterwards
const REPLAY_LOCKOUT = 0.6;    // ignore jump keys this long after dying

let gameStartDelay = 0;
let gameStartActive = false;
let gameOverAge = 0;

// --- Start Screen ---
let currentState = GAME_STATE.START;

// Set score
let currentScore = 0;

// --- Load Sound Effects ---
const bluegrassMusic = new Audio('music/Bluegrass_-_Sally_Goodin.WAV');
bluegrassMusic.loop = true;

const fenceImpact = new Audio("sound_effects/fence_impact.wav");
const hayImpact = new Audio("sound_effects/hay_impact.wav");
const tractorImpact = new Audio("sound_effects/tractor_impact.wav");
const cowSound = new Audio('sound_effects/cow_moo.wav');

// A 4s loop cut from the middle of the full mowing recording. The original is a
// 3-minute drive-by; the approach and fade are done here with volume instead, so
// the engine tracks whichever tractor is actually on screen.
const tractorMowing = new Audio("sound_effects/tractor_mowing_loop.wav");
tractorMowing.loop = true;

// Every sound in the game, so muting silences all of them and not just the music
const ALL_AUDIO = [bluegrassMusic, fenceImpact, hayImpact, tractorImpact, cowSound,
                   tractorMowing, Cow.jumpSound];

function playSound(sound) {
    sound.currentTime = 0; // rewind so rapid repeats always retrigger
    const played = sound.play();
    if (played) played.catch(() => {}); // browser may block audio until first click
}

// --- Tractor engine ---
// Audible once a tractor is within ENGINE_RANGE, loudest as it draws level with
// the cow. Squaring the falloff keeps it faint until the tractor is genuinely
// close rather than droning through the whole run.
const ENGINE_RANGE = 620;
const ENGINE_MAX_VOLUME = 0.55;

function updateTractorEngine() {
    let nearest = Infinity;

    for (const obs of obstacles) {
        if (obs.type !== "tractor") continue;
        const gap = Math.abs((obs.x + obs.width / 2) - (cow.boxX + cow.boxW / 2));
        if (gap < nearest) nearest = gap;
    }

    if (nearest > ENGINE_RANGE) {
        stopTractorEngine();
        return;
    }

    const closeness = 1 - nearest / ENGINE_RANGE;
    tractorMowing.volume = ENGINE_MAX_VOLUME * closeness * closeness;

    if (tractorMowing.paused) {
        const played = tractorMowing.play();
        if (played) played.catch(() => {});
    }
}

function stopTractorEngine() {
    if (!tractorMowing.paused) tractorMowing.pause();
}

function playMusic() {
    const played = bluegrassMusic.play();
    if (played) played.catch(() => {});
}

// --- Buttons ---
const startButton = new Button(320, 200, 160, 60, "START", retroFont(18), "white",  "#4CAF50", () => {
    playMusic();
    startCountdown();
    currentState = GAME_STATE.PLAYING;
  });

  const pauseButton = new Button(canvas.width / 2 - 100, canvas.height / 2 - 10, 200, 60, "RESUME", retroFont(18), "white",  "#4CAF50", () => {
    currentState = GAME_STATE.PLAYING;
    playMusic();
  });

  const replayButton = new Button(canvas.width / 2 - 100, canvas.height / 2 + 40, 200, 60, "REPLAY", retroFont(18), "white",  "#4CAF50", () => {
    resetGame();
  });

function drawStartScreen() {
    // The game world itself is the backdrop, dimmed to dusk so the title reads.
    drawLayer(background, backgroundX);
    drawLayer(foreground, foregroundX);
    cow.draw(ctx);

    ctx.fillStyle = "rgba(8, 4, 20, 0.62)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Vignette, so attention falls on the middle of the screen
    const vignette = ctx.createRadialGradient(canvas.width / 2, 200, 80,
                                              canvas.width / 2, 200, 470);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.75)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cornell-red marquee frame
    ctx.strokeStyle = "#b31b1b";
    ctx.lineWidth = 6;
    ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);

    drawBanner(104, 104);
    drawOutlinedText("BIG RED RUN", canvas.width / 2, 150, retroFont(40));
    drawOutlinedText("CORNELL BEEF CLUB", canvas.width / 2, 192, retroFont(13),
                     "center", "#ffd97a");

    startButton.draw(ctx);

    // Blinking prompt, the way a cabinet nags you for a coin
    if (Math.floor(performance.now() / 450) % 2 === 0) {
        drawOutlinedText("PRESS SPACE TO START", canvas.width / 2, 312, retroFont(13));
    }
    drawOutlinedText("SPACE JUMP  ·  P PAUSE  ·  M MUTE", canvas.width / 2, 348,
                     retroFont(9), "center", "#cfd8e8");

    drawScanlines(0.22);
    drawVolumeButton();
}

// --- Load images ---
const foreground = new Image();
foreground.src = "images/foreground.png";
const background = new Image();
background.src = "images/background.png";
const volumeOnButton = new Image();
volumeOnButton.src = "images/high-volume.png";
const volumeOffButton = new Image();
volumeOffButton.src = "images/volume-down.png";

// Foreground & Background scroll positions and speeds
let foregroundX = 0;
let backgroundX = 0;

const FOREGROUND_SPEED = 6;   // faster (closer to the camera)
const BACKGROUND_SPEED = 1.5; // slower (farther away)

const OBSTACLE_SPEED = 6;     // matches the foreground so obstacles look planted

// New cow
let cow = new Cow("images/cow-1.png", "images/cow-2.png", GROUND_Y - 72, 0, 0.4, 0, 0, 0, GROUND_Y);

// --- Obstacles ---
function spawnObstacle() {
    return randomObstacle(GROUND_Y, canvas.width);
}

let obstacles = [spawnObstacle()];

// --- Volume Control ---
const VOLUME_BUTTON = { x: 720, y: 40, w: 50, h: 50 };

let volumeOn = true;

function drawVolumeButton() {
    const icon = volumeOn ? volumeOnButton : volumeOffButton;
    ctx.drawImage(icon, VOLUME_BUTTON.x, VOLUME_BUTTON.y, VOLUME_BUTTON.w, VOLUME_BUTTON.h);
}

function toggleMute() {
    volumeOn = !volumeOn;
    for (const sound of ALL_AUDIO) {
        sound.muted = !volumeOn;
    }
}

// --- Input ---

// Canvas coordinates for a pointer event, scaled in case CSS is displaying the
// canvas at a different size than its 800x400 backing store.
function pointerPosition(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
}

// One handler for every click/tap, so mouse and touch behave identically
canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const { x, y } = pointerPosition(e);

    if (x >= VOLUME_BUTTON.x && x <= VOLUME_BUTTON.x + VOLUME_BUTTON.w &&
        y >= VOLUME_BUTTON.y && y <= VOLUME_BUTTON.y + VOLUME_BUTTON.h) {
        toggleMute();
        return;
    }

    if (currentState === GAME_STATE.START) {
        if (startButton.isClicked(x, y)) startButton.onClick();
    } else if (currentState === GAME_STATE.PAUSED) {
        if (pauseButton.isClicked(x, y)) pauseButton.onClick();
    } else if (currentState === GAME_STATE.GAME_OVER) {
        if (replayButton.isClicked(x, y)) replayButton.onClick();
    } else if (!gameStartActive) {
        cow.jump(); // tapping anywhere else jumps
    }
});

document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();

    if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault(); // stop the page from scrolling
        if (e.repeat) return; // holding the key shouldn't burn both jumps

        if (currentState === GAME_STATE.START) {
            startButton.onClick();
        } else if (currentState === GAME_STATE.PLAYING && !gameStartActive) {
            cow.jump();
        } else if (currentState === GAME_STATE.GAME_OVER && gameOverAge > REPLAY_LOCKOUT) {
            resetGame();
        }
        return;
    }

    if (key === "m") {
        toggleMute();
    } else if (key === "p") {
        if (currentState === GAME_STATE.PLAYING) {
            currentState = GAME_STATE.PAUSED;
            bluegrassMusic.pause();
            stopTractorEngine();
        } else if (currentState === GAME_STATE.PAUSED) {
            currentState = GAME_STATE.PLAYING;
            playMusic();
        }
    } else if (key === "r" && currentState === GAME_STATE.GAME_OVER) {
        resetGame();
    }
});

function startCountdown() {
    gameStartDelay = COUNTDOWN_SECONDS;
    gameStartActive = true;
}

function resetGame() {
    stopTractorEngine();
    currentScore = 0;
    cow.reset();
    obstacles = [spawnObstacle()];
    foregroundX = 0;
    backgroundX = 0;
    startCountdown();
    currentState = GAME_STATE.PLAYING;
    bluegrassMusic.currentTime = 0;
    playMusic();
}

function endGame(obs) {
    if (obs.type === "fence") {
        playSound(fenceImpact);
    } else if (obs.type === "hayStack") {
        playSound(hayImpact);
    } else {
        playSound(tractorImpact);
    }

    playSound(cowSound);
    bluegrassMusic.pause();
    stopTractorEngine();
    gameOverAge = 0;
    currentState = GAME_STATE.GAME_OVER;
}

// --- Update (fixed 1/60s step) ---

function update(dt) {
    if (gameStartActive) {
        cow.y = cow.groundY;
        gameStartDelay -= dt;
        if (gameStartDelay <= -GO_FLASH_SECONDS) {
            gameStartActive = false; // start actual gameplay after "GO!" flashes
        }
        return;
    }

    backgroundX = advanceLayer(backgroundX, BACKGROUND_SPEED);
    foregroundX = advanceLayer(foregroundX, FOREGROUND_SPEED);

    updateTractorEngine();

    // Cow physics and animation (switch frames every 10 ticks)
    cow.update();
    cow.animationSwitch();
    cow.increaseFrame();

    for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        obs.x -= OBSTACLE_SPEED; // move left

        // Check if cow passed the obstacle
        if (!obs.passed && obs.x + obs.width < cow.boxX) {
            currentScore += 1;
            obs.passed = true; // ensure score increments only once
        }

        const obsBox = getHitboxForObstacle(obs);
        if (
            cow.boxX < obsBox.x + obsBox.width &&
            cow.boxX + cow.boxW > obsBox.x &&
            cow.y < obsBox.y + obsBox.height &&
            cow.y + cow.boxH > obsBox.y
        ) {
            endGame(obs);
            return;
        }

        // recycle obstacles
        if (obs.x < -obs.width) {
            obstacles.splice(i, 1);
            i--;
            obstacles.push(spawnObstacle());
        }
    }
}

// The title card drifts slowly behind the menu, cow trotting on the spot, so the
// screen looks alive rather than frozen.
function updateAttract() {
    backgroundX = advanceLayer(backgroundX, BACKGROUND_SPEED * 0.35);
    foregroundX = advanceLayer(foregroundX, FOREGROUND_SPEED * 0.35);
    cow.animationSwitch();
    cow.increaseFrame();
}

function advanceLayer(x, speed) {
    x -= speed;

    // Wrap by exactly one screen width; snapping back to 0 skipped a few pixels
    // and made the scroll stutter once per loop.
    if (x <= -canvas.width) {
        x += canvas.width;
    }

    return x;
}

// --- Render ---

// Plain white text disappears against the sky, the hills and the club sign, so
// everything drawn over the world gets a dark outline.
function drawOutlinedText(text, x, y, font, align = "center", color = "white") {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.lineJoin = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.65)";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

// A dark band behind heading text. The club sign scrolls through the backdrop
// and its bright lettering competes with anything laid over it, so headings get
// a guaranteed backing rather than relying on the outline alone.
function drawBanner(top, height) {
    ctx.fillStyle = "#160b06";
    ctx.fillRect(29, top, canvas.width - 58, height);
    ctx.fillStyle = "#b31b1b";
    ctx.fillRect(29, top, canvas.width - 58, 4);
    ctx.fillRect(29, top + height - 4, canvas.width - 58, 4);
}

// Horizontal CRT scanlines, drawn over a finished frame.
function drawScanlines(alpha) {
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    for (let y = 0; y < canvas.height; y += 3) {
        ctx.fillRect(0, y, canvas.width, 1);
    }
}

function drawLayer(image, x) {
    // Snap to a whole pixel. The background creeps along at 1.5px per frame, and
    // drawing on a half pixel makes nearest-neighbour resample ~a quarter of the
    // columns differently every frame, which reads as a shimmer crawling across
    // the hills. Position still accumulates fractionally, so the average speed
    // is unchanged.
    const ix = Math.round(x);

    // Draw two copies for seamless looping
    ctx.drawImage(image, ix, 0, canvas.width, canvas.height);
    ctx.drawImage(image, ix + canvas.width, 0, canvas.width, canvas.height);
}

function drawGame() {
    drawLayer(background, backgroundX);
    drawLayer(foreground, foregroundX);
    drawVolumeButton();

    // Obstacles first so the cow passes in front of them
    for (const obs of obstacles) {
        ctx.drawImage(obs.image, Math.round(obs.x), Math.round(obs.y), obs.width, obs.height);
    }

    cow.draw(ctx);

    if (gameStartActive) {
        drawCountdown();
        return;
    }

    // Draw score in the top-left, clear of the club sign in the background art
    drawOutlinedText("SCORE " + currentScore, 25, 52, retroFont(20), "left");
}

function drawCountdown() {
    const countdown = Math.ceil(gameStartDelay);

    drawOutlinedText(countdown > 0 ? countdown : "GO!", canvas.width / 2, canvas.height / 2, retroFont(56));
}

// Dim, vignette, marquee frame and scanlines - the same dressing as the title
// card, so the pause and game-over screens read as part of the same cabinet.
function drawOverlayBackdrop() {
    ctx.fillStyle = "rgba(8, 4, 20, 0.68)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const vignette = ctx.createRadialGradient(canvas.width / 2, 200, 80,
                                              canvas.width / 2, 200, 470);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.75)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#b31b1b";
    ctx.lineWidth = 6;
    ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);

    drawScanlines(0.22);
}

function drawPausedScreen() {
    drawOverlayBackdrop();

    // "PAUSED" title
    drawBanner(88, 52);
    drawOutlinedText("PAUSED", canvas.width / 2, canvas.height / 2 - 80, retroFont(32));

    // Resume button
    pauseButton.draw(ctx);
}

function drawGameOverScreen() {
    drawOverlayBackdrop();

    // Title
    drawBanner(84, 112);
    drawOutlinedText("GAME OVER", canvas.width / 2, canvas.height / 2 - 80, retroFont(34));

    // Final score
    drawOutlinedText("FINAL SCORE " + currentScore, canvas.width / 2,
                     canvas.height / 2 - 24, retroFont(15), "center", "#ffd97a");

    // Replay button
    replayButton.draw(ctx);
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentState === GAME_STATE.START) {
        drawStartScreen();
        return;
    }

    drawGame();

    if (currentState === GAME_STATE.PAUSED) {
        drawPausedScreen();
    } else if (currentState === GAME_STATE.GAME_OVER) {
        drawGameOverScreen();
    }
}

// --- Main loop ---

let lastFrameTime = 0;
let stepAccumulator = 0;

function gameLoop(now) {
    if (!lastFrameTime) lastFrameTime = now;
    let elapsed = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    // A backgrounded tab can hand us a huge gap; don't fast-forward through it
    if (elapsed > 0.25) elapsed = 0.25;

    if (currentState === GAME_STATE.GAME_OVER) {
        gameOverAge += elapsed;
    }

    stepAccumulator += elapsed;
    while (stepAccumulator >= STEP) {
        stepAccumulator -= STEP;
        if (currentState === GAME_STATE.PLAYING) {
            update(STEP);
        } else if (currentState === GAME_STATE.START) {
            updateAttract();
        }
    }

    render();
    requestAnimationFrame(gameLoop);
}

// Start once the artwork is ready, but never hang if an image fails to load.
const gameImages = [background, foreground, volumeOnButton, volumeOffButton, fence, hayStack, tractor, ...cow.images];
// +1 for the webfont: starting before it arrives would draw one frame in the
// fallback face and then visibly reflow.
let pendingImages = gameImages.length + 1;
let loopStarted = false;

function startLoop() {
    if (loopStarted) return;
    loopStarted = true;
    requestAnimationFrame(gameLoop);
}

function imageSettled() {
    pendingImages -= 1;
    if (pendingImages <= 0) startLoop();
}

for (const image of gameImages) {
    if (image.complete) {
        imageSettled();
    } else {
        image.addEventListener("load", imageSettled, { once: true });
        image.addEventListener("error", imageSettled, { once: true });
    }
}

if (document.fonts && document.fonts.load) {
    document.fonts.load('16px "Press Start 2P"').then(imageSettled, imageSettled);
} else {
    imageSettled(); // very old browser: fall back to monospace immediately
}
