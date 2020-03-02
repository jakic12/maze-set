const canvas = document.getElementById("mainCanvas");
const ctx = canvas.getContext("2d");

const mazeColor = { r: 46, g: 204, b: 112 };

const DIR = {
  TOP: 1,
  RIGHT: 2,
  BOTTOM: 3,
  LEFT: 4
};

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
      case DIR.TOP:
        a.x = this.pos.x;
        a.y = this.pos.y;
        b.x = a.x + this.diagonal.x;
        b.y = a.y;
        break;
      case DIR.RIGHT:
        a.x = this.pos.x + this.diagonal.x;
        a.y = this.pos.y;
        b.x = a.x;
        b.y = a.y + this.diagonal.y;
        break;
      case DIR.BOTTOM:
        a.x = this.pos.x;
        a.y = this.pos.y + this.diagonal.y;
        b.x = a.x + this.diagonal.x;
        b.y = a.y;
        break;
      case DIR.LEFT:
        a.x = this.pos.x;
        a.y = this.pos.y;
        b.x = a.x;
        b.y = a.y + this.diagonal.y;
        break;
    }

    return { a, b };
  }

  drawWalls() {
    ctx.strokeStyle = `#1F2833`;
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
    this.cellCount = cellCount;
  }

  drawRect(cellX, cellY, color) {
    const cellSizeX = canvas.width / this.cellCount;
    const cellSizeY = canvas.height / this.cellCount;

    ctx.beginPath();
    withFillStyle(() => {
      ctx.fillRect(cellX * cellSizeX, cellY * cellSizeY, cellSizeX, cellSizeY);
    }, color);
    ctx.stroke();
  }

  cellToPixelCoordinates({ x, y }) {
    const cellSizeX = canvas.width / this.cellCount;
    const cellSizeY = canvas.height / this.cellCount;

    return { x: x * cellSizeX, y: y * cellSizeY };
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

class Player {
  constructor(
    x,
    y,
    direction,
    maze,
    playerColor = "#66FCF1",
    trailColor = "#45A29E"
  ) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.playerHistory = [];
    this.maze = maze;

    this.playerColor = playerColor;
    this.trailColor = trailColor;
  }

  drawPlayer() {
    this.playerHistory.map(point => {
      this.maze.drawRect(point.x, point.y, this.trailColor);
    });
    this.maze.drawRect(this.x, this.y, this.playerColor);
    this.maze.drawMaze(false);
  }

  /**
   * @returns if the game should end
   */
  movePlayer() {
    this.playerHistory.push({ x: this.x, y: this.y });
    if (this.maze.cells[this.y][this.x].walls[this.direction - 1]) {
      return true;
    } else {
      switch (this.direction) {
        case DIR.TOP:
          this.y -= 1;
          break;
        case DIR.LEFT:
          this.x -= 1;
          break;
        case DIR.RIGHT:
          this.x += 1;
          break;
        case DIR.BOTTOM:
          this.y += 1;
          break;
      }
    }
  }

  wallOnDirection(direction) {
    return this.maze.cells[this.y][this.x].walls[direction - 1];
  }

  getPixelPosition() {
    return this.maze.cellToPixelCoordinates({ x: this.x, y: this.y });
  }
}
class Sound {
  constructor(songs, bpm, beatCallback) {
    this.dom = document.createElement("audio");
    this.songId = 0;
    this.songs = songs;
    this.dom.src = songs[this.songId];
    this.dom.setAttribute("preload", "auto");
    this.dom.setAttribute("controls", "none");
    this.dom.style.display = "none";
    document.body.appendChild(this.dom);
    this.bpm = bpm;
    this.beatCallbacks = [beatCallback];
    this.dom.addEventListener("ended", () => {
      this.ended();
    });
  }

  removeCallback(f) {
    this.beatCallbacks = this.beatCallbacks.filter(g => g !== f);
  }

  addCallback(f) {
    this.beatCallbacks.push(f);
  }

  play() {
    this.dom.play();
    if (this.bpm && !this.interval) {
      this.interval = setInterval(() => {
        this.beatCallbacks.map(f => f());
      }, 1000 / (this.bpm / 60));
    }
  }

  stop() {
    this.dom.pause();
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  ended() {
    this.stop();
    this.songId = (this.songId + 1) % this.songs.length;
    this.dom.src = this.songs[this.songId];
    this.dom.load();
    this.play();
  }
}

class Glow {
  constructor(dom, color, bpm) {
    this.glowAmount = 0;
    this.dom = dom;
    this.glowLoop = this.glowLoop.bind(this);
    this.interval = setInterval(this.glowLoop, 0);
    this.glowSpeed = (0.01 * bpm * 2) / 240;
    this.color = color;
  }

  stop() {
    clearInterval(this.interval);
  }

  glowBeat() {
    this.glowAmount = 1;
  }

  glowLoop() {
    this.dom.style.boxShadow = `0px 0px 14px ${this.glowAmount * 17 - 8}px ${
      this.color
    }`;
    this.dom.parentElement.style.transform = ` scale(${this.glowAmount * 0.1 +
      1})`;

    if (this.glowAmount > 0) {
      this.glowAmount -= this.glowSpeed;
    }
  }
}

class Camera {
  constructor(canvas, settings) {
    this.moveSpeed = (settings && settings.moveSpeed) || 0.006;
    this.rotationSpeed = (settings && settings.rotationSpeed) || 0.03;
    this.canvas = canvas;

    this.cameraLoop = this.cameraLoop.bind(this);
  }

  startCamera() {
    if (!this.started) {
      this.stop = false;
      this.canvas.style.transformOrigin = `50% 50%`;
      this.interval = setInterval(this.cameraLoop, 0);
      this.started = true;
    }
  }

  /**
   * internal function
   */
  cameraLoop() {
    this.moveCameraInternal();
    this.rotateCameraInternal();
    this.updateTransform();
  }

  stopCamera() {
    this.stop = true;
    this.started = false;
    clearInterval(this.interval);
  }

  /**
   * internal function
   */
  moveCameraInternal() {
    if (this.targetX !== undefined) {
      if (this.x === undefined) {
        this.x = this.targetX;
      } else {
        this.x += (this.targetX - this.x) * this.moveSpeed;
      }
    }

    if (this.targetY !== undefined) {
      if (this.y === undefined) {
        this.y = this.targetY;
      } else {
        this.y += (this.targetY - this.y) * this.moveSpeed;
      }
    }
  }

  /*
   * internal function
   */
  rotateCameraInternal() {
    if (this.targetAngle !== undefined) {
      if (this.angle === undefined) {
        this.angle = this.targetAngle;
      } else {
        this.angle += (this.targetAngle - this.angle) * this.rotationSpeed;
      }
    }
  }

  /*
   * internal function
   */
  updateTransform() {
    let transform = ``;
    if (this.x !== undefined && this.y !== undefined) {
      const transformed = this.getTransformedCoordinates(
        {
          x: this.x - this.canvas.width / 2,
          y: this.y - this.canvas.height / 2
        },
        -this.angle || 0
      );
      this.canvas.style.left = `${-transformed.x - this.canvas.width / 2}px`;
      this.canvas.style.top = `${-transformed.y - this.canvas.height / 2}px`;
    } else {
      this.canvas.style.left = `${this.canvas.width / 2}px`;
      this.canvas.style.top = `${this.canvas.height / 2}px`;
    }
    if (this.angle !== undefined) {
      transform = `rotate(${-this.angle}deg)`;
    }
    this.canvas.style.transform = transform;
  }

  /**
   * gets the coordinates from a system with theta angle
   */
  getTransformedCoordinates(pos, theta) {
    const degrees = (theta * Math.PI) / 180;
    return {
      x: pos.x * Math.cos(degrees) - pos.y * Math.sin(degrees),
      y: pos.x * Math.sin(degrees) + pos.y * Math.cos(degrees)
    };
  }

  setCameraTargetPosition(pos) {
    this.targetX = pos.x;
    this.targetY = pos.y;
  }

  setCameraTargetRotation(angle) {
    this.targetAngle = angle;
  }

  setCameraDirection(direction) {
    const prevDir = this.direction;

    switch (direction) {
      case DIR.TOP:
        this.setCameraTargetRotation(0);
        break;
      case DIR.LEFT:
        this.setCameraTargetRotation(270);
        break;
      case DIR.RIGHT:
        this.setCameraTargetRotation(90);
        break;
      case DIR.BOTTOM:
        this.setCameraTargetRotation(180);
        break;
    }
  }
}
class Game {
  /**
   *
   * @param {Object} controls {key: direction}
   */
  constructor(
    maze,
    frameDelay = 500,
    controls = {
      ArrowUp: [DIR.TOP],
      ArrowDown: [DIR.BOTTOM],
      ArrowLeft: [DIR.LEFT],
      ArrowRight: [DIR.RIGHT]
    },
    end = { x: maze.cellCount - 1, y: maze.cellCount - 1 },
    colors = {
      playerColor: "#EE4540",
      trailColor: "#801336",
      endColor: "#C72C41"
    },
    cameraMode = true,
    bpm = 120
  ) {
    this.controls = controls;
    this.controlStates = {};
    this.frameDelay = frameDelay;
    this.maze = maze;
    this.end = end;
    this.colors = colors;
    this.music = {
      120: [`music/tya.mp3`],
      214: [`music/214-1.mp3`],
      428: [`music/214-1.mp3`]
    };
    this.bpm = bpm;

    this.camera = new Camera(canvas);

    this.gameLoop = this.gameLoop.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);

    this.levelsDone = 0;
    this.streak = 0;
    this.lastDeaths = 0;
  }

  prepare() {
    this.updatePlayerStats();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (this.camera) {
      this.camera.startCamera();
    }
    this.gameStop = false;
    this.player = new Player(
      0,
      0,
      this.maze.cells[0][0].walls.reduce((prev, value, index) => {
        if (prev == -1) {
          if (value == false) return index + 1;
          else return -1;
        } else {
          return prev;
        }
      }, -1),
      this.maze,
      this.colors.playerColor,
      this.colors.trailColor
    );

    addEventListener("keydown", this.handleKeyDown);
    addEventListener("keyup", this.handleKeyUp);

    this.drawEnd();
    this.player.drawPlayer();
    if (this.camera) {
      this.camera.setCameraTargetPosition(this.player.getPixelPosition());
      this.camera.setCameraDirection(this.player.direction);
    }
  }

  handleKeyDown(evt) {
    if (this.controls[evt.key])
      this.controlStates[this.controls[evt.key]] = true;
    this.movePlayerToDirection();
  }

  handleKeyUp(evt) {
    if (this.controls[evt.key])
      this.controlStates[this.controls[evt.key]] = false;
  }

  start(resetBackground) {
    if (!this.backgroundMusic || resetBackground)
      this.backgroundMusic = new Sound(
        this.music[this.bpm],
        this.bpm,
        this.gameLoop
      );
    else this.backgroundMusic.addCallback(this.gameLoop);
    this.backgroundMusic.play();
    if (!this.glow) {
      this.glow = new Glow(canvas, this.colors.playerColor, this.bpm);
      this.backgroundMusic.addCallback(() => this.glow.glowBeat());
    }
  }

  movePlayerToDirection() {
    let moved = false;
    Object.keys(this.controlStates).map(direction => {
      direction = +direction;
      if (!moved && this.controlStates[direction]) {
        this.cachedDirection = this.relativeDirectionToAbsolute(direction);
      }
    });
  }

  gameLoop() {
    if (
      this.cachedDirection &&
      this.player.direction % 2 != this.cachedDirection % 2 &&
      !this.player.wallOnDirection(this.cachedDirection)
    ) {
      this.player.direction = this.cachedDirection;
    }
    if (this.player.movePlayer()) {
      this.gameStop = true;
      this.gameLost();
    }
    this.drawEnd();
    this.player.drawPlayer();

    if (this.camera) {
      this.camera.setCameraTargetPosition(this.player.getPixelPosition());
      this.camera.setCameraDirection(this.player.direction);
    }

    if (this.player.x == this.end.x && this.player.y == this.end.y) {
      this.gameStop = true;
      this.gameWon();
    }

    if (this.gameStop) {
      this.backgroundMusic.removeCallback(this.gameLoop);
    }
  }

  drawEnd() {
    this.maze.drawRect(this.end.x, this.end.y, this.colors.endColor);
  }

  gameWon() {
    console.log(`game won`);
    document.getElementById("win").style.display = "flex";
    if (this.lastDeaths == 0) {
      this.streak += 1;
    }
    this.lastDeaths = 0;
    this.levelsDone += 1;
    this.updatePlayerStats();
  }

  gameLost() {
    console.log(`game lost`);
    document.getElementById("reset").style.display = "flex";
    this.lastDeaths += 1;
    this.streak = 0;
    this.updatePlayerStats();
  }

  reset(resetMaze) {
    removeEventListener("keydown", this.handleKeyDown);
    removeEventListener("keyup", this.handleKeyUp);

    this.camera.stopCamera();
    this.gameStop = true;
    if (resetMaze) {
      this.maze = new maze(this.maze.cellCount + 1);
      this.end = { x: this.maze.cellCount - 1, y: this.maze.cellCount - 1 };
    }
    this.prepare();
  }

  updatePlayerStats() {
    document.getElementById("bpm_display").innerHTML = this.bpm;
    document.getElementById("deaths").innerHTML = this.lastDeaths;
    document.getElementById("levels").innerHTML = this.levelsDone;
    document.getElementById("streak").innerHTML = this.streak;
  }

  /**
   * convert relative direction to absolute
   * @param {Number} relativeDirection direction, relative to the player's orientation
   */
  relativeDirectionToAbsolute(relativeDirection) {
    const out = relativeDirection + this.player.direction - 1;

    return out > 4 ? out % 4 : out;
  }
}

let mazeSize = 10;
maze1 = new maze(mazeSize);
maze1.drawMaze(true);

game1 = new Game(maze1);
game1.prepare();

function startGame(bpm) {
  document.getElementById("score").style.display = "block";
  document.getElementById("startScreen").style.opacity = 0;
  setTimeout(() => {
    if (bpm) game1.bpm = bpm;

    game1.start();
    document.getElementById("startScreen").style.display = `none`;
  }, 1500);
}

function resetGame(resetMaze) {
  document.getElementById("reset").style.display = "none";
  document.getElementById("win").style.display = "none";
  game1.reset(resetMaze);
  setTimeout(() => {
    game1.start();
  }, 1500);
}

document.getElementById("leftMobile").addEventListener("touchstart", () => {
  dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
});
document.getElementById("leftMobile").addEventListener("touchend", () => {
  dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowLeft" }));
});

document.getElementById("rightMobile").addEventListener("touchstart", () => {
  dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
});
document.getElementById("rightMobile").addEventListener("touchend", () => {
  dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowRight" }));
});
