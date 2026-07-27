import memoize from 'memoize';
import { Point } from './Point';

// A simple 7-point bezier
export function createSplineBezierManual4Point(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point
): Point[] {
  const xParam1 = (t: number) => {
    return (
      // 1 3 3 1 coefficents for 4 point cubic bezier
      Math.pow(1 - t, 3) * p0.x +
      3 * Math.pow(1 - t, 2) * t * p1.x +
      3 * (1 - t) * Math.pow(t, 2) * p2.x +
      Math.pow(t, 3) * p3.x
    );
  };

  const yParam1 = (t: number) => {
    return (
      Math.pow(1 - t, 3) * p0.y +
      3 * Math.pow(1 - t, 2) * t * p1.y +
      3 * (1 - t) * Math.pow(t, 2) * p2.y +
      Math.pow(t, 3) * p3.y
    );
  };

  const bezierPoints: Point[] = [];
  for (let t = 0; t <= 1; t += 0.01) {
    bezierPoints.push(new Point(xParam1(t), yParam1(t)));
  }

  return bezierPoints;
}

function factorial(n: number): number {
  if (n === 0 || n === 1) {
    return 1;
  }
  return factorial(n - 1) * n;
}
const memFactorial = memoize(factorial);

export function createSplineBezierManualArray(points: Point[]): Point[] {
  const evaluateAtT = (t: number): Point => {
    // t is the parameter from 0 to 1, sampled at small increments.
    const degree = points.length - 1;
    let x = 0;
    let y = 0;
    for (let currentDegree = 0; currentDegree <= degree; currentDegree++) {
      // 1 3 3 1 for 4 point cubic
      const coefficent =
        memFactorial(degree) / (memFactorial(currentDegree) * memFactorial(degree - currentDegree));
      x +=
        coefficent *
        Math.pow(1 - t, degree - currentDegree) *
        Math.pow(t, currentDegree) *
        points[currentDegree].x;
      y +=
        coefficent *
        Math.pow(1 - t, degree - currentDegree) *
        Math.pow(t, currentDegree) *
        points[currentDegree].y;
    }
    return new Point(x, y);
  };

  const bezierPoints: Point[] = [];
  for (let t = 0; t <= 1; t += 0.01) {
    bezierPoints.push(evaluateAtT(t));
  }

  return bezierPoints;
}
