import memoize from 'memoize';
import { Point } from './Point';

function factorial(n: number): number {
  if (n === 0 || n === 1) {
    return 1;
  }
  return factorial(n - 1) * n;
}
const memFactorial = memoize(factorial);

export function createSplineBezierManualArray(controlPoints: Point[]): Point[] {
  // This creates a single high-degree bezier (5,6,7 degree, etc).
  // I might support a composite curve of many joined quadratic
  // or cubic beziers in the future.

  // This is a parametric function with an input t (time) and
  // control points from the user that yields an x/y point.
  // (Pretty basic stuff for spline experts, but still documenting for my own
  // edification.)

  const evaluateAtT = (t: number, points: Point[]): Point => {
    const degree = points.length - 1;
    let x = 0;
    let y = 0;
    for (let currentDegree = 0; currentDegree <= degree; currentDegree++) {
      // 1 3 3 1 for 4 point cubic
      const coefficient =
        memFactorial(degree) / (memFactorial(currentDegree) * memFactorial(degree - currentDegree));
      x +=
        coefficient *
        Math.pow(1 - t, degree - currentDegree) *
        Math.pow(t, currentDegree) *
        points[currentDegree].x;
      y +=
        coefficient *
        Math.pow(1 - t, degree - currentDegree) *
        Math.pow(t, currentDegree) *
        points[currentDegree].y;
    }
    return new Point(x, y);
  };

  // A continuous set of evaluations at t from values 0 to 1 yield a the curve.
  const bezierPoints: Point[] = [];
  for (let t = 0; t <= 1; t += 0.01) {
    bezierPoints.push(evaluateAtT(t, controlPoints));
  }

  return bezierPoints;
}
