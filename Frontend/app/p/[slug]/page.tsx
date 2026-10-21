import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost } from "@/lib/api";
import { Container } from "@/components/section";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || post.kind !== "page") return { title: "Page" };
  return { title: post.title, description: post.excerpt || undefined };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || post.kind !== "page") notFound();
  return (
    <Container className="max-w-3xl py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">{post.title}</h1>
      <article className="prose mt-8 max-w-none text-ink" dangerouslySetInnerHTML={{ __html: post.html ?? "" }} />
    </Container>
  );
}
