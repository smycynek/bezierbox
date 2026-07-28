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
} from './drawUtil';
import { getMousePos, getTouchPos, near } from './utility';
import { Constants } from './constants';
import { createSplineBezierManualArray } from './bezier';
import {
  base64ToUncompressed,
  compressToBase64,
  loadData,
  loadDataFromQueryString,
  saveData,
  saveDataToQueryString,
} from './serialize';
import { version } from './version';

const App: Component = () => {
  const [normalControlEnabled] = createSignal(false);
  const [showNormals, setShowNormals] = createSignal(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [height, setHeight] = createSignal(0);

  const [pointIndex, setPointIndex] = createSignal(-1);
  const [textLink, setTextLink] = createSignal('https://stevenvictor.net/bezierbox');
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

  const init = async () => {
    const initial = 'abc123ALWKENJ';
    const comp = await compressToBase64(initial);
    console.log(comp);
    const rt = await base64ToUncompressed(comp);
    console.log(rt);

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

  const getTextUrl = async () => {
    const sData = encodeURIComponent(
      'https://stevenvictor.net/bezierbox/?data=' + (await saveDataToQueryString(points()))
    );
    return `sms:&body=${'Share%20a%20spline%21'}%20${sData}`;
  };

  const copyButtonHandler = async () => {
    const sData =
      'https://stevenvictor.net/bezierbox/?data=' + (await saveDataToQueryString(points()));

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

  const mouseUpHandler = async () => {
    setPointIndex(-1);
    saveData(points());
    const url = await getTextUrl();
    setTextLink(url);
    console.log(textLink());
  };

  const mouseDownHandler = (data: MouseEvent) => {
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
        <p>
          Hours of Fun. Drag points. Double-click/tap to add a point. Double-click/tap a point to
          remove it (minimum 3 points). Text design to your friends!
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
          <div class="label">
            <button onClick={copyButtonHandler} class="actionButtonWide">
              Copy URL
            </button>
          </div>
          <div class="label">
            <a href={textLink()} target="_blank" rel="noopener noreferrer">
              Send to a friend (beta)
            </a>
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
          <div class="label cite">v {version}</div>
        </div>
      </header>
    </div>
  );
};

export default App;
