import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { Separator } from "@/components/ui/separator";
import MarkdownRenderer from "@/components/MarkdownRenderer";
// Import blog content - each blog page imports its own markdown
import blogContent from "../../trial_twin_blog.md?raw";

const BlogPost = () => {
  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-6 pt-28 pb-24">
        {/* Back link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10 font-body"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
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
        <article>
          <MarkdownRenderer content={blogContent} />
        </article>
      </div>
    </PageLayout>
  );
};

export default BlogPost;
