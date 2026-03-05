/**
 * hdbscan.ts — Pure TypeScript HDBSCAN implementation
 * Hierarchical Density-Based Spatial Clustering of Applications with Noise
 *
 * Implements the full HDBSCAN* algorithm:
 *   1. Compute core distances (k-nearest neighbor distance for each point)
 *   2. Build mutual reachability distance graph
 *   3. Construct minimum spanning tree (Prim's algorithm)
 *   4. Build cluster hierarchy from MST
 *   5. Condense the cluster tree based on minClusterSize
 *   6. Extract stable clusters using cluster stability scores
 *
 * 100% client-side, no dependencies, no data leaves the browser.
 *
 * Reference: Campello, Moulavi, Sander (2013)
 * "Density-Based Clustering Based on Hierarchical Density Estimates"
 */

// ── Types ──

export interface HDBSCANOptions {
  /** Minimum number of points to form a cluster (default: 5) */
  minClusterSize?: number;
  /** Number of neighbors for core distance computation (default: 5) */
  minSamples?: number;
  /** Distance metric: "euclidean" or "cosine" (default: "cosine") */
  metric?: "euclidean" | "cosine";
}

export interface HDBSCANResult {
  /** Cluster label for each point (-1 = noise) */
  labels: number[];
  /** Cluster membership probability for each point (0.0 to 1.0) */
  probabilities: number[];
  /** Indices of noise points */
  noiseIndices: number[];
  /** Number of clusters found (excluding noise) */
  numClusters: number;
  /** Cluster stability scores */
  stabilities: Map<number, number>;
}

// ── MST Edge ──

interface MSTEdge {
  u: number;
  v: number;
  weight: number;
}

// ── Condensed Tree Node ──

interface CondensedNode {
  parent: number;
  child: number;
  lambdaVal: number;
  childSize: number;
}

// ── Distance Functions ──

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function cosineDistance(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 1;
  return 1 - dot / denom;
}

// ── Step 1: Core Distances ──

/**
 * Compute the core distance for each point.
 * Core distance = distance to the k-th nearest neighbor.
 */
function computeCoreDistances(
  data: number[][],
  minSamples: number,
  distFn: (a: number[], b: number[]) => number
): number[] {
  const n = data.length;
  const coreDistances = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    // Compute distances from point i to all other points
    const distances: number[] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      distances.push(distFn(data[i], data[j]));
    }
    // Sort and take the k-th smallest (0-indexed: minSamples - 1)
    distances.sort((a, b) => a - b);
    coreDistances[i] = distances[Math.min(minSamples - 1, distances.length - 1)];
  }

  return Array.from(coreDistances);
}

// ── Step 2: Mutual Reachability Distance ──

/**
 * Mutual reachability distance between two points:
 * mrd(a, b) = max(core_dist(a), core_dist(b), dist(a, b))
 */
function mutualReachabilityDistance(
  coreDistA: number,
  coreDistB: number,
  dist: number
): number {
  return Math.max(coreDistA, coreDistB, dist);
}

// ── Step 3: Minimum Spanning Tree (Prim's Algorithm) ──

/**
 * Build MST using Prim's algorithm on the mutual reachability graph.
 * Uses a dense approach suitable for our dataset sizes (< 10,000 points).
 */
function buildMST(
  data: number[][],
  coreDistances: number[],
  distFn: (a: number[], b: number[]) => number
): MSTEdge[] {
  const n = data.length;
  const inMST = new Uint8Array(n); // 0 = not in MST, 1 = in MST
  const minWeight = new Float64Array(n).fill(Infinity);
  const minFrom = new Int32Array(n).fill(-1);
  const edges: MSTEdge[] = [];

  // Start from node 0
  inMST[0] = 1;

  // Initialize distances from node 0
  for (let j = 1; j < n; j++) {
    const dist = distFn(data[0], data[j]);
    minWeight[j] = mutualReachabilityDistance(coreDistances[0], coreDistances[j], dist);
    minFrom[j] = 0;
  }

  for (let iter = 0; iter < n - 1; iter++) {
    // Find the closest node not yet in MST
    let bestNode = -1;
    let bestWeight = Infinity;

    for (let j = 0; j < n; j++) {
      if (inMST[j] === 0 && minWeight[j] < bestWeight) {
        bestWeight = minWeight[j];
        bestNode = j;
      }
    }

    if (bestNode === -1) break; // Disconnected graph

    // Add edge to MST
    inMST[bestNode] = 1;
    edges.push({ u: minFrom[bestNode], v: bestNode, weight: bestWeight });

    // Update distances for remaining nodes
    for (let j = 0; j < n; j++) {
      if (inMST[j] === 0) {
        const dist = distFn(data[bestNode], data[j]);
        const mrd = mutualReachabilityDistance(
          coreDistances[bestNode],
          coreDistances[j],
          dist
        );
        if (mrd < minWeight[j]) {
          minWeight[j] = mrd;
          minFrom[j] = bestNode;
        }
      }
    }
  }

  return edges;
}

// ── Step 4: Build Hierarchy from MST ──

/**
 * Union-Find data structure for building the hierarchy.
 */
class UnionFind {
  parent: Int32Array;
  size: Int32Array;
  nextLabel: number;

  constructor(n: number) {
    this.parent = new Int32Array(2 * n - 1);
    this.size = new Int32Array(2 * n - 1);
    this.nextLabel = n;
    for (let i = 0; i < n; i++) {
      this.parent[i] = i;
      this.size[i] = 1;
    }
  }

  find(x: number): number {
    let root = x;
    while (this.parent[root] !== root) {
      root = this.parent[root];
    }
    // Path compression
    while (this.parent[x] !== root) {
      const next = this.parent[x];
      this.parent[x] = root;
      x = next;
    }
    return root;
  }

  union(x: number, y: number): number {
    const label = this.nextLabel;
    this.parent[x] = label;
    this.parent[y] = label;
    this.parent[label] = label;
    this.size[label] = this.size[x] + this.size[y];
    this.nextLabel++;
    return label;
  }
}

/**
 * Build a single-linkage hierarchy from the MST.
 * Returns a dendrogram: each row is [child1, child2, distance, clusterSize].
 */
function buildHierarchy(
  mstEdges: MSTEdge[],
  n: number
): number[][] {
  // Sort edges by weight (ascending)
  const sorted = [...mstEdges].sort((a, b) => a.weight - b.weight);

  const uf = new UnionFind(n);
  const hierarchy: number[][] = [];

  for (const edge of sorted) {
    const rootU = uf.find(edge.u);
    const rootV = uf.find(edge.v);

    if (rootU === rootV) continue;

    const newSize = uf.size[rootU] + uf.size[rootV];
    const newLabel = uf.union(rootU, rootV);

    hierarchy.push([rootU, rootV, edge.weight, newSize]);

    // Ensure parent label is set correctly
    if (newLabel !== rootU && newLabel !== rootV) {
      // Already handled in union
    }
  }

  return hierarchy;
}

// ── Step 5: Condense the Cluster Tree ──

/**
 * Condense the hierarchy into a simplified tree where clusters
 * smaller than minClusterSize are treated as points falling out.
 */
function condenseTree(
  hierarchy: number[][],
  n: number,
  minClusterSize: number
): CondensedNode[] {
  const condensed: CondensedNode[] = [];
  const topNode = n + hierarchy.length - 1;

  // Map from old labels to new condensed labels
  const relabel = new Map<number, number>();
  let nextCondensedLabel = 0;

  // BFS from the top of the hierarchy
  const ignore = new Set<number>();

  // Process hierarchy in reverse (top-down)
  function getChildren(node: number): { left: number; right: number; distance: number } | null {
    if (node < n) return null; // Leaf node
    const idx = node - n;
    if (idx < 0 || idx >= hierarchy.length) return null;
    return {
      left: hierarchy[idx][0],
      right: hierarchy[idx][1],
      distance: hierarchy[idx][2],
    };
  }

  function getSize(node: number): number {
    if (node < n) return 1;
    const idx = node - n;
    if (idx < 0 || idx >= hierarchy.length) return 1;
    return hierarchy[idx][3];
  }

  function processNode(node: number, parentLabel: number): void {
    const children = getChildren(node);
    if (!children) {
      // Leaf node: add as a point falling out of parent
      const lambda = 0; // Will be set properly
      condensed.push({
        parent: parentLabel,
        child: node,
        lambdaVal: lambda,
        childSize: 1,
      });
      return;
    }

    const lambda = children.distance > 0 ? 1.0 / children.distance : Infinity;
    const leftSize = getSize(children.left);
    const rightSize = getSize(children.right);

    const leftIsBig = leftSize >= minClusterSize;
    const rightIsBig = rightSize >= minClusterSize;

    if (leftIsBig && rightIsBig) {
      // Both children are real clusters — this is a split
      const leftLabel = nextCondensedLabel++;
      const rightLabel = nextCondensedLabel++;
      relabel.set(children.left, leftLabel);
      relabel.set(children.right, rightLabel);

      condensed.push({
        parent: parentLabel,
        child: leftLabel + n, // Offset to distinguish from point indices
        lambdaVal: lambda,
        childSize: leftSize,
      });
      condensed.push({
        parent: parentLabel,
        child: rightLabel + n,
        lambdaVal: lambda,
        childSize: rightSize,
      });

      processNode(children.left, leftLabel);
      processNode(children.right, rightLabel);
    } else if (leftIsBig && !rightIsBig) {
      // Right is too small — its points fall out, left continues as parent
      addFallingPoints(children.right, parentLabel, lambda);
      processNode(children.left, parentLabel);
    } else if (!leftIsBig && rightIsBig) {
      // Left is too small — its points fall out, right continues as parent
      addFallingPoints(children.left, parentLabel, lambda);
      processNode(children.right, parentLabel);
    } else {
      // Both too small — all points fall out
      addFallingPoints(children.left, parentLabel, lambda);
      addFallingPoints(children.right, parentLabel, lambda);
    }
  }

  function addFallingPoints(node: number, parentLabel: number, lambda: number): void {
    if (node < n) {
      // Single point
      condensed.push({
        parent: parentLabel,
        child: node,
        lambdaVal: lambda,
        childSize: 1,
      });
      return;
    }

    // Recursively get all leaf points under this node
    const children = getChildren(node);
    if (!children) return;

    const childLambda = children.distance > 0 ? 1.0 / children.distance : lambda;

    addFallingPoints(children.left, parentLabel, childLambda);
    addFallingPoints(children.right, parentLabel, childLambda);
  }

  // Start processing from the root
  const rootLabel = nextCondensedLabel++;
  relabel.set(topNode, rootLabel);
  processNode(topNode, rootLabel);

  return condensed;
}

// ── Step 6: Extract Stable Clusters ──

/**
 * Compute cluster stability scores and extract the most stable clusters.
 * Stability = sum of (lambda_point - lambda_birth) for all points in cluster.
 */
function extractClusters(
  condensedTree: CondensedNode[],
  n: number,
  minClusterSize: number
): { labels: number[]; probabilities: number[]; stabilities: Map<number, number> } {
  // Identify all cluster nodes (child >= n means it's a cluster, not a point)
  const clusterNodes = new Set<number>();
  const clusterBirthLambda = new Map<number, number>();
  const clusterChildren = new Map<number, number[]>();
  const parentMap = new Map<number, number>();

  for (const node of condensedTree) {
    clusterNodes.add(node.parent);
    if (node.child >= n) {
      const clusterId = node.child - n;
      clusterNodes.add(clusterId);
      clusterBirthLambda.set(clusterId, node.lambdaVal);
      parentMap.set(clusterId, node.parent);
      if (!clusterChildren.has(node.parent)) {
        clusterChildren.set(node.parent, []);
      }
      clusterChildren.get(node.parent)!.push(clusterId);
    }
  }

  // Root cluster birth lambda is 0
  const clusterNodeArr = Array.from(clusterNodes);
  const rootCluster = clusterNodeArr.length > 0 ? Math.min(...clusterNodeArr) : 0;
  if (!clusterBirthLambda.has(rootCluster)) {
    clusterBirthLambda.set(rootCluster, 0);
  }

  // Compute stability for each cluster
  const stability = new Map<number, number>();
  const clusterPoints = new Map<number, { point: number; lambda: number }[]>();

  for (const node of condensedTree) {
    if (node.child < n) {
      // This is a point falling out of a cluster
      if (!clusterPoints.has(node.parent)) {
        clusterPoints.set(node.parent, []);
      }
      clusterPoints.get(node.parent)!.push({
        point: node.child,
        lambda: node.lambdaVal,
      });
    }
  }

  Array.from(clusterNodes).forEach((cluster) => {
    const birthLambda = clusterBirthLambda.get(cluster) || 0;
    const points = clusterPoints.get(cluster) || [];
    let stab = 0;
    for (const p of points) {
      stab += p.lambda - birthLambda;
    }
    stability.set(cluster, Math.max(0, stab));
  });

  // Select clusters: bottom-up, prefer children if their combined stability > parent
  const selected = new Set<number>();
  const isLeafCluster = new Map<number, boolean>();

  Array.from(clusterNodes).forEach((cluster) => {
    isLeafCluster.set(cluster, !clusterChildren.has(cluster) || clusterChildren.get(cluster)!.length === 0);
  });

  // Process bottom-up: leaf clusters first
  const processed = new Set<number>();

  function processCluster(cluster: number): number {
    if (processed.has(cluster)) {
      return stability.get(cluster) || 0;
    }
    processed.add(cluster);

    const children = clusterChildren.get(cluster) || [];
    if (children.length === 0) {
      // Leaf cluster — select it
      selected.add(cluster);
      return stability.get(cluster) || 0;
    }

    // Recursively process children
    let childStabilitySum = 0;
    for (const child of children) {
      childStabilitySum += processCluster(child);
    }

    const myStability = stability.get(cluster) || 0;

    if (childStabilitySum > myStability) {
      // Children are more stable — keep them selected
      stability.set(cluster, childStabilitySum);
      return childStabilitySum;
    } else {
      // Parent is more stable — deselect children, select parent
      for (const child of children) {
        deselectSubtree(child);
      }
      selected.add(cluster);
      return myStability;
    }
  }

  function deselectSubtree(cluster: number): void {
    selected.delete(cluster);
    const children = clusterChildren.get(cluster) || [];
    for (const child of children) {
      deselectSubtree(child);
    }
  }

  processCluster(rootCluster);

  // If only the root is selected, that means no meaningful subclusters were found
  // In this case, we keep the root but mark everything as one cluster
  if (selected.size === 1 && selected.has(rootCluster)) {
    // Check if root has children — if so, use them instead
    const rootChildren = clusterChildren.get(rootCluster) || [];
    if (rootChildren.length > 0) {
      selected.delete(rootCluster);
      for (const child of rootChildren) {
        selected.add(child);
      }
    }
  }

  // Assign labels to points
  const labels = new Int32Array(n).fill(-1);
  const probabilities = new Float64Array(n).fill(0);

  // Map selected clusters to sequential labels
  const selectedArray: number[] = [];
  selected.forEach((v) => selectedArray.push(v));
  selectedArray.sort((a, b) => a - b);
  const clusterLabelMap = new Map<number, number>();
  selectedArray.forEach((cluster, idx) => {
    clusterLabelMap.set(cluster, idx);
  });

  // Assign each point to the deepest selected cluster it belongs to
  // Build point-to-cluster mapping from condensed tree
  const pointClusterPath = new Map<number, number[]>();

  function collectPointClusters(cluster: number, path: number[]): void {
    const currentPath = [...path, cluster];
    const points = clusterPoints.get(cluster) || [];
    for (const p of points) {
      if (!pointClusterPath.has(p.point)) {
        pointClusterPath.set(p.point, []);
      }
      pointClusterPath.get(p.point)!.push(cluster);
    }
    const children = clusterChildren.get(cluster) || [];
    for (const child of children) {
      collectPointClusters(child, currentPath);
    }
  }

  collectPointClusters(rootCluster, []);

  // For each point, find the deepest selected cluster it belongs to
  for (let i = 0; i < n; i++) {
    const clusters = pointClusterPath.get(i) || [];
    let assignedCluster = -1;

    // The last cluster in the path is the deepest
    for (const cluster of clusters) {
      if (selected.has(cluster)) {
        assignedCluster = cluster;
      }
    }

    if (assignedCluster >= 0 && clusterLabelMap.has(assignedCluster)) {
      labels[i] = clusterLabelMap.get(assignedCluster)!;

      // Compute probability based on how long the point stayed in the cluster
      const birthLambda = clusterBirthLambda.get(assignedCluster) || 0;
      const pointEntry = (clusterPoints.get(assignedCluster) || []).find(
        (p) => p.point === i
      );
      const deathLambda = pointEntry?.lambda || 0;
      const clusterPts = clusterPoints.get(assignedCluster) || [];
      const lambdas = clusterPts.map((p) => p.lambda);
      const maxLambda = lambdas.length > 0 ? Math.max(...lambdas, birthLambda) : birthLambda;
      const range = maxLambda - birthLambda;
      probabilities[i] = range > 0 ? Math.min(1, (deathLambda - birthLambda) / range) : 1;
    }
  }

  // Ensure probabilities are in [0, 1]
  for (let i = 0; i < n; i++) {
    probabilities[i] = Math.max(0, Math.min(1, probabilities[i]));
  }

  return {
    labels: Array.from(labels),
    probabilities: Array.from(probabilities),
    stabilities: stability,
  };
}

// ── Main HDBSCAN Function ──

/**
 * Run HDBSCAN clustering on the given data.
 *
 * @param data - Array of data points (each point is a number[])
 * @param options - HDBSCAN configuration options
 * @returns Cluster labels, probabilities, and noise indices
 */
export function hdbscan(
  data: number[][],
  options: HDBSCANOptions = {}
): HDBSCANResult {
  const {
    minClusterSize = 5,
    minSamples = 5,
    metric = "cosine",
  } = options;

  const n = data.length;

  // Handle edge cases
  if (n === 0) {
    return { labels: [], probabilities: [], noiseIndices: [], numClusters: 0, stabilities: new Map() };
  }

  if (n < minClusterSize) {
    // Not enough points for any cluster — all noise
    return {
      labels: new Array(n).fill(-1),
      probabilities: new Array(n).fill(0),
      noiseIndices: Array.from({ length: n }, (_, i) => i),
      numClusters: 0,
      stabilities: new Map(),
    };
  }

  const distFn = metric === "cosine" ? cosineDistance : euclideanDistance;

  // Step 1: Core distances
  const actualMinSamples = Math.min(minSamples, n - 1);
  const coreDistances = computeCoreDistances(data, actualMinSamples, distFn);

  // Step 3: Build MST on mutual reachability graph
  const mstEdges = buildMST(data, coreDistances, distFn);

  if (mstEdges.length === 0) {
    return {
      labels: new Array(n).fill(-1),
      probabilities: new Array(n).fill(0),
      noiseIndices: Array.from({ length: n }, (_, i) => i),
      numClusters: 0,
      stabilities: new Map(),
    };
  }

  // Step 4: Build hierarchy
  const hierarchy = buildHierarchy(mstEdges, n);

  // Step 5: Condense tree
  const condensed = condenseTree(hierarchy, n, minClusterSize);

  // Step 6: Extract clusters
  const { labels, probabilities, stabilities } = extractClusters(condensed, n, minClusterSize);

  // Compute noise indices
  const noiseIndices: number[] = [];
  for (let i = 0; i < n; i++) {
    if (labels[i] === -1) {
      noiseIndices.push(i);
    }
  }

  // Count unique clusters
  const uniqueClusters = new Set(labels.filter((l: number) => l >= 0));

  return {
    labels,
    probabilities,
    noiseIndices,
    numClusters: uniqueClusters.size,
    stabilities,
  };
}
