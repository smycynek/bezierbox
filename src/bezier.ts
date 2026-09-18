import memoize from 'memoize';
import { Point } from './Point';
import { Vector } from './Vector';

function factorial(n: number): number {
  if (n === 0 || n === 1) {
    return 1;
  }
  return factorial(n - 1) * n;
}
const memFactorial = memoize(factorial);

// DEMO_3_0 - n-degree Bezier
export function createSplineBezierManualArray(
  controlPoints: Point[],
  spacing: number = 0.01
): Point[] {
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
  for (let t = 0; t <= 1; t += spacing) {
    bezierPoints.push(evaluateAtT(t, controlPoints));
  }

  return bezierPoints;
}

export function createSplineBezierManualArrayDerivative(controlPoints: Point[]): {
  points: Point[];
  newControlPoints: Point[];
} {
  const derivedPoints = [];

  for (let i = 0; i < controlPoints.length - 1; i++) {
    derivedPoints.push(
      new Point(
        controlPoints[i + 1].x - controlPoints[i].x,
        controlPoints[i + 1].y - controlPoints[i].y
      )
    );
  }

  return {
    points: createSplineBezierManualArray(derivedPoints, 0.01),
    newControlPoints: derivedPoints,
  };
}

export const calculateCurvature = (d1: Vector, d2: Vector): number => {
  const speed = d1.magnitude(); // speed is length of first derivative
  if (speed === 0) {
    return 0;
  }
  // first cross second / (length of first cubed)
  return d1.cross(d2).magnitude() / (speed * speed * speed);
};

export const calculateNormal = (basePoint: Point, d1: Vector, d2: Vector): Point => {
  let normalVector = new Vector(d1.y, -d1.x);
  const cross2d = d1.x * d2.y - d1.y * d2.x;
  if (cross2d < 0) {
    // if signed curvature is negative, we are concave down, so flip normal.
    normalVector = new Vector(-d1.y, d1.x);
  }
  const curvature = calculateCurvature(d1, d2);
  const normalScaled = normalVector.normalize().scale(curvature * 3);
  const normalEnd = new Point(basePoint.x + normalScaled.x, basePoint.y + normalScaled.y);
  return normalEnd;
};
