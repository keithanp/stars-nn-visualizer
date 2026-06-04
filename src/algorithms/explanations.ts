export interface AlgorithmExplanation {
  summary: string;
  howItWorks: string[];
  complexity: { build?: string; query: string; space?: string };
  strengths: string[];
  weaknesses: string[];
}

export const ALGORITHM_EXPLANATIONS: Record<string, AlgorithmExplanation> = {
  'brute-force': {
    summary:
      'The simplest exact method that keeps the best K stars in a max-heap (a binary heap whose root is always the FARTHEST of the current K). As you scan every star, the heap lets you check and replace the current worst in logarithmic time.',
    howItWorks: [
      'Walk through every star once and compute its squared distance to the query point (squared avoids a costly square root).',
      'While the heap holds fewer than K stars, just push each new star in.',
      'Once the heap is full, compare the new star to the heap root (the current farthest). If it is closer, replace the root and let the heap "sift down" to restore order.',
      'After the full scan, the heap contains exactly the K nearest stars; sort them once for display.',
    ],
    complexity: { query: 'O(n log K)', space: 'O(K)' },
    strengths: [
      'Always exact and very easy to reason about.',
      'Only needs O(K) extra memory regardless of dataset size.',
      'No preprocessing/build step required.',
    ],
    weaknesses: [
      'Still examines all n stars, so it does not scale to huge datasets as well as spatial structures.',
      'The heap reshuffles can be cache-unfriendly compared to a flat array for small K.',
    ],
  },
  'full-sort': {
    summary:
      'The most direct interpretation of "find the closest 100": measure everything, sort by distance, and take the front of the list.',
    howItWorks: [
      'Compute the distance from the query point to every star and store all n (index, distance) pairs.',
      'Sort the entire array by ascending distance.',
      'Return the first K entries.',
    ],
    complexity: { query: 'O(n log n)', space: 'O(n)' },
    strengths: [
      'Trivial to implement and obviously correct.',
      'Gives you the full ranking for free, not just the top K.',
    ],
    weaknesses: [
      'Wasteful: it fully orders all n stars when you only needed the K smallest.',
      'Needs O(n) extra memory to hold every distance.',
    ],
  },
  quickselect: {
    summary:
      'A selection algorithm (the idea behind C++ std::nth_element) that finds the K-th smallest distance in linear time on average, partitioning the array so the K closest end up at the front without fully sorting.',
    howItWorks: [
      'Compute all n distances, exactly like full sort.',
      'Pick a pivot and partition the array so smaller distances go left, larger go right (Lomuto partition).',
      'If the pivot lands exactly at position K, you are done; otherwise recurse into only the side that contains the boundary.',
      'Finally sort just the K survivors at the front for display.',
    ],
    complexity: { query: 'O(n) average, O(n^2) worst', space: 'O(n)' },
    strengths: [
      'Asymptotically optimal for one-shot top-K: linear time on average.',
      'Avoids the log factor of both sorting and heaps.',
    ],
    weaknesses: [
      'Rearranges (mutates) the whole array and needs all n distances in memory.',
      'Rare worst-case O(n^2) with bad pivots; not incremental (must see all data first).',
    ],
  },
  'sorted-insert': {
    summary:
      'Maintains a small array of the best K stars kept in sorted order at all times. Each candidate is slotted into its correct position with a binary search.',
    howItWorks: [
      'Keep an array (max length K) sorted ascending by distance.',
      'For each star, if the array is full and the star is farther than the current last element, skip it immediately.',
      'Otherwise binary-search for the insertion point, shift the farther elements right, and drop whatever falls off the end.',
    ],
    complexity: { query: 'O(n*K) worst', space: 'O(K)' },
    strengths: [
      'Very cache-friendly for small K (a contiguous array, no pointer chasing).',
      'The result is already sorted, no final sort needed.',
      'Only O(K) memory.',
    ],
    weaknesses: [
      'Shifting elements is O(K) per insertion, so it degrades as K grows large.',
      'Worst case (stars arriving in decreasing distance order) does many shifts.',
    ],
  },
  'unordered-track-max': {
    summary:
      'The most literal "replace a star as you go" approach: keep K slots in no particular order, just remember which slot currently holds the FARTHEST star. No heap, no sorting during the scan.',
    howItWorks: [
      'Fill the first K slots with the first K stars, then scan the K to find the index of the farthest one.',
      'For each remaining star, compare it only to that current farthest. If it is closer, overwrite that slot.',
      'After an overwrite, rescan the K slots to find the new farthest.',
      'At the end, sort the K slots once for display.',
    ],
    complexity: { query: 'O(n*K) worst', space: 'O(K)' },
    strengths: [
      'Conceptually the simplest "swap out the worst" idea — easy to picture.',
      'Only O(K) memory and a flat array.',
    ],
    weaknesses: [
      'Each replacement triggers an O(K) rescan to find the new max.',
      'Generally slower than a heap once K is more than a handful.',
    ],
  },
  'kd-tree': {
    summary:
      'A binary tree that recursively splits 3D space along one axis at a time (x, then y, then z, repeating). It lets a query prune away entire half-spaces that cannot contain a closer star.',
    howItWorks: [
      'Build: recursively split the points at the median along a cycling axis, creating a balanced binary tree of axis-aligned regions.',
      'Query: descend toward the side of each split that contains the query point, collecting candidates into a max-heap of size K.',
      'On the way back up, check the "far" side: only descend into it if the distance from the query to the splitting plane is smaller than the current K-th distance.',
      'Branches whose bounding box is farther than the current worst are pruned entirely.',
    ],
    complexity: { build: 'O(n log n)', query: 'O(log n) average', space: 'O(n)' },
    strengths: [
      'Excellent for low dimensions like 3D; often examines a tiny fraction of all stars.',
      'Exact results with strong pruning when data is roughly uniform.',
    ],
    weaknesses: [
      'Needs an O(n log n) build step and O(n) memory for the tree.',
      'Pruning weakens for highly clustered data or very large K.',
    ],
  },
  octree: {
    summary:
      'A tree where each cube-shaped node subdivides into 8 equal child cubes (octants). It buckets stars by spatial region so the query can skip whole cubes.',
    howItWorks: [
      'Build: start with a cube enclosing all stars; whenever a cube holds too many points, split it into 8 octants and redistribute.',
      'Query: visit child cubes in order of how close they are to the query point, gathering candidates into a max-heap.',
      'Skip any cube whose nearest possible point is farther than the current K-th distance.',
    ],
    complexity: { build: 'O(n log n)', query: 'O(log n) average', space: 'O(n)' },
    strengths: [
      'Natural fit for 3D point clouds; adapts depth to local density.',
      'Cube pruning is simple and effective.',
    ],
    weaknesses: [
      'Can become unbalanced and deep where stars cluster tightly.',
      'Build and memory overhead versus a flat scan.',
    ],
  },
  'spatial-grid': {
    summary:
      'Divides space into a uniform grid of equal-sized cells and buckets each star into a cell. The query expands outward shell by shell from the cell containing the query point.',
    howItWorks: [
      'Build: choose a cell size from the data extent and density, then hash every star into its cell.',
      'Query: start at the query point cell and examine progressively larger "shells" of neighboring cells.',
      'Stop expanding once the nearest unvisited cell is farther than the current K-th distance.',
    ],
    complexity: { build: 'O(n)', query: 'O(K) average for uniform data', space: 'O(n)' },
    strengths: [
      'Build is linear and very fast; great when points are roughly uniform.',
      'Simple, predictable expanding-shell search.',
    ],
    weaknesses: [
      'A fixed cell size is poor for clustered data (cells get crowded or empty).',
      'Choosing the cell size is a tuning trade-off.',
    ],
  },
  bvh: {
    summary:
      'A Bounding Volume Hierarchy: a binary tree where every node stores a tight axis-aligned bounding box (AABB) around all the stars beneath it. Queries prune by box distance.',
    howItWorks: [
      'Build: recursively split the stars along the longest axis of their bounding box until leaves hold only a few points.',
      'Query: descend into child boxes nearest the query point first, collecting into a max-heap of size K.',
      'Prune any subtree whose bounding box is farther from the query than the current K-th distance.',
    ],
    complexity: { build: 'O(n log n)', query: 'O(log n) average', space: 'O(n)' },
    strengths: [
      'Tight fitted boxes adapt to the actual data distribution, including clusters.',
      'Widely used in graphics/ray tracing; robust pruning.',
    ],
    weaknesses: [
      'Boxes of sibling nodes can overlap, weakening pruning.',
      'Build cost and tree memory overhead.',
    ],
  },
  'approx-grid': {
    summary:
      'A deliberately APPROXIMATE method: it uses a coarse grid and only searches a small fixed neighborhood of cells around the query. It trades exactness for speed and reports its recall.',
    howItWorks: [
      'Build: bucket stars into a coarse grid (larger cells than the exact grid).',
      'Query: only examine cells within a small fixed radius of the query cell — no expanding shells.',
      'Return the best K found in that limited region, and compare against the true answer to report recall (the fraction of true nearest neighbors recovered).',
    ],
    complexity: { build: 'O(n)', query: 'O(1) region scan', space: 'O(n)' },
    strengths: [
      'Very fast and constant-ish per query regardless of n.',
      'Recall metric makes the speed-vs-accuracy trade-off explicit.',
    ],
    weaknesses: [
      'Not exact: may miss true neighbors that sit just outside the searched cells.',
      'Accuracy depends heavily on cell size and the chosen search radius.',
    ],
  },
};
