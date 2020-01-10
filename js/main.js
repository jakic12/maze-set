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
  constructor(props) {
    if (props.k && props.n) {
      this.k = props.k;
      this.n = props.n;
    } else if (props.k && props.a) {
      this.k = props.k;
      this.n = props.a.y - props.k * props.a.x;
    }
  }

  drawLine() {
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

  inverse() {
    return new Line({ k: 1 / this.k, n: -this.n / this.k });
  }

  intersection(line) {
    if (this.k != line.k) {
      const x = (line.n - this.n) / (this.k - line.k);
      const out = { x, y: line.k * x + line.n };
    }
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

  wallIntersections(line) {
    const out = [];
    [1, 2, 3, 4]
      .filter((e, i) => this.walls[e - 1])
      .forEach(e => {
        const wallPos = this.getWallPosition(e);
        if (e % 2 == 0) {
          const y0 = line.eval(wallPos.a.x);
          if (
            wallPos.a.y < wallPos.b.y
              ? wallPos.a.y <= y0 && y0 <= wallPos.b.y
              : wallPos.a.y >= y0 && y0 >= wallPos.b.y
          ) {
            out.push({ x: wallPos.a.x, y: y0 });
          }
        } else {
          const x0 = line.inverse().eval(wallPos.a.y);
          if (
            wallPos.a.x < wallPos.b.x
              ? wallPos.a.x <= x0 && x0 <= wallPos.b.x
              : wallPos.a.x >= x0 && x0 >= wallPos.b.x
          ) {
            out.push({ y: wallPos.a.y, x: x0 });
          }
        }
      });
    return out;
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
    this.bounceFromPoint({ x: 100, y: 100 }, 1);
  }

  bounceFromPoint(point, angle) {
    drawPoint(point);
    angle = angle % (2 * Math.PI);
    const rays = [new Line({ k: Math.atan(angle), a: point })];
    rays[rays.length - 1].drawLine();
    let rayPositive =
      (angle > -Math.PI / 2 && angle < Math.PI / 2) ||
      angle > (Math.PI * 3) / 2;

    const cells = this.getCellsThatIntersect(
      point,
      rays[rays.length - 1],
      rayPositive
    );
    const cellIntersections = [].concat(
      ...cells.map(c => c.wallIntersections(rays[rays.length - 1]))
    );

    drawPoint(
      cellIntersections.reduce(
        (prev, p) => {
          const d = distanceBetweenPoints(point, p);
          return distanceBetweenPoints(point, p) < prev ? { p, d } : prev;
        },
        {
          p: cellIntersections[0],
          d: distanceBetweenPoints(point, cellIntersections[0])
        }
      ).p
    );

    console.log(cellIntersections);
  }

  getCellsThatIntersect(startPoint, line, rayPositive) {
    const out = [];
    this.cells.forEach((r, i) =>
      r.forEach((c, j) => {
        const y1 = line.eval(c.pos.x + c.diagonal.x / 2);
        if (
          !rayPositive ^ (startPoint.x < c.pos.x + c.diagonal.x) &&
          c.pos.y < y1 &&
          c.pos.y + c.diagonal.y > y1
        ) {
          out.push(c);
        }
      })
    );

    return out;
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

const distanceBetweenPoints = (a, b) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

const drawLine = (a, b) => {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
};

const drawPoint = (a, r = 10) => {
  ctx.beginPath();
  ctx.arc(a.x, a.y, r, 0, Math.PI * 2, true);
  ctx.stroke();
  ctx.fill();
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
//maze1.drawMaze();
