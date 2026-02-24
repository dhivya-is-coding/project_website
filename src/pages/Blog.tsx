import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import PageLayout from "@/components/PageLayout";

const posts = [
  {
    title: "Building TrialTwin Lab",
    description:
      "A technical deep dive into building digital twins for oncology clinical trials — synthetic data generation, survival models, and individual treatment effect estimation.",
    date: "February 2026",
    link: "/blog/trialtwin-lab",
  },
];

const Blog = () => {
  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-6 pt-28 pb-24">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
          Blog
        </h1>
        <p className="text-muted-foreground font-body mb-12">
          Writing about things I'm building and learning.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.link}
              to={post.link}
              className="group block rounded-lg bg-card border border-border p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_-10px_hsl(32,90%,55%,0.2)]"
            >
              <div className="flex items-start justify-between">
                <h2 className="font-display text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="mt-2 text-muted-foreground font-body text-sm leading-relaxed">
                {post.description}
              </p>
              <p className="mt-4 text-xs font-body text-muted-foreground">
                {post.date}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </PageLayout>
  );
};

export default Blog;
