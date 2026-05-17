const tuples: Tuple[] = [];

const walk = (node: TreeNode): void => {
  if (node.groupRow) {
    tuples.push([node.groupRow] as Tuple);
  }
  for (const childGroupId of node.order) {
    walk(node.children.get(childGroupId)!);
  }
  if (node.rows.length > 0) {
    tuples.push([...node.rows] as Tuple);
  }
};

walk(root);
return tuples.slice(0, maxRows);