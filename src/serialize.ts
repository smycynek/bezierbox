import { Logger } from './Logger';
import { Point } from './Point';

export async function compressToBase64(text: string): Promise<string> {
  const byteArray = new TextEncoder().encode(text);
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(byteArray);
  writer.close();
  const compressedBuffer = await new Response(stream.readable).arrayBuffer();
  Logger.info('CompressToBase64');
  return btoa(String.fromCharCode(...new Uint8Array(compressedBuffer)));
}

export async function base64ToUncompressed(text: string): Promise<string> {
  const compressedBytes = Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(compressedBytes);
  writer.close();
  const decompressedBuffer = await new Response(stream.readable).arrayBuffer();
  Logger.info('base64Uncompress');
  return new TextDecoder().decode(decompressedBuffer);
}

function getDataAsJSON(points: Point[]): string {
  return JSON.stringify(points, null, 0);
}

function getPointsFromJSON(data: string): Point[] {
  const ptObj: Point[] = JSON.parse(data);
  const points: Point[] = [];
  ptObj.forEach((p) => {
    points.push(new Point(p.x, p.y, p.z));
  });
  return points;
}

const localStorageKey = 'pointData_v10';

export async function saveData(points: Point[]) {
  const data = getDataAsJSON(points);
  const bData = await compressToBase64(data);
  try {
    localStorage.setItem(localStorageKey, bData);
    Logger.info('Save to local storage');
  } catch (e) {
    Logger.info('Cannot save data ' + e);
  }
}

export async function loadDataFromQueryString(queryString: string): Promise<Point[]> {
  const sData = queryString.substring(6);
  if (!sData) {
    return [];
  }
  Logger.info(`Query string: ${queryString}`);
  const uncompressed = await base64ToUncompressed(sData);
  return getPointsFromJSON(uncompressed);
}
export async function saveDataToQueryString(points: Point[]): Promise<string> {
  Logger.info('Get compressed data');
  return compressToBase64(getDataAsJSON(points));
}

export async function loadData(): Promise<Point[]> {
  try {
    const sData = localStorage.getItem(localStorageKey);
    if (!sData) {
      return [];
    }
    const uncompressed = await base64ToUncompressed(sData);
    Logger.info('Load data');
    return getPointsFromJSON(uncompressed);
  } catch (e) {
    Logger.info('Cannot load data ' + e);
    return [];
  }
}
