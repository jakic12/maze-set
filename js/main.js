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
    this.calcRawWalls();
  }
  drawMaze() {
    this.rawWalls.forEach(l => l.drawLine());
  }

  calcRawWalls() {
    this.rawWalls = [];
    for (let i = 0; i < this.cells.length; i++) {
      for (
        let j = 0;
        j < this.cells[i].length;
        j += i == 0 || i == this.cells.length - 1 ? 1 : this.cells[i].length - 1
      ) {
        // console.log(i, j);
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
          this.rawWalls.push(
            new Line(
              { x: x1 + Math.random(), y: y1 },
              { x: x2 + +Math.random(), y: y1 }
            )
          );
          //console.log({ x: x1, y: y1 }, { x: x2, y: y1 });
        }
        if (c.walls[1]) {
          this.rawWalls.push(
            new Line(
              { x: x2 + Math.random(), y: y1 },
              { x: x2 + +Math.random(), y: y2 }
            )
          );
          //console.log({ x: x2, y: y1 }, { x: x2, y: y2 });
        }
        if (c.walls[2]) {
          this.rawWalls.push(
            new Line(
              { x: x1 + Math.random(), y: y2 },
              { x: x2 + +Math.random(), y: y2 }
            )
          );
          //console.log({ x: x1, y: y2 }, { x: x2, y: y2 });
        }
        if (c.walls[3]) {
          this.rawWalls.push(
            new Line(
              { x: x1 + Math.random(), y: y1 },
              { x: x1 + +Math.random(), y: y2 }
            )
          );
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
    ctx.beginPath();
    ctx.moveTo(this.a.x, this.a.y);
    ctx.lineTo(this.b.x, this.b.y);
    ctx.stroke();
  }

  drawLinearFunction() {
    ctx.beginPath();
    ctx.moveTo(0, this.eval(0));
    ctx.lineTo(ctx.canvas.width, this.eval(ctx.canvas.width));
    ctx.stroke();
  }

  /**
   *
   * @param {Line} wallFunction
   * @returns a new linear function
   */
  getBounceFromWall(wallFunction) {
    const ε = 0.000001;
    let intersect = this.intersection(wallFunction);
    let angleBetween = this.angleBetween(wallFunction);

    let newK = Math.tan(Math.atan(wallFunction.k) + angleBetween);

    if (Math.abs(newK - this.k) < ε) {
      newK = Math.tan(Math.atan(wallFunction.k) - angleBetween);
      console.log("new k", newK);
    }

    let newN = intersect.y - newK * intersect.x;
    console.log("bounce", newK, newN);
    return new Line(newK, newN, true);
  }

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

const distanceBetween = (a, b) =>
  Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

const extendLine = (startPoint, theta, endX) => {
  const congruentTheta = theta % (Math.PI * 2);
  const x =
    endX || (congruentTheta > -Math.PI / 2 && congruentTheta < Math.PI / 2)
      ? canvas.width
      : 0;
  return new Line(startPoint, {
    x,
    y: new Line(
      startPoint,
      {
        x: startPoint.x + Math.cos(congruentTheta) * 2,
        y: startPoint.y + Math.sin(congruentTheta) * 2
      },
      false,
      true
    ).eval(x)
  });
};

const maze1 = new Maze(3);
const startingPoint = { x: 20, y: 30 };
let angle = (Math.PI / 2) * 3 - 0.2;

const bounceLimit = 200;

maze1.calcRawWalls();

// console.log(intersections);

const getBounces = (startPoint, angle, bounceLimit = 200) => {
  const rays = [extendLine(startingPoint, angle)];
  const intersections = [{ p: startPoint }];

  let lastAngle = angle;
  let iter = 0;
  console.log("newBounceChain");
  while (true) {
    const lastIntersection = intersections[intersections.length - 1];
    const lastRay = rays[rays.length - 1];
    let closest = maze1.rawWalls
      .map(w => ({ inter: lastRay.intersection(w), wall: w }))
      .filter(w => !!w.inter && lastIntersection.w != w.wall)
      .reduce(
        (prevValue, { inter, wall }) => {
          const distance = distanceBetween(inter, lastIntersection.p);
          console.log(distance, prevValue.d, prevValue.d > distance);
          if (prevValue.d > distance) {
            return { d: distance, p: inter, w: wall };
          } else {
            return prevValue;
          }
        },
        { d: Infinity }
      );
    const newRayLinear = closest.w
      ? lastRay.getBounceFromWall(closest.w)
      : false;

    if (!closest.w) {
      console.log(`ray doesn't intersect with anything`, closest);
      break;
    }

    const startAbove =
      lastIntersection.p.y > closest.w.eval(lastIntersection.p.x);
    const leftAboveWall = newRayLinear.eval(-10) < closest.w.eval(-10);
    // const rightAboveWall = newRay.eval(canvas.width) < closest.w.eval(canvas.width);

    if (startAbove == leftAboveWall) {
      lastAngle = Math.atan(newRayLinear.k);
    } else {
      lastAngle = Math.atan(newRayLinear.k) + Math.PI;
    }

    const newRay = extendLine(closest.p, lastAngle);

    rays.push(newRay);
    intersections.push(closest);

    if (
      !newRay ||
      bounceLimit < iter ||
      newRay.distanceToPoint(startingPoint) < 0.01
    ) {
      break;
    }
    iter++;
  }

  let prettyRays = [];
  for (let i = 1; i < intersections.length; i++) {
    prettyRays.push(new Line(intersections[i - 1].p, intersections[i].p));
  }
  return { rays, intersections, prettyRays };
};

let rays = getBounces(startingPoint, angle, bounceLimit).prettyRays;

document.getElementById("angleSlider").addEventListener("input", e => {
  angle = e.target.value;
  rays = getBounces(startingPoint, angle, bounceLimit).prettyRays;
});

const refreshCanvas = () => {
  // rays = getBounces(startingPoint, angle, bounceLimit).prettyRays;
  // maze1.calcRawWalls();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  maze1.drawMaze();

  rays.forEach(l => l.drawLine());

  requestAnimationFrame(refreshCanvas);
};

refreshCanvas();
