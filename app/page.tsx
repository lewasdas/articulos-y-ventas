import { getAllArticles } from "@/lib/articles";
import Link from "next/link";

export default function Home() {
  const articles = getAllArticles();

  return (
    <div>
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-3">
          Daily AI & Tech Insights
        </h1>
        <p className="text-gray-400 text-lg">
          Fresh articles every day — tools, trends, and guides for the AI era.
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-5xl mb-4">🤖</p>
          <p className="text-lg">First article drops tomorrow.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/${article.slug}`}
              className="block group"
            >
              <article className="border border-gray-800 rounded-xl p-6 hover:border-violet-700 hover:bg-gray-900 transition-all">
                <div className="flex items-center gap-2 mb-3">
                  {article.tags.slice(0, 3).map((tag) => (
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
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-violet-300 transition-colors">
                  {article.title}
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {article.description}
                </p>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
