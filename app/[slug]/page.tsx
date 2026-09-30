import { getAllArticles, getArticleBySlug } from "@/lib/articles";
import { marked } from "marked";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};
  return {
    title: `${article.title} — AI Pulse`,
    description: article.description,
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const html = marked(article.content) as string;

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-violet-400 mb-8 transition-colors"
      >
        ← Back to articles
      </Link>

      <article>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-violet-900/40 text-violet-400 px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
          <span className="text-xs text-gray-600 ml-auto">
            {new Date(article.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
          {article.title}
        </h1>

        <p className="text-gray-400 text-lg mb-10 pb-10 border-b border-gray-800">
          {article.description}
        </p>

        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>
    </div>
  );
}
