const canvas = document.getElementById("mainCanvas");
const ctx = canvas.getContext("2d");

const mazeColor = { r: 46, g: 204, b: 112 };

const DIR = {
  TOP:1, RIGHT:2, BOTTOM:3, LEFT:4
}

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
    this.cellCount = cellCount;
  }

  drawRect(cellX, cellY, color){
    const cellSizeX = (canvas.width/this.cellCount);
    const cellSizeY = (canvas.height/this.cellCount);
    
    ctx.beginPath();
    withFillStyle(() => {
      ctx.fillRect(cellX *  cellSizeX, cellY * cellSizeY, cellSizeX, cellSizeY)
    }, color)
    ctx.stroke();
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


class Player{
  constructor(x,y, direction, maze, playerColor = "blue", trailColor = "green"){
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.playerHistory = [];
    this.maze = maze;

    this.playerColor = playerColor;
    this.trailColor = trailColor;
  }

  drawPlayer(){
    this.playerHistory.map(point => {
      this.maze.drawRect(point.x, point.y, this.trailColor);
    })
    this.maze.drawRect(this.x, this.y, this.playerColor);
    this.maze.drawMaze(false)
  }

  /**
   * @returns if the game should end
   */
  movePlayer(){ 
    this.playerHistory.push({x:this.x, y:this.y});
    if(this.maze[this.y][this.x].walls[this.direction - 1]){
      return true;
    }else{
      switch(this.direction){
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
}

class Game{
  /**
   * 
   * @param {Object} controls {key: direction}
   */
  constructor(maze, frameDelay = 500, controls = {
    ArrowUp: [DIR.TOP],
    ArrowDown: [DIR.BOTTOM],
    ArrowLeft: [DIR.LEFT],
    ArrowRight: [DIR.RIGHT],
  }){
    this.controls = controls;
    this.controlStates = {};
    this.frameDelay = frameDelay;
    this.maze = maze;

    this.gameLoop = this.gameLoop.bind(this)
  }

  start(){
    this.player = new Player(0,0, this.maze.cells[0][0].walls.reduce((prev, value, index) => {
      console.log(prev, value)
      if(prev == -1 ){
        if(value == false)
        return index+1
        else
        return -1;
      }else{
        return prev;
        }
    }, -1), this.maze);

      addEventListener("keydown", evt => {
        if(this.controls[evt.key])
          this.controlStates[this.controls[evt.key]] = true
        console.log(this.controlStates)
      })
      
      addEventListener("keyup", evt => {
        if(this.controls[evt.key])
          this.controlStates[this.controls[evt.key]] = false
        console.log(this.controlStates)
      })
      
      this.player.drawPlayer()
      setInterval(this.gameLoop, this.frameDelay)
  }

  gameLoop(){
    let moved = false;
    Object.keys(this.controlStates).map(direction => {
      if(!moved && this.controlStates[direction]){
        this.player.direction = direction;
      }
    })
    this.player.movePlayer();
    moved = true
    this.player.drawPlayer()
  }
}

  let mazeSize = 10;
maze1 = new maze(mazeSize);
maze1.drawMaze(true);

game1 = new Game(maze1);
game1.start();

