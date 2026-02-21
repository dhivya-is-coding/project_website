import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { Separator } from "@/components/ui/separator";

const BlogPost = () => {
  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-6 pt-28 pb-24">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10 font-body"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Article header */}
        <header className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Building TrialTwin Lab
          </h1>
          <p className="font-body text-sm text-muted-foreground">
            February 2026
          </p>
        </header>

        <Separator className="mb-10" />

        {/* Article content */}
        <article className="prose prose-invert prose-orange max-w-none font-body
          prose-headings:font-display prose-headings:text-foreground
          prose-p:text-muted-foreground prose-p:leading-relaxed
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-strong:text-foreground
          prose-li:text-muted-foreground
          prose-blockquote:border-primary/40 prose-blockquote:text-muted-foreground
        ">
          <p>Blog post content coming soon.</p>
        </article>
      </div>
    </PageLayout>
  );
};

export default BlogPost;
