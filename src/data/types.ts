export type Vec3 = [number, number, number];

export interface Star {
  pos: Vec3;
  name?: string;
  mag?: number;
}

export interface StarDataset {
  positions: Float32Array;
  stars: Star[];
  count: number;
  bounds: { min: Vec3; max: Vec3 };
}

export type Distribution = 'uniform' | 'gaussian' | 'clustered';
export type DataSource = 'synthetic' | 'catalog';

export interface CatalogEntry {
  name: string;
  x: number;
  y: number;
  z: number;
  mag?: number;
}
