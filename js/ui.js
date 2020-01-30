Array.from(document.getElementsByTagName("input")).forEach(i => {
  let numberDiv;
  const mouseMoveHandler = e => {
    numberDiv.text.innerText = i.value;
    const pos = i.getBoundingClientRect();
    numberDiv.style.left =
      pos.left -
      2 +
      (pos.width - 15) * ((i.value - i.min) / (i.max - i.min)) +
      `px`;
    numberDiv.style.top = pos.top - pos.height - 20 + `px`;
  };

  i.addEventListener("mousedown", e => {
    numberDiv = document.createElement("div");
    numberDiv.className = `inputNumber`;

    const relativeDiv = document.createElement("div");
    relativeDiv.className = "relativeParent";
    numberDiv.appendChild(relativeDiv);

    const x = document.createElement("div");
    x.className = "indicator";
    document.body.appendChild(numberDiv);
    relativeDiv.appendChild(x);

    const text = document.createElement("div");
    relativeDiv.appendChild(text);
    numberDiv.text = text;

    mouseMoveHandler(e);

    i.addEventListener(`input`, mouseMoveHandler);
  });

  i.addEventListener("mouseup", () => {
    i.removeEventListener(`input`, mouseMoveHandler);
    document.body.removeChild(numberDiv);
  });
});

const downloadContainter = document.getElementById(`downloadContainter`);
const downloadProgressParent = document.getElementById(
  "downloadProgressParent"
);
const progressBar = document.getElementById("progressBar");
const downloadButton = document.getElementById("downloadButton");

const showProgressBar = show => {
  downloadContainter.style.display = show ? `` : `none`;
};
const setProgressBarProgress = progress => {
  progressBar.style.width = progress * 100 + `%`;
};

const drawProgress = percentage => {
  document.getElementById("canvasProgressInner").style.width = `${percentage *
    100}%`;
};

const showDownloadButton = (show, url) => {
  downloadButton.style.display = show ? `` : `none`;
  downloadButton.style.transform = show ? `rotate(0deg)` : `rotate(180deg)`;
  downloadButton.href = url;
};

const estimatedTimeOut = document.getElementById("estimatedTime");
const setAllIterations = all => {
  estimatedTimeOut.all = parseInt(all);
};
const setIterationsLeft = left => {
  estimatedTimeOut.innerText = `${estimatedTimeOut.all - parseInt(left)}/${
    estimatedTimeOut.all
  }`;

  drawProgress((estimatedTimeOut.all - parseInt(left)) / estimatedTimeOut.all);
};

// CONTROLLS

const stopAndWait = callback => {
  if (animationRunning) {
    animationShouldStop = true;
    requestAnimationFrame(stopAndWait);
  } else {
    animationShouldStop = false;
    callback();
  }
};

const normalAngle = document.getElementById("normalAngle");
const normalResolution = document.getElementById("normalResolution");
const normalDraw = document.getElementById("normalDraw");
normalDraw.addEventListener("click", () => {
  showProgressBar(false);
  drawProgress(0);
  stopAndWait(() => {
    drawPixels(
      maze1,
      +normalAngle.value,
      300,
      Math.round(100 / +normalResolution.value)
    );
  });
});

const rotateAngleFrom = document.getElementById("rotateAngleFrom");
const rotateAngleTo = document.getElementById("rotateAngleTo");
const rotateAngleStep = document.getElementById("rotateAngleStep");
const rotateResolution = document.getElementById("rotateResolution");
const rotateDraw = document.getElementById("rotateDraw");
rotateDraw.addEventListener("click", () => {
  setAllIterations(
    (+rotateAngleTo.value - +rotateAngleFrom.value) / +rotateAngleStep.value
  );
  showProgressBar(false);
  drawProgress(0);
  if (rotateAngleFrom.value < rotateAngleTo.value)
    stopAndWait(() => {
      rotate(
        maze1,
        300,
        Math.round(100 / +rotateResolution.value),
        +rotateAngleFrom.value,
        +rotateAngleTo.value,
        +rotateAngleStep.value
      );
    });
});

const resAngle = document.getElementById("resAngle");
const resFrom = document.getElementById("resFrom");
const resTo = document.getElementById("resTo");
const resStep = document.getElementById("resStep");
const resDraw = document.getElementById("resDraw");

resDraw.addEventListener("click", () => {
  const from = Math.round(100 / +resFrom.value);
  const to = Math.round(100 / +resTo.value);
  setAllIterations((from - to) / +resStep.value);
  showProgressBar(false);
  drawProgress(0);
  if (from > to)
    stopAndWait(() => {
      drawSlowly(maze1, +resAngle.value, 200, from, to, +resStep.value);
    });
});

const zoomAngle = document.getElementById(`zoomAngle`);
const zoomRes = document.getElementById(`zoomRes`);
const zoomFrom = document.getElementById(`zoomFrom`);
const zoomTo = document.getElementById(`zoomTo`);
const zoomStep = document.getElementById(`zoomStep`);
const zoomDraw = document.getElementById(`zoomDraw`);

zoomDraw.addEventListener("click", () => {
  setAllIterations((zoomTo.value - zoomFrom.value) / +zoomStep.value);
  showProgressBar(false);
  drawProgress(0);
  if (+zoomFrom.value <= +zoomTo.value)
    zoomIn({
      maze: maze1,
      angle: +zoomAngle.value,
      step: Math.round(100 / +zoomRes.value),
      maxSteps: 400,
      zoomStart: +zoomFrom.value,
      zoomEnd: +zoomTo.value,
      zoomStep: +zoomStep.value
    });
});
