import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost } from "@/lib/api";
import { Container } from "@/components/section";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || post.kind === "page") return { title: "Blog" };
  return { title: post.title, description: post.excerpt || undefined };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || post.kind === "page") notFound();
  return (
    <Container className="max-w-3xl py-10">
      {post.cover && <img src={post.cover} alt="" className="mb-6 h-64 w-full rounded-2xl object-cover" />}
      <h1 className="text-3xl font-semibold tracking-tight text-ink">{post.title}</h1>
      {post.excerpt && <p className="mt-3 text-muted">{post.excerpt}</p>}
      <article className="prose mt-8 max-w-none text-ink" dangerouslySetInnerHTML={{ __html: post.html ?? "" }} />
    </Container>
  );
}
