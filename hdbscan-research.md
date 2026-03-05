# HDBSCAN Research for IR Analytics

## Available JS Implementations

### 1. hdbscan-js (shaileshpandit) - npm: not published as package
- TypeScript, 5 stars, GPL-3.0
- "Work in Progress" - only dense input via kd-tree
- Follows scikit-learn implementation
- Not suitable - incomplete, GPL license

### 2. hdbscanjs (rivulet-zhang) - npm: hdbscanjs
- 1,943 weekly downloads, MIT license
- Returns a tree structure, not flat cluster labels
- Designed for geo/visualization use cases
- API: returns treeNode with left/right/data/index/dist
- No minClusterSize parameter, no noise labels
- Not suitable - different API paradigm, no noise detection

### 3. density-clustering (npm)
- Has DBSCAN and OPTICS but NOT HDBSCAN
- DBSCAN available but requires epsilon parameter (defeats purpose)

## Decision: Implement HDBSCAN from scratch

Neither JS package provides a proper HDBSCAN with:
- minClusterSize parameter
- Flat cluster labels with -1 for noise
- Cluster stability-based extraction

The algorithm steps (from hdbscan.readthedocs.io):
1. Transform the space according to density (mutual reachability distance)
2. Build minimum spanning tree of the distance weighted graph
3. Construct cluster hierarchy from MST
4. Condense the cluster tree based on minClusterSize
5. Extract stable clusters from condensed tree

For our use case (50-5000 comment embeddings, 384 dimensions):
- We already have embeddings and a cosine distance function
- We can implement a simplified but correct HDBSCAN
- Key: mutual reachability distance, MST via Prim's, condensed tree, stability extraction

## Implementation Plan
- Pure TypeScript, no dependencies
- Input: embeddings (number[][]), minClusterSize (default 5), minSamples (default 5)
- Output: { labels: number[], noise: number[], probabilities: number[] }
- labels[i] = -1 means noise, >= 0 means cluster ID
