const canvas = document.getElementById("mainCanvas");
const ctx = canvas.getContext("2d");

const mazeColor = { r: 46, g: 204, b: 112 };

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
    if (props.k != undefined && props.n != undefined) {
      this.k = props.k;
      this.n = props.n;
    } else if (props.k != undefined && props.a != undefined) {
      this.k = props.k;
      this.n = props.a.y - props.k * props.a.x;
      this.a = props.a;
    } else if (props.a != undefined && props.b != undefined) {
      this.k = (props.a.y - props.b.y) / (props.a.x - props.b.x);
      this.n = props.a.y - this.k * props.a.x;

      this.a = props.a;
      this.b = props.b;
    }
  }

  drawLine() {
    drawLine(
      { x: 0, y: this.eval(0) },
      { x: ctx.canvas.width, y: this.eval(ctx.canvas.width) }
    );
  }

  eval(x) {
    return this.k * x + this.n;
  }

  inverse() {
    return new Line({ k: 1 / this.k, n: -this.n / this.k });
  }

  intersection(line) {
    if (this.k != line.k) {
      const x = (line.n - this.n) / (this.k - line.k);
      return { x, y: line.k * x + line.n };
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
    ctx.strokeStyle = `#fff`;
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
            (wallPos.a.y >= y0 && y0 >= wallPos.b.y) ||
            (wallPos.a.y <= y0 && y0 <= wallPos.b.y)
          ) {
            out.push({ x: wallPos.a.x, y: y0, horizontal: false });
          }
        } else if (line.k != 0) {
          const x0 = line.inverse().eval(wallPos.a.y);
          if (
            (wallPos.a.x >= x0 && x0 >= wallPos.b.x) ||
            (wallPos.a.x <= x0 && x0 <= wallPos.b.x)
          ) {
            out.push({ y: wallPos.a.y, x: x0, horizontal: true });
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
  }

  bounceFromPoint(point, angle, maxSteps = 100, drawLines = false) {
    if (drawLines) drawPoint(point);
    angle = angle % (2 * Math.PI);
    const rays = [
      {
        startPoint: point,
        line: new Line({
          a: point,
          k: Math.tan(angle)
        }),
        positive:
          (angle > -Math.PI / 2 && angle < Math.PI / 2) ||
          angle > (Math.PI * 3) / 2
      }
    ];
    let i;
    for (i = 0; i < maxSteps; i++) {
      const lastRay = rays[rays.length - 1];
      if (drawLines) {
        lastRay.line.drawLine();
        drawPoint(lastRay.startPoint);
      }
      const cellIntersections = []
        .concat(
          ...this.cells.map(r =>
            [].concat(...r.map(c => c.wallIntersections(lastRay.line)))
          )
        )
        .filter(p => lastRay.positive ^ (p.x < lastRay.startPoint.x))
        .filter(p => distanceBetweenPoints(lastRay.startPoint, p) > 0.001);

      if (cellIntersections.length > 0) {
        const {
          p: closestPoint,
          d: distanceToClosestPoint
        } = cellIntersections.reduce(
          (prev, p) => {
            const d = distanceBetweenPoints(lastRay.startPoint, p);
            return d < prev.d ? { p, d } : prev;
          },
          {
            p: cellIntersections[0],
            d: distanceBetweenPoints(lastRay.startPoint, cellIntersections[0])
          }
        );

        const newRayPositive = closestPoint.horizontal
          ? lastRay.positive
          : !lastRay.positive;

        rays.push({
          startPoint: closestPoint,
          line: new Line({
            a: closestPoint,
            k: -lastRay.line.k
          }),
          positive: newRayPositive
        });

        if (i > 0) {
          const closestPointToStart = new Line({
            k: -1 / lastRay.line.k,
            a: point
          }).intersection(lastRay.line);
          if (
            distanceBetweenPoints(closestPointToStart, point) <
              distanceToClosestPoint &&
            lastRay.line.distanceToPoint(point) < 1
          ) {
            break;
          }
        }
      }
    }
    return rays;
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

  drawMaze(clear = false) {
    if (clear) ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.cells.forEach(r => r.forEach(c => c.drawWalls()));
  }
}

const resizeCanvas = () => {
  const wrapper = document;
  if (window.innerWidth > 700 && window.innerHeight > 700) {
    if (window.innerHeight > window.innerWidth) {
      canvas.width = window.innerWidth - 300;
      canvas.height = window.innerWidth - 300;
    } else {
      canvas.width = window.innerHeight - 300;
      canvas.height = window.innerHeight - 300;
    }
  } else {
    canvas.width = 400;
    canvas.height = 400;
  }
};

const clearCanvas = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

window.onload = resizeCanvas();
// window.onresize = resizeCanvas;

const distanceBetweenPoints = (a, b) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

const drawLine = (a, b) => {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
};

const drawPoint = (a, r = 5) => {
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

const withFillStyle = (f, color, ...args) => {
  const prevStroke = ctx.fillStyle;
  ctx.fillStyle = color;
  f(...args);
  ctx.fillStyle = prevStroke;
};
let mazeSize = prompt(`Enter maze size(number of cells)`) | 10;
console.log(mazeSize);
maze1 = new maze(mazeSize);
let outputGif = true;
lastTime = 0;
gif = null;

// drawPixels(maze1, 2, 200, 2);
// drawSlowly(maze1, 1, 200, 100, 1, 1);
animationRunning = false;
animationShouldStop = false;

async function drawSlowly(maze, angle, maxSteps = 100, start, end, step) {
  if (!gif) {
    gif = new GIF({
      workers: 2,
      quality: 10,
      delay: 0
    });
  }
  animationRunning = true;
  console.log({ maze, angle, maxSteps, start, end, step });
  if (start >= end && !animationShouldStop) {
    //drawPixels(maze, angle, maxSteps, start, 0, false);
    await drawPixelsBetter({ maze, angle: angle, maxSteps, step: start });
    if (outputGif) {
      gif.addFrame(ctx.getImageData(0, 0, canvas.width, canvas.height), {
        delay: 10
      });
    }
    console.log(`${start}/${end}`);
    setIterationsLeft((start - end) / step);

    requestAnimationFrame(() =>
      drawSlowly(maze, angle, maxSteps, start - step, end, step)
    );
  } else {
    console.log(`ended`);
    animationRunning = false;
    showProgressBar(true);
    gif.on("finished", function(blob) {
      const url = URL.createObjectURL(blob);
      console.log(`url:`, url);
      // downloadUrl(url);
      showDownloadButton(true, url);
      gif = null;
    });
    gif.on("progress", function(percentage) {
      setProgressBarProgress(percentage);
    });

    gif.render();
  }
}

async function rotate(maze, maxSteps, step, startAngle, endAngle, angleStep) {
  if (!gif) {
    gif = new GIF({
      workers: 2,
      quality: 10,
      delay: 0
    });
  }
  animationRunning = true;
  if (startAngle <= endAngle && !animationShouldStop) {
    await drawPixelsBetter({ maze, angle: startAngle, maxSteps, step });
    console.log(`angle:`, startAngle);
    if (outputGif) {
      gif.addFrame(ctx.getImageData(0, 0, canvas.width, canvas.height), {
        delay: 10
      });
    }
    // drawProgress(startAngle / endAngle);
    setIterationsLeft((endAngle - startAngle) / angleStep);

    requestAnimationFrame(() =>
      rotate(maze, maxSteps, step, startAngle + angleStep, endAngle, angleStep)
    );
  } else if (outputGif) {
    animationRunning = false;
    showProgressBar(true);
    gif.on("finished", function(blob) {
      const url = URL.createObjectURL(blob);
      console.log(`url:`, url);
      // downloadUrl(url);
      showDownloadButton(true, url);
      gif = null;
    });
    gif.on("progress", function(percentage) {
      setProgressBarProgress(percentage);
    });

    gif.render();
  }
}

async function changeMaxSteps({
  maze,
  step,
  angle,
  startMaxSteps,
  endMaxSteps,
  maxStepsStep
}) {
  if (!gif) {
    gif = new GIF({
      workers: 2,
      quality: 10,
      delay: 0
    });
  }

  if (startMaxSteps <= endMaxSteps && !animationShouldStop) {
    await drawPixelsBetter({ maze, angle, maxSteps: startMaxSteps, step });
    if (outputGif) {
      gif.addFrame(ctx.getImageData(0, 0, canvas.width, canvas.height), {
        delay: 10
      });
    }
    setIterationsLeft((endMaxSteps - startMaxSteps) / maxStepsStep);
    requestAnimationFrame(() =>
      changeMaxSteps({
        maze,
        step,
        angle,
        startMaxSteps: startMaxSteps + maxStepsStep,
        endMaxSteps,
        maxStepsStep
      })
    );
  } else {
    animationRunning = false;
    showProgressBar(true);
    gif.on("finished", function(blob) {
      const url = URL.createObjectURL(blob);
      console.log(`url:`, url);
      showDownloadButton(true, url);
      gif = null;
    });
    gif.on("progress", function(percentage) {
      setProgressBarProgress(percentage);
    });

    gif.render();
  }
}

async function zoomIn({
  maze,
  maxSteps,
  step,
  angle,
  zoomStart,
  zoomEnd,
  zoomStep
}) {
  if (!gif) {
    gif = new GIF({
      workers: 2,
      quality: 10,
      delay: 0
    });
  }
  animationRunning = true;
  if (zoomStart <= zoomEnd && !animationShouldStop) {
    await drawPixelsBetter({ maze, angle, maxSteps, step, zoom: zoomStart });
    if (outputGif) {
      gif.addFrame(ctx.getImageData(0, 0, canvas.width, canvas.height), {
        delay: 10
      });
    }
    setIterationsLeft((zoomEnd - zoomStart) / zoomStep);
    requestAnimationFrame(() =>
      zoomIn({
        maze,
        maxSteps,
        step,
        angle,
        zoomStart: zoomStart + zoomStep,
        zoomEnd,
        zoomStep
      })
    );
  } else {
    animationRunning = false;
    showProgressBar(true);
    gif.on("finished", function(blob) {
      const url = URL.createObjectURL(blob);
      console.log(`url:`, url);
      showDownloadButton(true, url);
      gif = null;
    });
    gif.on("progress", function(percentage) {
      setProgressBarProgress(percentage);
    });

    gif.render();
  }
}

function drawPixels(
  maze,
  angle,
  maxSteps = 100,
  step = 100,
  i = 0,
  progress = true
) {
  if (i == 0) clearCanvas();
  animationRunning = true;
  if (i < canvas.width && !animationShouldStop) {
    console.log(i, canvas.width);
    for (let j = 0; j < canvas.height; j += step) {
      let bounces =
        maze.bounceFromPoint(
          { x: i + step / 2, y: j + step / 2 },
          angle,
          maxSteps
        ).length - 1;
      withFillStyle(
        () => ctx.fillRect(i, j, step, step),
        // `hsl(${(bounces / maxSteps) * 60 + 240}, 100%, 50%)`
        `rgb(${(bounces / maxSteps) * mazeColor.r}, ${(bounces / maxSteps) *
          mazeColor.g}, ${(bounces / maxSteps) * mazeColor.b})`
      );
    }
    // if (progress) drawProgress(i / canvas.width);
    requestAnimationFrame(() =>
      drawPixels(maze, angle, maxSteps, step, i + step)
    );
  } else {
    animationRunning = false;
  }
  maze.drawMaze();
}

const drawPixelsBetter = ({ maze, angle, maxSteps, step, progress, zoom }) => {
  console.log({ maze, angle, maxSteps, step, progress });
  return new Promise(res => {
    let startX = 0;
    let endX = canvas.width;

    let startY = 0;
    let endY = canvas.height;

    let scaledStep = step;

    if (zoom) {
      startX = canvas.width / 2 - canvas.width / zoom / 2;
      endX = canvas.width / 2 + canvas.width / zoom / 2;
      scaledStep = step / zoom;

      startY = canvas.height / 2 - canvas.height / zoom / 2;
      endY = canvas.height / 2 + canvas.height / zoom / 2;
    }

    animationIteratorPromise(startX, endX, scaledStep, i => {
      console.log(i, canvas.width);
      for (let j = startY; j < endY; j += scaledStep) {
        let bounces =
          maze.bounceFromPoint(
            { x: i + scaledStep / 2, y: j + scaledStep / 2 },
            angle,
            maxSteps
          ).length - 1;

        const rowI = canvas.width / 2 + (i - canvas.width / 2) * zoom;
        const rowJ = canvas.height / 2 + (j - canvas.height / 2) * zoom;

        withFillStyle(
          () => ctx.fillRect(rowI, rowJ, step, step),
          // `hsl(${(bounces / maxSteps) * 60 + 240}, 100%, 50%)`
          `rgb(${(bounces / maxSteps) * mazeColor.r}, ${(bounces / maxSteps) *
            mazeColor.g}, ${(bounces / maxSteps) * mazeColor.b})`
        );
      }
      // if (progress) drawProgress(i / canvas.width);
    }).then(() => {
      res();
    });
  });
};

const animationIterator = (from, to, step, iteratorFunction, callback) => {
  if (from < to) {
    iteratorFunction(from);
    requestAnimationFrame(() =>
      animationIterator(from + step, to, step, iteratorFunction, callback)
    );
  } else {
    callback();
  }
};

const animationIteratorPromise = (from, to, step, iteratorFunction) =>
  new Promise(res => {
    animationIterator(from, to, step, iteratorFunction, res);
  });

(async () => {
  await animationIteratorPromise(0, 10, 1, console.log);
  console.log(`DONE`);
})();
