import memoize from 'memoize';
import { Point } from './Point';

// A simple 7-point bezier
export function createSplineBezierMultiQuad(points: Point[]): Point[] {
  if (points.length < 3) {
    throw new Error(' >= 3 points required');
  }

    let bezierPoints: Point[] = [];

  for (let idx = 0; idx <= points.length - 3; idx += 2) {
    const pGroup = [points[idx], points[idx + 1], points[idx + 2]];
    const ePoints = createSplineBezierManualArray(pGroup);
    bezierPoints = bezierPoints.concat(ePoints);
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
