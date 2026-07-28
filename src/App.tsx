import { createSignal, onMount, Show, type Component } from 'solid-js';
import styles from './App.module.css';
import { Point } from './Point';
import { Color } from './color';
import { toggleLog } from './Logger';
import {
  cartesianAdjust,
  drawCurvePointCartSegments,
  drawGridAndAxes,
  drawPoint,
  getCanvas,
  getContext,
  getDrawConfig,
} from './drawUtil';
import { getMousePos, getTouchPos, near } from './utility';
import { Constants } from './constants';
import { createSplineBezierManualArray } from './bezier';
import { loadData, saveData } from './serialize';

const App: Component = () => {
  const [normalControlEnabled] = createSignal(false);
  const [showNormals, setShowNormals] = createSignal(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [height, setHeight] = createSignal(0);

  const [pointIndex, setPointIndex] = createSignal(-1);

  const standardPoints = [
    new Point(-4, -4),
    new Point(-4, 4),
    new Point(0, 0),
    new Point(4, -4),
    new Point(4, 4),
  ];

  const setShowNormalsW = (val: boolean) => {
    setShowNormals(val);
    drawSplines();
  };

  const [points, setPoints] = createSignal([...standardPoints]);

  const init = () => {
    if (getContext()) {
      getContext()?.clearRect(0, 0, getCanvas().width, getCanvas().height);
    }

    const savedPoints = loadData();
    if (savedPoints.length) {
      setPoints(savedPoints);
    }

    resizeCanvas();
    drawGridAndAxes();
    drawSplines();
  };

  const resizeCanvas = () => {
    const reducedHeight = window.innerHeight * 0.6;
    const roundedHeight = reducedHeight - (reducedHeight % 50);
    const reducedWidth = window.innerWidth * 0.85;
    const roundedWidth = reducedWidth - (reducedWidth % 50);

    if (roundedWidth > roundedHeight) {
      getCanvas().width = roundedHeight;
      getCanvas().height = roundedHeight;
    } else {
      getCanvas().width = roundedWidth;
      getCanvas().height = roundedWidth;
    }

    setHeight(getCanvas().height);
  };

  const drawSplines = () => {
    const ctx = getContext();
    ctx?.clearRect(0, 0, getCanvas().width, getCanvas().height);
    drawGridAndAxes();

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
        getCanvas().width / 2 + p.x * Constants.scale,
        getCanvas().height / 2 - p.y * Constants.scale,
        points().length < 4 ? Color.black : Color.blue,
        true,
        5,
        2
      );
    });
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
    saveData(points());
    drawSplines();
  };

  const doubleClickHandler = (data: MouseEvent) => {
    const ptOriginal = getMousePos(getCanvas(), data);
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
        saveData(points());
        break;
      }
    }

    if (addNewPoint) {
      addPointHandler(pt);
      saveData(points());
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
    saveData(points());
  };

  const mouseDownHandler = (data: MouseEvent) => {
    const pos = getMousePos(getCanvas(), data);
    pointIndexAdjust(pos);
  };

  const mouseMoveHandler = (data: MouseEvent) => {
    const pt = getMousePos(getCanvas(), data);
    moveHandler(pt);
  };

  const touchEndHandler = () => {
    setPointIndex(-1);
  };

  const touchStartHandler = (data: TouchEvent) => {
    const pos = getTouchPos(getCanvas(), data.touches[0]);
    pointIndexAdjust(pos);
  };

  const touchMoveHandler = (data: TouchEvent) => {
    const pos = getTouchPos(getCanvas(), data.touches[0]);
    if (pos.x > 0 && pos.x < getCanvas().width && pos.y > 0 && pos.y < getCanvas().height) {
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
          remove it (minimum 3 points).
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
