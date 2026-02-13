import { ExternalLink } from "lucide-react";

interface ProjectCardProps {
  title: string;
  description: string;
  tags: string[];
  link?: string;
}

const ProjectCard = ({ title, description, tags, link }: ProjectCardProps) => {
  return (
    <a
      href={link || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg bg-card border border-border p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_-10px_hsl(32,90%,55%,0.2)]"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-display text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
    </a>
  );
};

export default ProjectCard;
