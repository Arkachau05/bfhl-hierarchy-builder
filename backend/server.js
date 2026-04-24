
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Helper functions for processing
function isValidNodeFormat(entry) {
  if (typeof entry !== "string") return false;
  entry = entry.trim();
  const pattern = /^[A-Z]->[A-Z]$/;
  if (!pattern.test(entry)) return false;
  
  // Check for self-loop
  const [parent, child] = entry.split("->");
  if (parent === child) return false;
  
  return true;
}

function buildHierarchies(validEdges) {
  const adjList = {};
  const children = new Set();
  const allNodes = new Set();

  // Build adjacency list
  for (const edge of validEdges) {
    const [parent, child] = edge.split("->");
    allNodes.add(parent);
    allNodes.add(child);
    children.add(child);

    if (!adjList[parent]) {
      adjList[parent] = [];
    }
    adjList[parent].push(child);
  }

  // Find roots (nodes that are never children)
  const roots = [];
  for (const node of allNodes) {
    if (!children.has(node)) {
      roots.push(node);
    }
  }

  // If no roots (pure cycle), use lexicographically smallest node
  if (roots.length === 0) {
    roots.push(Array.from(allNodes).sort()[0]);
  }

  const visited = new Set();
  const hierarchies = [];

  for (const root of roots) {
    if (visited.has(root)) continue;

    const group = new Set();
    const stack = [root];

    // Collect all nodes in this group
    while (stack.length > 0) {
      const node = stack.pop();
      if (group.has(node)) continue;
      group.add(node);

      if (adjList[node]) {
        for (const child of adjList[node]) {
          if (!group.has(child)) {
            stack.push(child);
          }
        }
      }
    }

    // Check for cycles
    const hasCycle = detectCycle(root, adjList, group);

    if (hasCycle) {
      hierarchies.push({
        root: root,
        tree: {},
        has_cycle: true
      });
    } else {
      const tree = buildTree(root, adjList);
      const depth = calculateDepth(tree);
      hierarchies.push({
        root: root,
        tree: tree,
        depth: depth
      });
    }

    for (const node of group) {
      visited.add(node);
    }
  }

  return hierarchies;
}

function detectCycle(start, adjList, group) {
  const visited = new Set();
  const recursionStack = new Set();

  function dfs(node) {
    visited.add(node);
    recursionStack.add(node);

    if (adjList[node]) {
      for (const child of adjList[node]) {
        if (!group.has(child)) continue;

        if (!visited.has(child)) {
          if (dfs(child)) return true;
        } else if (recursionStack.has(child)) {
          return true;
        }
      }
    }

    recursionStack.delete(node);
    return false;
  }

  return dfs(start);
}

function buildTree(root, adjList) {
  const tree = {};
  const queue = [[root, tree]];

  while (queue.length > 0) {
    const [node, currentLevel] = queue.shift();
    currentLevel[node] = {};

    if (adjList[node]) {
      for (const child of adjList[node]) {
        queue.push([child, currentLevel[node]]);
      }
    }
  }

  return tree;
}

function calculateDepth(tree) {
  function getMaxDepth(obj) {
    if (Object.keys(obj).length === 0) return 1;
    let maxDepth = 0;
    for (const key of Object.keys(obj)) {
      maxDepth = Math.max(maxDepth, getMaxDepth(obj[key]));
    }
    return maxDepth + 1;
  }

  return getMaxDepth(tree);
}

function findLargestTree(hierarchies) {
  let maxDepth = 0;
  let largestRoot = "";

  for (const h of hierarchies) {
    if (h.depth !== undefined) {
      if (h.depth > maxDepth || (h.depth === maxDepth && h.root < largestRoot)) {
        maxDepth = h.depth;
        largestRoot = h.root;
      }
    }
  }

  return largestRoot;
}

app.post("/bfhl", (req, res) => {
  const data = req.body.data || [];

  const invalidEntries = [];
  const seenEdges = new Set();
  const duplicateEdges = [];
  const validEdges = [];

  // Process each entry
  for (let entry of data) {
    entry = entry.trim();

    if (!isValidNodeFormat(entry)) {
      invalidEntries.push(entry);
    } else {
      if (seenEdges.has(entry)) {
        if (!duplicateEdges.includes(entry)) {
          duplicateEdges.push(entry);
        }
      } else {
        seenEdges.add(entry);
        validEdges.push(entry);
      }
    }
  }

  // Build hierarchies
  const hierarchies = buildHierarchies(validEdges);

  // Sort hierarchies by root for consistency
  hierarchies.sort((a, b) => a.root.localeCompare(b.root));

  // Calculate summary
  const totalTrees = hierarchies.filter(h => !h.has_cycle).length;
  const totalCycles = hierarchies.filter(h => h.has_cycle).length;
  const largestTreeRoot = findLargestTree(hierarchies);

  return res.json({
    user_id: "arkadyutichaudhuri_25012005",
    email_id: "arkadyutichaudhuri@gmail.com",
    college_roll_number: "RA2311003010931",
    hierarchies: hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: totalTrees,
      total_cycles: totalCycles,
      largest_tree_root: largestTreeRoot
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on " + PORT));
