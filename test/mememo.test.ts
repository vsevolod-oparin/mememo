import { describe, it, expect, beforeEach } from 'vitest';
import { HNSW } from '../src/mememo';
import embeddingDataJSON from './data/accident-report-embeddings-100.json';
import graph10Layer1JSON from './data/insert-10-1-layer.json';
import graph10Layer2JSON from './data/insert-10-2-layer.json';

interface EmbeddingData {
  embeddings: number[][];
  reportNumbers: number[];
}
const embeddingData = embeddingDataJSON as EmbeddingData;

type GraphLayer = Record<string, Record<string, number>>;
const graph10Layer1 = graph10Layer1JSON as GraphLayer[];
const graph10Layer2 = graph10Layer2JSON as GraphLayer[];

describe('constructor', () => {
  it('constructor', () => {
    const hnsw = new HNSW({
      distanceFunction: 'cosine',
      efConstruction: 100,
      m: 16
    });
  });
});

//==========================================================================||
//                                 Insert                                   ||
//==========================================================================||

describe('insert()', () => {
  it('insert() 10 items, 1 layer', () => {
    const hnsw = new HNSW({
      distanceFunction: 'cosine',
      seed: 20240101
    });

    // Insert 10 embeddings
    const size = 10;

    // The random levels with this seed is 0,0,0,0,0,0,0,0,0,0
    const reportIDs: string[] = [];
    for (let i = 0; i < size; i++) {
      const curReportID = String(embeddingData.reportNumbers[i]);
      reportIDs.push(curReportID);
      hnsw.insert(curReportID, embeddingData.embeddings[i]);
    }

    // There should be only one layer, and all nodes are fully connected
    expect(hnsw.graphLayers.length).toBe(1);

    for (const reportID of reportIDs) {
      const curNode = hnsw.graphLayers[0].graph.get(reportID);
      expect(curNode).to.not.toBeUndefined();
      expect(curNode!.size).toBe(9);

      // Check the distances
      const expectedNeighbors = graph10Layer1[0][reportID];
      for (const [neighborKey, neighborDistance] of curNode!.entries()) {
        expect(neighborDistance).toBeCloseTo(
          expectedNeighbors[neighborKey],
          1e-6
        );
      }
    }
  });

  it('insert() 10 items, 2 layer', () => {
    const hnsw = new HNSW({
      distanceFunction: 'cosine',
      seed: 10
    });

    // Insert 10 embeddings
    const size = 10;

    // The random levels with this seed is 0,0,0,1,1,0,0,0,0,0
    const reportIDs: string[] = [];
    for (let i = 0; i < size; i++) {
      const curReportID = String(embeddingData.reportNumbers[i]);
      reportIDs.push(curReportID);
      hnsw.insert(curReportID, embeddingData.embeddings[i]);
    }

    expect(hnsw.graphLayers.length).toBe(2);

    for (const reportID of reportIDs) {
      for (const [l, graphLayer] of hnsw.graphLayers.entries()) {
        const curNode = graphLayer.graph.get(reportID);

        if (curNode === undefined) {
          expect(graph10Layer2[l][reportID]).toBeUndefined();
        } else {
          expect(graph10Layer2[l][reportID]).not.to.toBeUndefined();
          // Check the distances
          const expectedNeighbors = graph10Layer2[l][reportID];
          for (const [neighborKey, neighborDistance] of curNode.entries()) {
            expect(neighborDistance).toBeCloseTo(
              expectedNeighbors[neighborKey],
              1e-6
            );
          }
        }
      }
    }
  });
});

//==========================================================================||
//                          Helper Functions                                ||
//==========================================================================||

describe('_getRandomLevel()', () => {
  it('_getRandomLevel()', () => {
    const hnsw = new HNSW({
      distanceFunction: 'cosine',
      seed: 20240101
    });

    const levels: number[] = [];
    for (let i = 0; i < 10000; i++) {
      levels.push(hnsw._getRandomLevel());
    }

    // Count the different levels
    const levelCounter = new Map<number, number>();
    for (const level of levels) {
      if (levelCounter.has(level)) {
        levelCounter.set(level, levelCounter.get(level)! + 1);
      } else {
        levelCounter.set(level, 1);
      }
    }

    expect(levelCounter.get(0)! > 9000);
    expect(levelCounter.get(1)! > 400);
    expect(levelCounter.get(1)! < 700);
    expect(levelCounter.get(2)! < 50);
    expect(levelCounter.get(3)! < 10);
  });
});

describe('Distance functions', () => {
  it('Distance function (cosine)', () => {
    const hnsw = new HNSW({
      distanceFunction: 'cosine'
    });

    const a = [0.44819598, 0.26875241, 0.02164449, 0.33802939, 0.2482019];
    const b = [0.99448402, 0.29269615, 0.98586198, 0.57482737, 0.12994758];

    expect(hnsw.distanceFunction(a, b)).closeTo(0.2554613725418178, 1e-6);
  });

  it('Distance function (cosine-normalized)', () => {
    const hnsw = new HNSW({
      distanceFunction: 'cosine-normalized'
    });

    const a = [0.3448653, 0.4612705, 0.79191367, 0.057099, 0.19470466];
    const b = [0.39233533, 0.37618326, 0.12894695, 0.50411272, 0.65863662];

    expect(hnsw.distanceFunction(a, b)).closeTo(0.43203611706139833, 1e-6);
  });

  it('Distance function (custom)', () => {
    const l1Distance = (a: number[], b: number[]) => {
      return a.reduce(
        (sum, value, index) => sum + Math.abs(value - b[index]),
        0
      );
    };

    const hnsw = new HNSW({
      distanceFunction: l1Distance
    });

    const a = [0.44819598, 0.26875241, 0.02164449, 0.33802939, 0.2482019];
    const b = [0.99448402, 0.29269615, 0.98586198, 0.57482737, 0.12994758];

    expect(hnsw.distanceFunction(a, b)).closeTo(1.8895015711439895, 1e-6);
  });
});
