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

const showDownloadButton = (show, url) => {
  downloadButton.style.display = show ? `` : `none`;
  downloadButton.style.transform = show ? `rotate(0deg)` : `rotate(180deg)`;
  downloadButton.href = url;
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
  stopAndWait(() => {
    drawPixels(
      maze1,
      +normalAngle.value,
      200,
      Math.round(100 / +normalResolution.value)
    );
  });
});

const rotateAngleFrom = document.getElementById("rotateAngleFrom");
const rotateAngleTo = document.getElementById("rotateAngleTo");
const rotateResolution = document.getElementById("rotateResolution");
const rotateDraw = document.getElementById("rotateDraw");
rotateDraw.addEventListener("click", () => {
  stopAndWait(() => {
    rotate(
      maze1,
      200,
      Math.round(100 / +rotateResolution.value),
      +rotateAngleFrom.value,
      +rotateAngleTo.value,
      0.1
    );
  });
});

const resAngle = document.getElementById("resAngle");
const resFrom = document.getElementById("resFrom");
const resTo = document.getElementById("resTo");
const resDraw = document.getElementById("resDraw");
