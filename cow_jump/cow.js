class Cow {
    static jumpSound = new Audio("sound_effects/cow_jump.wav");

    constructor(cow1ImageSrc, cow2ImageSrc, cowY, cowVel, gravity, jumps, frame, cowFrame, GROUND_Y) {
        const cow1Image = new Image();
        cow1Image.src = cow1ImageSrc; // first running frame
        const cow2Image = new Image();
        cow2Image.src = cow2ImageSrc; // second running frame

        this.cow1Image = cow1Image;
        this.cow2Image = cow2Image;
        this.cowY = cowY;
        this.cowVel = cowVel;
        this.gravity = gravity;
        this._jumps = jumps;

        this._frame = frame;
        this._cowFrame = cowFrame;
        this.GROUND_Y = GROUND_Y;
    }

    draw(ctx) {
        const currentCow = this._cowFrame === 0 ? this.cow1Image : this.cow2Image;
        ctx.drawImage(currentCow, this.boxX, this.cowY, this.boxW, this.boxH);
    }

    jump() {
        if (this._jumps < 2) {
            Cow.jumpSound.currentTime = 0;
            const played = Cow.jumpSound.play();
            if (played) played.catch(() => {}); // browser may block audio until first click

            if (this._jumps == 0) {
                this.cowVel = -10;
            } else {
                this.cowVel = -8;
            }
            this._jumps += 1;
        }
    }

    // Put the cow back on the ground, standing still, at frame zero.
    reset() {
        this.cowY = this.groundY;
        this.cowVel = 0;
        this._jumps = 0;
        this._frame = 0;
        this._cowFrame = 0;
    }

    set y(cowY) {
        this.cowY = cowY;
    }

    get y() {
        return this.cowY;
    }

    set velocity(velocity) {
        this.cowVel = velocity;
    }

    get velocity() {
        return this.cowVel;
    }

    set jumps(count) {
        this._jumps = count;
    }

    get jumps() {
        return this._jumps;
    }

    set cowFrame(frame) {
        this._cowFrame = frame;
    }

    get cowFrame() {
        return this._cowFrame;
    }

    get images() {
        return [this.cow1Image, this.cow2Image];
    }

    // The y coordinate at which the cow's feet rest on the ground.
    get groundY() {
        return this.GROUND_Y - this.boxH;
    }

    update() {
        // Cow physics and updates
        this.cowVel += this.gravity;
        this.cowY += this.cowVel;

        if (this.cowY > this.groundY) {
            this.cowY = this.groundY;
            this.cowVel = 0;
            this.jumps = 0;  // Use the setter
        }
    }

    animationSwitch() {
        this._cowFrame = Math.floor(this._frame / 10) % 2;
    }

    increaseFrame() {
        this._frame += 1;
    }

    get boxX() {
        return 100;
    }

    get boxW() {
        return 93;
    }

    get boxH() {
        return 72;
    }
}
