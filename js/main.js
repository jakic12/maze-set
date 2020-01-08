const canvas = document.getElementById("mainCanvas");
const ctx = canvas.getContext("2d");

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class Line {
  /**
   *
   * @param {*} a point a or k
   * @param {*} b point b or n
   * @param {*} lineMode if this is true, you can init the Line with k and n
   * @param {*} pointLineMode if this is true, you can init the line with a and b but they are not saved and a infinite linear function is made
   */
  constructor(a, b, lineMode, pointLineMode) {
    if (!lineMode) {
      if (!pointLineMode) {
        this.a = a;
        this.b = b;
      }

      this.k = (b.y - a.y) / (b.x - a.x);
      this.n = (a.x * b.y - b.x * a.y) / (a.x - b.x);
    } else {
      this.k = a;
      this.n = b;
    }
  }

  drawLine() {
    drawLine(this.a, this.b);
  }

  drawLinearFunction() {
    drawLine(
      { x: 0, y: this.eval(0) },
      { x: ctx.canvas.width, y: this.eval(ctx.canvas.width) }
    );
  }

  /**
   *
   * @param {Line} wallFunction
   * @returns a new linear function
   */
  getBounceFromWall(wallFunction) {}

  eval(x) {
    return this.k * x + this.n;
  }

  intersection(line) {
    if (this.k != line.k) {
      const x = (line.n - this.n) / (this.k - line.k);
      const out = { x, y: line.k * x + line.n };
      // if (!(line.intersectionValid(out) && this.intersectionValid(out)))
      // console.log(out, line.intersectionValid(out) ? this : line);
      if (line.intersectionValid(out) && this.intersectionValid(out))
        return out;
    }
  }

  intersectionValid(point) {
    const errorMargin = 0.01;
    return (
      (!this.a && !this.b) ||
      (((point.x >= this.a.x - errorMargin &&
        point.x <= this.b.x + errorMargin) ||
        (point.x >= this.b.x - errorMargin &&
          point.x <= this.a.x + errorMargin)) &&
        ((point.y >= this.a.y - errorMargin &&
          point.y <= this.b.y + errorMargin) ||
          (point.y >= this.b.y - errorMargin &&
            point.y <= this.a.y + errorMargin)))
    );
  }

  distanceToPoint(point) {
    return (
      Math.abs(this.n + this.k * point.x - point.y) / Math.sqrt(1 + this.k ** 2)
    );
  }

  angleBetween(line) {
    return Math.atan(Math.abs((this.k - line.k) / (1 + this.k * line.k)));
  }
}

class cell {
  /**
   *
   * @param {*} pos
   * @param {*} diagonal width and height of the cell => properties x,y
   */
  constructor(pos, diagonal, walls) {
    this.pos = pos;
    this.diagonal = diagonal;
    this.walls = walls;
  }

  /**
   *
   * @param {*} position 1 - top, 2 - right, 3 - bottom, 4 - left
   */
  getWallPosition(position) {
    const a = {};
    const b = {};

    switch (position) {
      case 1:
        a.x = this.pos.x;
        a.y = this.pos.y;
        b.x = a.x + this.diagonal.x;
        b.y = a.y;
        break;
      case 2:
        a.x = this.pos.x + this.diagonal.x;
        a.y = this.pos.y;
        b.x = a.x;
        b.y = a.y + this.diagonal.y;
        break;
      case 3:
        a.x = this.pos.x;
        a.y = this.pos.y + this.diagonal.y;
        b.x = a.x + this.diagonal.x;
        b.y = a.y;
        break;
      case 4:
        a.x = this.pos.x;
        a.y = this.pos.y;
        b.x = a.x;
        b.y = a.y + this.diagonal.y;
        break;
    }

    return { a, b };
  }

  drawWalls() {
    this.walls.forEach((w, i) => {
      if (w) {
        const wallLine = this.getWallPosition(i + 1);
        if (w == 2) withWidth(() => drawLine(wallLine.a, wallLine.b), 10);
        else drawLine5(wallLine.a, wallLine.b);
      }
    });
  }
}

class maze {
  constructor(cellCount) {
    this.cells = [];
    for (let i = 0; i < cellCount; i++) {
      this.cells[i] = [];
      for (let j = 0; j < cellCount; j++) {
        this.cells[i].push(
          new cell(
            {
              x: (canvas.width / cellCount) * j,
              y: (canvas.height / cellCount) * i
            },
            { x: canvas.width / cellCount, y: canvas.height / cellCount },
            new Array(4).fill(true) //.map(() => Math.random() > 0.5)
          )
        );
      }
    }

    this.generateWalls({ x: 0, y: 0 });
  }

  generateWalls(startPoint) {
    this.visited = [];
    this.getWalls(startPoint);
  }

  cellVisited(cellIndices) {
    return !!this.visited.find(
      a => a.x == cellIndices.x && a.y == cellIndices.y
    );
  }

  /**
   *
   * @param {Object} startPoint grid coordinate point eg.: (cell 2,3)
   */
  getWalls(startPoint) {
    this.drawMaze();
    this.visited.push(startPoint);
    const wallsToLookAt = shuffle([
      { x: 0, y: -1, d: 0 },
      { x: 1, y: 0, d: 1 },
      { x: 0, y: 1, d: 2 },
      { x: -1, y: 0, d: 3 }
    ]);
    wallsToLookAt.forEach(w => {
      const newCoord = { x: startPoint.x + w.x, y: startPoint.y + w.y };
      if (
        newCoord.x < 0 ||
        newCoord.y < 0 ||
        newCoord.y >= this.cells.length ||
        newCoord.x >= this.cells[0].length ||
        this.cellVisited(newCoord)
      ) {
      } else {
        this.cellAt(startPoint).walls[w.d] = false;
        this.cellAt(newCoord).walls[(w.d + 2) % 4] = false;
        this.drawMaze();
        this.getWalls(newCoord);
      }
    });
  }

  cellAt(a) {
    return this.cells[a.y][a.x];
  }

  drawMaze() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.cells.forEach(r => r.forEach(c => c.drawWalls()));
  }
}

const resizeCanvas = () => {
  const wrapper = document;
  if (window.innerHeight > window.innerWidth) {
    canvas.width = window.innerWidth - 100;
    canvas.height = window.innerWidth - 100;
  } else {
    canvas.width = window.innerHeight - 100;
    canvas.height = window.innerHeight - 100;
  }
};

window.onload = resizeCanvas();
window.onresize = resizeCanvas;

const drawLine = (a, b) => {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
};

const drawLine5 = (a, b) => {
  withWidth(() => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }, 5);
};

const withWidth = (f, width, ...args) => {
  const prevStroke = ctx.lineWidth;
  ctx.lineWidth = width;
  f(...args);
  ctx.lineWidth = prevStroke;
};

maze1 = new maze(20);
maze1.drawMaze();
