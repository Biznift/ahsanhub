import type { Metadata } from "next";
import Link from "next/link";
import { getPosts, getSite } from "@/lib/api";
import { Container, SectionHeader } from "@/components/section";

export const metadata: Metadata = { title: "Blog" };

export default async function BlogPage() {
  const [site, posts] = await Promise.all([getSite(), getPosts("blog")]);
  return (
    <Container className="py-10">
      <SectionHeader eyebrow={site?.name ?? "Ahsan Hub"} title="Blog" description="Notes from the directory." />
      {posts.length === 0 ? (
        <p className="text-muted">No posts yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="overflow-hidden rounded-2xl border border-line bg-surface">
              {post.cover && <img src={post.cover} alt="" className="h-40 w-full object-cover" />}
              <div className="p-5">
                <h2 className="text-lg font-semibold text-ink">{post.title}</h2>
                {post.excerpt && <p className="mt-2 text-sm text-muted">{post.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
