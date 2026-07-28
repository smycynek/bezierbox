import { Logger } from './Logger';
import { Point } from './Point';

function getDataAsJSON(points: Point[]): string {
  return JSON.stringify(points);
}

function JSONtoBase64(pointJson: string): string {
  return btoa(pointJson);
}

function Base64ToJson(base64: string): string {
  return atob(base64);
}
function getPointsFromJSON(data: string): Point[] {
  const ptObj: Point[] = JSON.parse(data);
  const points: Point[] = [];
  ptObj.forEach((p) => {
    points.push(new Point(p.x, p.y, p.z));
  });
  return points;
}

export function saveData(points: Point[]) {
  const data = getDataAsJSON(points);
  const bData = JSONtoBase64(data);
  try {
    localStorage.setItem('pointData', bData);
  } catch (e) {
    Logger.info('Cannot save data ' + e);
  }
}

export function loadData(): Point[] {
  try {
    const sData = localStorage.getItem('pointData');
    if (!sData) {
      return [];
    }
    return getPointsFromJSON(Base64ToJson(sData));
  } catch (e) {
    Logger.info('Cannot load data ' + e);
    return [];
  }
}
