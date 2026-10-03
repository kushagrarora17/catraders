import Link from "next/link";
import type { CATEGORY_TREE_QUERY_RESULT } from "@/sanity/types";

type Node = { _id: string; title: string; slug: string; children?: Node[] };

const categoryHref = (slug: string) => `/products?category=${encodeURIComponent(slug)}`;

function Branch({ nodes, depth }: { nodes: Node[]; depth: number }) {
  return (
    <ul className={depth === 0 ? "grid gap-6 sm:grid-cols-2" : "ml-4 mt-1 space-y-1"}>
      {nodes.map((node) => (
        <li key={node._id}>
          <Link
            href={categoryHref(node.slug)}
            className={depth === 0 ? "font-heading text-lg font-semibold hover:text-highlight" : "hover:text-highlight"}
          >
            {node.title}
          </Link>
          {node.children && node.children.length > 0 && <Branch nodes={node.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

export function CategoryTree({ categories }: { categories: CATEGORY_TREE_QUERY_RESULT }) {
  if (!categories.length) {
    return <p className="text-muted-foreground">No categories yet.</p>;
  }
  return <Branch nodes={categories} depth={0} />;
}
