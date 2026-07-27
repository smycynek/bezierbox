import { createSignal, onMount, Show, type Component } from 'solid-js';
import styles from './App.module.css';
import { Point } from './Point';
import { Color } from './color';
import { Logger, LoggerLevel } from './Logger';

import { getMousePos, getTouchPos, near } from './utility';
import { Constants } from './constants';
import { createSplineBezierManualArray } from './bezier';

interface DrawConfig {
  color: Color;
  scale: number;
  offset: Point;
  canvas: HTMLCanvasElement;
  width: number;
  solid: boolean;
}

const App: Component = () => {
  let canvas: HTMLCanvasElement;
  let context: CanvasRenderingContext2D;
  const [normalControlEnabled] = createSignal(false);
  const [showNormals, setShowNormals] = createSignal(false);
  const [setHeight] = createSignal(0);

  const [pointIndex, setPointIndex] = createSignal(-1);

  const standardPoints = [
    new Point(-4, -4),
    new Point(-4, 4),
    new Point(0, 0),
    new Point(4, -4),
    new Point(4, 4),
    // new Point(8, -9), // 2p3 - p2 0,6 -
    // new Point(3, 5),
    // new Point(4, 7),
  ];

  const setShowNormalsW = (val: boolean) => {
    setShowNormals(val);
    drawSplines();
  };

  const [points, setPoints] = createSignal([...standardPoints]);

  const toggleLog = () => {
    console.log('Cycle logging');
    switch (Logger.loggerLevel) {
      case LoggerLevel.None:
        Logger.loggerLevel = LoggerLevel.Info;
        break;
      case LoggerLevel.Info:
        Logger.loggerLevel = LoggerLevel.Trace;
        break;
      default:
        Logger.loggerLevel = LoggerLevel.None;
    }
    console.log(`Set to ${LoggerLevel[Logger.loggerLevel]}`);
  };

  const init = () => {
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    canvas = document.getElementById('main-canvas')! as HTMLCanvasElement;
    resizeCanvas();
    drawGrid();
    drawSplines();
  };

  const resizeCanvas = () => {
    const reducedHeight = window.innerHeight * 0.6;
    const roundedHeight = reducedHeight - (reducedHeight % 50);
    const reducedWidth = window.innerWidth * 0.85;
    const roundedWidth = reducedWidth - (reducedWidth % 50);

    if (roundedWidth > roundedHeight) {
      canvas.width = roundedHeight;
      canvas.height = roundedHeight;
    } else {
      canvas.width = roundedWidth;
      canvas.height = roundedWidth;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    context = canvas.getContext('2d')!;
    setHeight(canvas.height);
  };

  const getDrawConfig = (
    color: Color,
    width: number,
    offset: Point = new Point(0, 0)
  ): DrawConfig => {
    return {
      color: color,
      canvas: canvas,
      scale: Constants.scale,
      offset: offset,
      width: width,
      solid: true,
    };
  };

  const drawGrid = () => {
    for (let idx = -canvas.width / 2; idx <= canvas.width; idx += Constants.scale) {
      for (let idy = -canvas.height / 2; idy < canvas.height; idy += Constants.scale) {
        drawGridPoint(idx, idy);
      }
    }
    drawCurvePointCartSegments(
      [new Point(0, -100), new Point(0, 100)],
      getDrawConfig(Color.black, 1)
    );
    drawCurvePointCartSegments(
      [new Point(-100, 0), new Point(100, 0)],
      getDrawConfig(Color.black, 1)
    );
  };

  const drawSplines = () => {
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    const spline = createSplineBezierManualArray(points());

    const config = getDrawConfig(Color.black, 1.0);
    config.solid = false;

    // dashed line for controls
    drawCurvePointCartSegments(points(), config);

    // actual curve
    drawCurvePointCartSegments(spline, getDrawConfig(Color.red, 2.0));

    // control points
    points().forEach((p: Point) => {
      drawPoint(
        canvas.width / 2 + p.x * Constants.scale,
        canvas.height / 2 - p.y * Constants.scale,
        points().length < 4 ? Color.black : Color.blue,
        true,
        5,
        2
      );
    });
  };

  const drawGridPoint = (x: number, y: number) => {
    drawPoint(x, y, Color.black, true, 0.25);
  };

  const drawCurvePointCartSegments = (points: Point[], config: DrawConfig) => {
    for (let i = 0; i < points.length - 1; i++) {
      drawLine(points[i], points[i + 1], config);
    }
  };

  const drawPoint = (
    x: number, // note, screen coords
    y: number,
    color: Color,
    transparent: boolean = false,
    radius: number = 2,
    lineWidth: number = 1
  ) => {
    if (!canvas) {
      init();
    }
    context.strokeStyle = color;
    context.fillStyle = transparent ? Color.transparent : color;
    context.lineWidth = lineWidth;
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI);
    context.fill();
    context.stroke();
  };

  const drawLine = (p1: Point, p2: Point, config: DrawConfig) => {
    if (!canvas) {
      init();
    }
    context.strokeStyle = config.color;
    context.lineWidth = config.width;
    if (!config.solid) {
      context.setLineDash([5, 10]);
    } else {
      context.setLineDash([]);
    }
    context.beginPath();
    context.moveTo(
      (p1.x + config.offset.x) * config.scale + config.canvas.width / 2 + config.offset.x,
      (-p1.y - config.offset.y) * config.scale + config.canvas.height / 2 + config.offset.y
    );
    context.lineTo(
      (p2.x + config.offset.x) * config.scale + config.canvas.width / 2 + config.offset.x,
      (-p2.y - config.offset.y) * config.scale + config.canvas.height / 2 + config.offset.y
    );
    context.stroke();
  };

  const cartesianAdjust = (pt: Point): Point => {
    const adjustedX = (-canvas.width / 2 + pt.x) / Constants.scale;
    const adjustedY = (canvas.height / 2 - pt.y) / Constants.scale;
    return new Point(adjustedX, adjustedY);
  };

  const pointIndexAdjust = (pos: Point) => {
    const pointAdj = cartesianAdjust(pos);

    setPointIndex(-1);
    points().forEach((p: Point, idx: number) => {
      if (near(pointAdj, p) && pointIndex() !== idx) {
        setPointIndex(idx);
      }
    });
    drawSplines();
  };

  const moveHandler = (pt: Point) => {
    if (pointIndex() == -1) {
      return;
    }
    const newPoints = [...points()];
    newPoints[pointIndex()] = cartesianAdjust(pt);
    setPoints(newPoints);
    drawSplines();
  };

  const contextMenuHandler = () => {
    //  data.preventDefault();
  };

  const resetButtonHandler = () => {
    setPoints([...standardPoints]);
    drawSplines();
  };

  const doubleClickHandler = (data: MouseEvent) => {
    const ptOriginal = getMousePos(canvas, data);
    const pt = cartesianAdjust(ptOriginal);

    let addNewPoint = true;
    for (let ii = 0; ii < points().length; ii++) {
      if (near(pt, points()[ii])) {
        addNewPoint = false;
        if (points().length <= 3) {
          break;
        }
        const current = points();
        current.splice(ii, 1);
        setPoints(current);
        break;
      }
    }

    if (addNewPoint) {
      addPointHandler(pt);
    }
    drawSplines();
  };

  const addPointHandler = (pt: Point) => {
    const newPoints = [...points()];
    newPoints.push(pt);
    setPoints(newPoints);
    drawSplines();
  };

  const mouseUpHandler = () => {
    setPointIndex(-1);
  };

  const mouseDownHandler = (data: MouseEvent) => {
    const pos = getMousePos(canvas, data);
    pointIndexAdjust(pos);
  };

  const mouseMoveHandler = (data: MouseEvent) => {
    const pt = getMousePos(canvas, data);
    moveHandler(pt);
  };

  const touchEndHandler = () => {
    setPointIndex(-1);
  };

  const touchStartHandler = (data: TouchEvent) => {
    const pos = getTouchPos(canvas, data.touches[0]);
    pointIndexAdjust(pos);
  };

  const touchMoveHandler = (data: TouchEvent) => {
    const pos = getTouchPos(canvas, data.touches[0]);
    if (pos.x > 0 && pos.x < canvas.width && pos.y > 0 && pos.y < canvas.height) {
      moveHandler(pos);
    }
  };

  onMount(() => {
    init();
  });

  return (
    <div onMouseUp={mouseUpHandler}>
      <header class={styles.header}>
        <h1 title="Toggle Log" onClick={[toggleLog, null]}>
          Bezier Box
        </h1>
        <p>
          Hours of Fun. Drag points. Double-click/tap to add a point. Double-click/tap a point to
          remove it (minimum 3 points){' '}
        </p>
      </header>
      <header class={styles.header}>
        <canvas
          onMouseDown={mouseDownHandler}
          onMouseMove={mouseMoveHandler}
          onMouseUp={mouseUpHandler}
          onTouchStart={touchStartHandler}
          onTouchEnd={touchEndHandler}
          onTouchMove={touchMoveHandler}
          onDblClick={doubleClickHandler}
          class={styles.pointCanvas}
          onContextMenu={contextMenuHandler}
          id="main-canvas"
        ></canvas>
        <div>
          <Show when={normalControlEnabled()}>
            <div class="label">
              Show normals and curvature
              <input
                type="checkbox"
                onChange={(e) => setShowNormalsW(e.currentTarget.checked)}
                checked={showNormals()}
                class="actionButtonWide"
              ></input>
            </div>
          </Show>
          <div class="label">
            <button onClick={resetButtonHandler} class="actionButtonWide">
              Reset
            </button>
          </div>
          <div class="label cite">
            <a
              href="https://github.com/smycynek/bezierbox"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://github.com/smycynek/bezierbox
            </a>
          </div>
        </div>
      </header>
    </div>
  );
};

export default App;
