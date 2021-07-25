import Game from "../game.js"
import Keyboard from "../Keyboard.js"
import Hammer from "hammerjs";

const keyboard = new Keyboard();

class UI1 {
  constructor(root) {
    this.root = document.createElement("div");
    this.root.classList.add("ui1");
    root.append(this.root);

    this.board = document.createElement("div");
    this.board.classList.add("board");
    this.root.append(this.board);

    this.menu = document.createElement("div");
    this.menu.classList.add("menu");
    this.root.append(this.menu);

    this.pauseTitle = document.createElement("h1");
    this.pauseTitle.innerHTML = "2 ^ n, n&#8712;&#8469;";

    this.optionsForm = document.createElement("form");
    this.optionsForm.innerHTML = `
      <label for"gridSize">Choose grid size: </label>
      <input id="gridSize" name="gridSize" type="number" required min="2">
      <label for"powerOfTwo">Choose winning condition: 2^</label>
      <input id="powerOfTwo" name="powerOfTwo" type="number" required min="2" max="${Math.log2(Number.MAX_SAFE_INTEGER)}">
      <button id="optionsSubmitButton" type="submit">Start</button>
    `;

    this.menu.append(this.pauseTitle, this.optionsForm);

    this.transDur = 0.2;

    this.paused = true;

    const mc = new Hammer(root);
    mc.get("swipe").set({ direction: Hammer.DIRECTION_ALL });
    mc.get("pan").set({ direction: Hammer.DIRECTION_ALL });

    mc.on("swipeleft", () => this.swipe = "left");
    mc.on("swiperight", () => this.swipe = "right");
    mc.on("swipeup", () => this.swipe = "up");
    mc.on("swipedown", () => this.swipe = "down");
    mc.on("press", () => this.paused = this.initialized ? !this.paused : this.paused);
  }

  getSquare(i, j) {
    return this.board.children[i * this.size + j];
  }

  newNumber(val, i, j, merged) {
    const square = this.getSquare(i, j);
    const number = document.createElement("div");

    const closeness = Math.log2(val) / Math.log2(this.maxVal);

    number.style.backgroundColor = `hsl(
      ${360 * closeness}deg,
      ${closeness * 100}%,
      ${50 + closeness * 30}%
    )`;
    // ${90 + closeness * 10}%,
    // ${40 + closeness * 20}%
    
    const width = String(val).length * 9;
    const height = 18;
    number.innerHTML = `
      <svg style=${width > height ? '"width:100%"' : '"height:100%"'} viewBox="0 0 ${width} ${height}">
        <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle">${val}</text>
      </svg>
    `;
    // x="0" y="15"

    const ratio = 100 * square.clientWidth / this.board.clientWidth;
    number.style.width = `${ratio}%`;
    number.style.height = `${ratio}%`;

    number.style.left = `${100 * square.offsetLeft / this.board.clientWidth}%`;
    number.style.top = `${100 * square.offsetTop / this.board.clientHeight}%`;

    number.style.transition = `left ${this.transDur}s ease, top ${this.transDur}s ease`;

    number.classList.add("number");

    if (merged) number.classList.add("merge");
    else number.classList.add("appear");

    square.append(number);
  }

  checkNew(game) {
    for (let i = 0; i < this.size; i++)
      for (let j = 0; j < this.size; j++) {
        const val = game.grid[i][j];
        if (!val) continue;
        // If square is empty add new
        if (!this.getSquare(i, j).children.length) {
          this.newNumber(val, i, j);
        }
      }
  }

  checkMove(game) {
    const moved = game.moveGrid.moved;
    if (!(moved && !this.moving)) return;

    for (let i = 0; i < this.size; i++)
      for (let j = 0; j < this.size; j++) {
        const mTiles = game.moveGrid[i][j];
        if (!mTiles) continue;

        let number;

        for (const num of this.getSquare(i, j).children) {
          if (num.moved) continue;
          number = num;
        }

        if (!number) continue;

        number.moved = true;

        let mi = i, mj = j;
        switch (game.direction) {
          case Game.directions.up:
            mi -= mTiles;
            break;
          case Game.directions.down:
            mi += mTiles;
            break;
          case Game.directions.left:
            mj -= mTiles;
            break;
          case Game.directions.right:
            mj += mTiles;
            break;
        }

        this.getSquare(mi, mj).prepend(number);

        // Set new position
        const target = this.getSquare(mi, mj);

        number.style.left = `${100 * target.offsetLeft / this.board.clientWidth}%`;
        number.style.top = `${100 * target.offsetTop / this.board.clientHeight}%`;

        number.classList.remove("merge");
        number.classList.remove("appear");
      }

    for (let i = 0; i < this.size; i++)
      for (let j = 0; j < this.size; j++) {
        for (const number of this.getSquare(i, j).children) {
          delete number.moved;
        }
      }

    this.moving = true;
    setTimeout(() => this.startMerge = true, this.transDur * 1000 + 30);
  }

  checkMerge(game) {
    if (!this.startMerge) return;
    this.startMerge = false;

    for (let i = 0; i < this.size; i++)
      for (let j = 0; j < this.size; j++) {
        if (this.getSquare(i, j).children.length > 1) {
          this.getSquare(i, j).textContent = "";
          this.newNumber(game.grid[i][j], i, j, true);
        }
      }

    setTimeout(() => this.moving = false, 1);
  }

  // Game Lifecycle methods
  // Runs once at beginning
  start(game) {
    this.optionsForm.addEventListener("submit", e => {
      e.preventDefault();

      const size = Math.trunc(Number(document.getElementById("gridSize").value));
      const pow = Math.trunc(Number(document.getElementById("powerOfTwo").value));

      this.options = {size, winningCondition: 2 ** pow};

      const btn = document.getElementById("optionsSubmitButton");
      btn.innerHTML = "Restart";

      this.paused = false;

      game.loop.restart();
    });
  }

  // Always runs
  update(game) {
    keyboard.update();

    if (game.turn === Game.turns.gameOver) {
      const msg = "Game Over";
      if (game.initialized && this.pauseTitle.innerHTML !== msg)
        this.pauseTitle.innerHTML = msg
      this.menu.classList.add("game-over");
      this.menu.classList.add("visible");
    } else if (game.turn === Game.turns.victory) {
      const msg = "You Win";
      if (game.initialized && this.pauseTitle.innerHTML !== msg)
        this.pauseTitle.innerHTML = msg
      this.menu.classList.add("victory");
      this.menu.classList.add("visible");
    } else if (this.paused) {
      const msg = "PAUSED";
      if (game.initialized && this.pauseTitle.innerHTML !== msg)
        this.pauseTitle.innerHTML = msg
      this.menu.classList.add("visible");
    } else {
      this.menu.classList.remove("victory");
      this.menu.classList.remove("game-over");
      this.menu.classList.remove("visible");
    }

    if (!game.initialized) return;

    if (keyboard.isPressed("KeyR")) {
      game.loop.restart();
      this.paused = false;
    }

    if (keyboard.isPressed("Escape")) {
      this.paused = !this.paused;
    }

    this.checkMerge(game);

    // Check restart
    const restart = false;

    if (restart) game.loop.restart();
  }

  // Runs if step is none
  default(game) {
    game.loop.next();
  }

  // Runs during init step
  init(game) {
    // game.loop.next(this.options || {size: 4, winningCondition: 2048});
    if (this.options) {
      game.loop.next(this.options);
    }

    if (!game.initialized) return;

    this.initialized = game.initialized;
    this.size = game.grid.length;
    this.maxVal = game.winningCondition;

    this.board.textContent = "";
    this.board.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;
    this.board.style.padding = `${1.7 * 4 / this.size}vmin`;

    this.board.append(...Array.from(Array(this.size ** 2), () => {
      const square = document.createElement("div");
      square.style.margin = `${1.7 * 4 / this.size}vmin`;
      return square;
    }));

    this.checkNew(game);
    game.print();
  }

  // Runs while waiting for input
  move(game) {
    const swipe = this.swipe;
    this.swipe = null;

    if (this.paused || this.moving || game.turn !== Game.turns.player) return;

    // Run if I am ready for input
    if (keyboard.isPressed("ArrowUp") || swipe === "up") {
      game.loop.next(Game.directions.up);
      this.checkMove(game);
    } else if (keyboard.isPressed("ArrowDown") || swipe === "down") {
      game.loop.next(Game.directions.down);
      this.checkMove(game);
    } else if (keyboard.isPressed("ArrowLeft") || swipe === "left") {
      game.loop.next(Game.directions.left);
      this.checkMove(game);
    } else if (keyboard.isPressed("ArrowRight") || swipe === "right") {
      game.loop.next(Game.directions.right);
      this.checkMove(game);
    }
  }

  // Runs after getting input
  moved(game) {
    game.loop.next();
  }

  // Runs before next iteration
  next(game) {
    game.loop.next();

    this.checkNew(game);
    game.print();
  }
}

export default UI1;