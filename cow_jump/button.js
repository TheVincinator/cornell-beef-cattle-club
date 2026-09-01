class Button {
    constructor(x, y, w, h, text, font, textColor, buttonColor, onClick) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.text = text;
        this.font = font;
        this.textColor = textColor;
        this.buttonColor = buttonColor;
        this.onClick = onClick;
    }

    draw(ctx) {
        // Solid drop shadow plus top/bottom bevels give the flat rectangle the
        // chunky, moulded look of an arcade cabinet button.
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.fillRect(this.x + 5, this.y + 5, this.w, this.h);

        ctx.fillStyle = this.buttonColor;
        ctx.fillRect(this.x, this.y, this.w, this.h);

        ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
        ctx.fillRect(this.x, this.y, this.w, 4);
        ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
        ctx.fillRect(this.x, this.y + this.h - 4, this.w, 4);

        ctx.font = this.font;
        ctx.textAlign = "center";
        ctx.lineJoin = "round";
        ctx.lineWidth = 6;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
        ctx.strokeText(this.text, this.x + this.w / 2, this.y + this.h / 1.65);
        ctx.fillStyle = this.textColor;
        ctx.fillText(this.text, this.x + this.w / 2, this.y + this.h / 1.65);
    }

    isClicked(x, y) {
        return x >= this.x && x <= this.x + this.w &&
             y >= this.y && y <= this.y + this.h;
      }
}
