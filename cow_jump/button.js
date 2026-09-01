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
        ctx.fillStyle = this.buttonColor;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = this.textColor;
        ctx.font = this.font;
        ctx.textAlign = "center";
        ctx.fillText(this.text, this.x + this.w / 2, this.y + this.h / 1.5);
    }

    isClicked(x, y) {
        return x >= this.x && x <= this.x + this.w &&
             y >= this.y && y <= this.y + this.h;
      }
}
