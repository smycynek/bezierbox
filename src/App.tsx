import { createSignal, onMount, Show, type Component } from 'solid-js';
import styles from './App.module.css';
import { Point } from './Point';
import { Color } from './color';
import { Logger, toggleLog } from './Logger';
import {
  cartesianAdjust,
  drawCurvePointCartSegments,
  drawGridAndAxes,
  drawPoint,
  getCanvas,
  getContext,
  getDrawConfig,
  getScale,
} from './drawUtil';
import { getMousePos, getTouchPos, near } from './utility';
import { createSplineBezierManualArray } from './bezier';
import {
  getDataAsJSON,
  loadData,
  loadDataFromQueryString,
  saveData,
  saveDataToQueryString,
} from './serialize';
import { version } from './version';
import { staticHostname } from './config';

const App: Component = () => {
  const [normalControlEnabled] = createSignal(false);
  const [showNormals, setShowNormals] = createSignal(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [height, setHeight] = createSignal(0);
  const [showGrid, setShowGrid] = createSignal(true);
  const [pointIndex, setPointIndex] = createSignal(-1);
  const [textLink, setTextLink] = createSignal('');
  const standardPoints = [
    new Point(-4, -4),
    new Point(-4, 4),
    new Point(0, 0),
    new Point(4, -4),
    new Point(4, 4),
  ];

  const [hostname] = createSignal(staticHostname);
  const setShowNormalsW = (val: boolean) => {
    setShowNormals(val);
    drawSplines();
  };

  const [points, setPoints] = createSignal([...standardPoints]);

  const init = async () => {
    if (getContext()) {
      getContext()?.clearRect(0, 0, getCanvas().width, getCanvas().height);
    }
    const queryString = window.location.search;
    if (queryString) {
      console.log(queryString.substring(6));
      setPoints(await loadDataFromQueryString(queryString));
      Logger.info('Loaded from URL');
    } else {
      const savedPoints = await loadData();
      if (savedPoints.length) {
        setPoints(savedPoints);
        Logger.info('Loaded from local storage');
      } else {
        Logger.info('Initial values');
      }
      setTextLink(await getTextUrl());
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
    if (showGrid()) {
      drawGridAndAxes();
    }

    const spline = createSplineBezierManualArray(points());

    const config = getDrawConfig(Color.black, 1.0);
    config.solid = false;

    if (showGrid()) {
      // dashed line for controls
      drawCurvePointCartSegments(points(), config);
    }

    // actual curve
    drawCurvePointCartSegments(spline, getDrawConfig(Color.red, 2.0));

    if (showGrid()) {
      // control points
      const scale = getScale();
      points().forEach((p: Point) => {
        drawPoint(
          getCanvas().width / 2 + p.x * scale,
          getCanvas().height / 2 - p.y * scale,
          points().length < 4 ? Color.black : Color.blue,
          true,
          5,
          2
        );
      });
    }
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

  const showGridButtonHandler = () => {
    setShowGrid(!showGrid());
    drawSplines();
  };
  const getTextUrl = async () => {
    const sData = encodeURIComponent(
      `${hostname()}?data=` + (await saveDataToQueryString(points()))
    );
    return `sms:&body=${'Share%20a%20spline%21'}%20${sData}`;
  };

  const copyButtonHandler = async () => {
    const sData = `${hostname()}?data=` + (await saveDataToQueryString(points()));

    const type = 'text/plain';
    const clipboardItemData = {
      [type]: sData,
    };
    const clipboardItem = new ClipboardItem(clipboardItemData);
    navigator.clipboard.write([clipboardItem]);
  };

  const copyDataHandler = () => {
    const sData = getDataAsJSON(points(), false);

    const type = 'text/plain';
    const clipboardItemData = {
      [type]: sData,
    };
    const clipboardItem = new ClipboardItem(clipboardItemData);
    navigator.clipboard.write([clipboardItem]);
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
        removePointHandler(ii);
        break;
      }
    }
    if (addNewPoint) {
      addPointHandler(pt);
    }
    drawSplines();
  };

  const removePointHandler = (index: number) => {
    const current = points();
    current.splice(index, 1);
    setPoints(current);
    saveData(points());
  };

  const addPointHandler = (pt: Point) => {
    const newPoints = [...points()];
    newPoints.push(pt);
    setPoints(newPoints);
    saveData(points());
  };

  const mouseUpHandler = async () => {
    window.history.replaceState({}, '', hostname());
    setPointIndex(-1);
    saveData(points());
    const url = await getTextUrl();
    setTextLink(url);
    console.log(textLink());
  };

  const mouseDownHandler = (data: MouseEvent) => {
    Logger.info('Mouse down');
    const pos = getMousePos(getCanvas(), data);
    pointIndexAdjust(pos);
  };

  const mouseMoveHandler = (data: MouseEvent) => {
    const pt = getMousePos(getCanvas(), data);
    moveHandler(pt);
  };

  const touchEndHandler = async () => {
    setPointIndex(-1);
    saveData(points());
    const url = await getTextUrl();
    setTextLink(url);
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
          Send a Spline!
        </h1>
        <p title="An experiment combining polynomials and social media!">
          Hours of Fun. Drag points. Double-click/tap to add a point. Double-click/tap a point to
          remove it (minimum 3 points). Text designs to your friends!
        </p>
      </header>
      <header class={styles.header}>
        <canvas
          title="Drag, double-click/tap here.  Like I said, hours of fun."
          onMouseDown={mouseDownHandler}
          onMouseMove={mouseMoveHandler}
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
            <button
              title="Reset points to default starting positions"
              onClick={resetButtonHandler}
              class="actionButtonWide"
            >
              Reset
            </button>
            <button
              title="Copy the URL, including the encoded curve point data, to the copy buffer to paste into email, text, etc."
              onClick={copyButtonHandler}
              class="actionButtonWide"
            >
              Copy URL
            </button>
            <button
              title="Copy the plain-text point data to the copy buffer for pasting somewhere else"
              onClick={copyDataHandler}
              class="actionButtonWide"
            >
              Copy data
            </button>
            <a
              title="Send the URL, including the encoded curve point data, to an SMS text message"
              href={textLink()}
              class="button-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Send text
            </a>
          </div>
          <div class="label">
            <button
              class="mini-action"
              title="Toggle grid and controls"
              onClick={showGridButtonHandler}
            >
              #
            </button>
          </div>
          <div class="label cite">
            <a
              title="More info here. Contact me with questions."
              href="https://github.com/smycynek/bezierbox"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://github.com/smycynek/bezierbox
            </a>
          </div>
          <div title="I keep making small tweaks." class="label narrow cite">
            v {version}
          </div>
        </div>
      </header>
    </div>
  );
};

export default App;
