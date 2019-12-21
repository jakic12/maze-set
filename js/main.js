const canvas = document.getElementById("mainCanvas");
const ctx = canvas.getContext("2d");

const getRandomBool = () => Math.random() > 0.5;

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

class Maze {
  constructor(size) {
    this.size = size;
    this.cells = [];
    for (let i = 0; i < size; i++) {
      this.cells[i] = [];
      for (let j = 0; j < size; j++) {
        this.cells[i][j] = new Cell(
          new Array(4).fill(0).map(e => getRandomBool())
        );
      }
    }
  }
  drawMaze() {
    this.rawWalls = [];
    for (let i = 0; i < this.cells.length; i++) {
      for (
        let j = 0;
        j < this.cells[i].length;
        j += i == 0 || i == this.cells.length - 1 ? 1 : this.cells[i].length - 1
      ) {
        console.log(i, j);
        if (i == 0) {
          this.cells[i][j].walls[0] = true;
        }

        if (j == this.cells[i].length - 1) {
          this.cells[i][j].walls[1] = true;
        }

        if (i == this.cells.length - 1) {
          this.cells[i][j].walls[2] = true;
        }

        if (j == 0) {
          this.cells[i][j].walls[3] = true;
        }
      }
    }
    this.cells.forEach((e, y) => {
      e.forEach((c, x) => {
        const x1 = x * this.cellWidth;
        const y1 = y * this.cellHeight;
        const y2 = y1 + this.cellHeight;
        const x2 = x1 + this.cellWidth;

        //console.log(x, y, x1, y1, x2, y2);

        if (c.walls[0]) {
          this.rawWalls.push(new Line({ x: x1, y: y1 }, { x: x2, y: y1 }));
          //console.log({ x: x1, y: y1 }, { x: x2, y: y1 });
        }
        if (c.walls[1]) {
          this.rawWalls.push(new Line({ x: x2, y: y1 }, { x: x2, y: y2 }));
          //console.log({ x: x2, y: y1 }, { x: x2, y: y2 });
        }
        if (c.walls[2]) {
          this.rawWalls.push(new Line({ x: x1, y: y2 }, { x: x2, y: y2 }));
          //console.log({ x: x1, y: y2 }, { x: x2, y: y2 });
        }
        if (c.walls[3]) {
          this.rawWalls.push(new Line({ x: x1, y: y1 }, { x: x1, y: y2 }));
          //console.log({ x: x1, y: y1 }, { x: x1, y: y2 });
        }
      });
    });

    const uniqueWalls = [];
    this.rawWalls.forEach(w => {
      if (
        uniqueWalls.filter(
          w1 =>
            (w1.a.x == w.a.x &&
              w1.b.x == w.b.x &&
              w1.a.y == w.a.y &&
              w1.b.y == w.b.y) ||
            (w1.a.x == w.b.x &&
              w1.b.x == w.a.x &&
              w1.a.y == w.b.y &&
              w1.b.y == w.a.y)
        ).length <= 1
      ) {
        uniqueWalls.push(w);
      } else {
        console.log("left out:", w);
      }
    });
    this.rawWalls = uniqueWalls;
    this.rawWalls.forEach(l => l.drawLine());
  }
  get cellWidth() {
    return canvas.width / this.cells.length;
  }

  get cellHeight() {
    return canvas.height / this.cells.length;
  }
}

class Cell {
  constructor(walls) {
    this.walls = walls;
  }
}

class Line {
  constructor(a, b, lineMode) {
    if (!lineMode) {
      this.a = a;
      this.b = b;

      this.k = (this.b.y - this.a.y) / (this.b.x - this.a.x);
      this.n =
        (this.a.x * this.b.y - this.b.x * this.a.y) / (this.a.x - this.b.x);
    } else {
      this.k = a;
      this.n = n;
    }
  }

  drawLine() {
    ctx.beginPath();
    ctx.moveTo(this.a.x, this.a.y);
    ctx.lineTo(this.b.x, this.b.y);
    ctx.stroke();
  }

  intersection(line) {
    if (this.k != line.k) {
      const x = (line.n - this.n) / (this.k - line.k);
      return { x, y: line.k * x + line.n };
    }
  }

  angleBetween(line) {
    return Math.arctan(Math.abs((this.k - line.k) / (1 + this.k * line.k)));
  }
}

const maze1 = new Maze(3);

const refreshCanvas = () => {
  maze1.drawMaze();

  requestAnimationFrame(refreshCanvas);
};

refreshCanvas();
