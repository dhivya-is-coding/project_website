import { Link } from "react-router-dom";
import { Github, Mail } from "lucide-react";

interface PageLayoutProps {
  children: React.ReactNode;
}

const PageLayout = ({ children }: PageLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-md border-b border-border/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-lg font-semibold text-foreground">
            Dhivya's Space
          </Link>
          <div className="flex items-center gap-6">
            <a href="/#projects" className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
              Projects
            </a>
            <Link to="/blog/trialtwin-lab" className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
              Blog
            </Link>
            <a href="/#about" className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </a>
            <a
              href="https://github.com/dhivya-is-coding/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </nav>

      {children}

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground font-body text-sm">
            &copy; {new Date().getFullYear()} &middot; Built with joy
          </p>
          <div className="flex items-center gap-4">
            <a href="https://github.com/dhivya-is-coding/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <Github className="w-4 h-4" />
            </a>
            <a href="mailto:dhivya.is.working@gmail.com" className="text-muted-foreground hover:text-foreground transition-colors">
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PageLayout;
