import { Link } from "react-router-dom";
import { ExternalLink, ArrowRight, BookOpen } from "lucide-react";

interface ProjectCardProps {
  title: string;
  description: string;
  tags: string[];
  link?: string;
  internal?: boolean;
  blogLink?: string;
}

const ProjectCard = ({ title, description, tags, link, internal, blogLink }: ProjectCardProps) => {
  const className = "group block rounded-lg bg-card border border-border p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_-10px_hsl(32,90%,55%,0.2)]";

  const content = (
    <>
      <div className="flex items-start justify-between">
        <h3 className="font-display text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        {internal ? (
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        ) : (
          <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      <p className="mt-2 text-muted-foreground font-body text-sm leading-relaxed">
        {description}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="text-xs font-body font-medium px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
      {blogLink && (
        <div className="mt-4 pt-4 border-t border-border">
          <Link 
            to={blogLink}
            className="inline-flex items-center gap-1.5 text-xs font-body font-medium text-primary hover:text-primary/80 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Read the technical deep dive
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </>
  );

  if (internal && link) {
    return (
      <Link to={link} className={className}>
        {content}
      </Link>
    );
  }

  if (link) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
};

export default ProjectCard;
