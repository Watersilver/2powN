const d = {
  none: -1,
  up: 0,
  down: 1,
  left: 2,
  right: 3
}

const t = {
  none: -1,
  player: 0,
  ai: 1,
  gameOver: 2,
  victory: 3
}

const s = {
  none: -1,
  init: 0,
  move: 1,
  moved: 2,
  next: 3
}

const restartSymbol = Symbol("Restart");

class Game {
  static turns = t;
  static steps = s;
  static directions = d;

  constructor(ui) {
    this.step = s.none;
    this.ui = ui;
  }

  start() {
    if (this.started) throw Error("Already started");
    this.started = true;

    this.loop = this._run();

    this.loop.restart = () => this.loop.next(restartSymbol);

    this.ui.start(this);

    this._loop();
  }

  _loop() {
    this.ui.update(this);

    switch (this.step) {
      case Game.steps.init:
        this.ui.init(this);
        break;
      case Game.steps.move:
        this.ui.move(this);
        break;
      case Game.steps.moved:
        this.ui.moved(this);
        break;
      case Game.steps.next:
        this.ui.next(this);
        break;
      default:
        this.ui.default(this);
        break;
    }
    requestAnimationFrame(() => this._loop());
  }

  _initialize(size, winningCondition) {

    this.turn = t.none;

    // size must be integer >= 2
    if (!(Number.isInteger(size) && size >= 2)) return false;

    // winningCondition must be positive multiple of two
    if (!(Number.isInteger(winningCondition) && !(winningCondition % 2))) return false;

    this.winningCondition = winningCondition;

    // The grid's current state
    this.grid = Array.from(new Array(size), () => (new Array(size)).fill(0));

    // Grid that shows on which squares a merge occured
    this.mergeGrid = Array.from(new Array(size), () => new Array(size).fill(false));
    this.mergeGrid.merged = 0;

    // Grid that shows how many squares a tile moved
    // (Use with direction for all the info)
    this.moveGrid = Array.from(new Array(size), () => new Array(size).fill(0));
    this.moveGrid.moved = 0;

    // Stores direction user last inputed
    this.direction = d.none;

    this.pressedKey = "";

    this.turn = t.ai;
    this._addNew();
    this.turn = t.ai;
    this._addNew();

    this.turn = t.player;

    this.initialized = true;
    return true;
  }

  // When it returns true, it loops
  * _run() {
    let fedVal;

    while (true) {

      this.step = s.init;

      while (true) {
        let options = yield true;
        options = options || {size: 4, winningCondition: 2048};
        const init = this._initialize(options.size, options.winningCondition);
        if (init) break;
      }

      while (true) {
        this.step = s.move;
        fedVal = yield this._canMove();
        if (fedVal === restartSymbol) break;

        this.step = s.moved;
        fedVal = yield this._move(fedVal);
        if (fedVal === restartSymbol) break;

        this.step = s.next;
        fedVal = yield this._addNew();
        if (fedVal === restartSymbol) break;
      }
    }
  }

  _getEmptyTile() {
    const choices = [];

    this.grid.forEach((row, i) =>
      row.forEach((tile, j) => {
        if (!tile) choices.push([i,j]);
      }));

    return choices.length ? choices[Math.floor(Math.random() * choices.length)] : [-1, -1];
  }

  _addNew() {
    if (this.turn != t.ai) return false;

    const [i, j] = this._getEmptyTile();

    if (i < 0) {
      this.turn = t.gameOver;
      return false;
    }

    const newNum = Math.random() < 0.1 ? 4 : 2;

    this.grid[i][j] = newNum;

    this.turn = t.player;

    return true;
  }

  _canMove() {
    const size = this.grid.length;
    let prevTile = -1;

    for (const dir of [d.left, d.right, d.up, d.down]) {
      const reverse = (dir === d.right || dir === d.up) ? true : false;
      const swapIJ = (dir === d.down || dir === d.up) ? true : false;
      for (let i = 0; i < size; i++) {
        prevTile = -1;
        for (let j = 0; j < size; j++) {
          const tile = swapIJ ?
          this.grid[reverse ? size-1-j : j][i] :
          this.grid[i][reverse ? size-1-j : j];
          // const tile = this.grid[i][j];
          if (tile && (!prevTile || prevTile === tile)) return true;
          prevTile = tile;
        }
      }
    }

    this.turn = t.gameOver;
    return false;
  }

  _move(dir) {
    if (this.turn != t.player) return false;

    const size = this.grid.length;
    let won = false;

    this.mergeGrid.forEach(row => row.fill(false));
    this.mergeGrid.merged = 0;
    this.moveGrid.forEach(row => row.fill(0));
    this.moveGrid.moved = 0;
    this.direction = dir;

    switch (dir) {
      case d.left: {

        for (let i = 0; i < size; i++) {

          let wall = {
            val: -1,
            i: i,
            j: -1,
            canMerge: false
          };

          for (let j = 0; j < size; j++) {
            let v = this.grid[i][j];
            if (!v) continue;

            this.grid[i][j] = 0;

            if (!(wall.canMerge && v === wall.val)) {
              wall.canMerge = true;
              wall.j++;
            } else {
              v *= 2;
              if (v >= this.winningCondition) won = true;
              wall.canMerge = false;
              this.mergeGrid[wall.i][wall.j] = true;
              this.mergeGrid.merged++;
            }
            this.grid[wall.i][wall.j] = v;
            wall.val = v;

            const moveDist = j - wall.j;
            if (moveDist) {
              this.moveGrid[i][j] = moveDist;
              this.moveGrid.moved++;
            }
          }
        }
        break;
      }
      case d.right: {

        for (let i = 0; i < size; i++) {

          let wall = {
            val: -1,
            i: i,
            j: size,
            canMerge: false
          };

          for (let j = size-1; j >= 0; j--) {
            let v = this.grid[i][j];
            if (!v) continue;

            this.grid[i][j] = 0;

            if (!(wall.canMerge && v === wall.val)) {
              wall.canMerge = true;
              wall.j--;
            } else {
              v *= 2;
              if (v >= this.winningCondition) won = true;
              wall.canMerge = false;
              this.mergeGrid[wall.i][wall.j] = true;
              this.mergeGrid.merged++;
            }
            this.grid[wall.i][wall.j] = v;
            wall.val = v;

            const moveDist = wall.j - j;
            if (moveDist) {
              this.moveGrid[i][j] = moveDist;
              this.moveGrid.moved++;
            }
          }
        }
        break;
      }
      case d.up: {

        for (let j = 0; j < size; j++) {

          let wall = {
            val: -1,
            i: -1,
            j: j,
            canMerge: false
          };

          for (let i = 0; i < size; i++) {
            let v = this.grid[i][j];
            if (!v) continue;

            this.grid[i][j] = 0;

            if (!(wall.canMerge && v === wall.val)) {
              wall.canMerge = true;
              wall.i++;
            } else {
              v *= 2;
              if (v >= this.winningCondition) won = true;
              wall.canMerge = false;
              this.mergeGrid[wall.i][wall.j] = true;
              this.mergeGrid.merged++;
            }
            this.grid[wall.i][wall.j] = v;
            wall.val = v;

            const moveDist = i - wall.i;
            if (moveDist) {
              this.moveGrid[i][j] = moveDist;
              this.moveGrid.moved++;
            }
          }
        }
        break;
      }
      case d.down: {

        for (let j = 0; j < size; j++) {

          let wall = {
            val: -1,
            i: size,
            j: j,
            canMerge: false
          };

          for (let i = size-1; i >= 0; i--) {
            let v = this.grid[i][j];
            if (!v) continue;

            this.grid[i][j] = 0;

            if (!(wall.canMerge && v === wall.val)) {
              wall.canMerge = true;
              wall.i--;
            } else {
              v *= 2;
              if (v >= this.winningCondition) won = true;
              wall.canMerge = false;
              this.mergeGrid[wall.i][wall.j] = true;
              this.mergeGrid.merged++;
            }
            this.grid[wall.i][wall.j] = v;
            wall.val = v;

            const moveDist = wall.i - i;
            if (moveDist) {
              this.moveGrid[i][j] = moveDist;
              this.moveGrid.moved++;
            }
          }
        }
        break;
      }
    }

    this.turn = won ? t.victory : (this.moveGrid.moved ? t.ai : t.player);

    return this.turn === t.ai;
  }

  print() {
    console.log("==Move===");
    this.moveGrid.forEach((row, i) => {
      console.log(i+1 + ") ["+row.join("][")+"]");
    })
    console.log("=========");

    console.log("==Merge==");
    this.mergeGrid.forEach((row, i) => {
      console.log(i+1 + ") ["+row.join("][")+"]");
    })
    console.log("=========");

    console.log("==Grid===");
    this.grid.forEach((row, i) => {
      console.log(i+1 + ") ["+row.join("][")+"]");
    })
    console.log("=========");
  }
}

export default Game