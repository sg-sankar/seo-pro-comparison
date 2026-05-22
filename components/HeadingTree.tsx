import type { HeadingNode } from "@/lib/types";

export default function HeadingTree({ nodes }: { nodes: HeadingNode[] }) {
  if (!nodes || nodes.length === 0) {
    return <span className="text-gray-400 italic">none</span>;
  }
  return (
    <div className="font-mono text-xs space-y-0.5">
      {nodes.map((n, i) => (
        <div key={i} style={{ paddingLeft: `${(n.level - 1) * 12}px` }}>
          <span className="text-gray-400">H{n.level}:</span> {n.text}
        </div>
      ))}
    </div>
  );
}
