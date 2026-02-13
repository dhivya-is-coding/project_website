import LandscapeScene from "@/components/LandscapeScene";
import ProjectCard from "@/components/ProjectCard";
import { Github, Mail } from "lucide-react";

const projects = [
  {
    title: "Project Alpha",
    description: "A full-stack application built with modern web technologies. Featuring real-time updates and a clean interface.",
    tags: ["React", "TypeScript", "Node.js"],
    link: "#",
  },
  {
    title: "Data Visualizer",
    description: "Interactive data visualization tool that transforms complex datasets into beautiful, understandable charts.",
    tags: ["D3.js", "Python", "API"],
    link: "#",
  },
  {
    title: "CLI Toolkit",
    description: "A collection of command-line tools to streamline development workflows and automate repetitive tasks.",
    tags: ["Rust", "CLI", "Open Source"],
    link: "#",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-md border-b border-border/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-display text-lg font-semibold text-foreground">Portfolio</span>
          <div className="flex items-center gap-6">
            <a href="#projects" className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
              Projects
            </a>
            <a href="#about" className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <LandscapeScene />

      {/* Projects */}
      <section id="projects" className="max-w-5xl mx-auto px-6 py-24">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
          Projects
        </h2>
        <p className="text-muted-foreground font-body mb-12">
          A selection of things I've built and contributed to.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.title} {...project} />
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="max-w-5xl mx-auto px-6 py-24 border-t border-border">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
            About
          </h2>
          <p className="text-muted-foreground font-body text-lg leading-relaxed mb-4">
            I'm a developer who loves building things that live on the internet. I care deeply about clean code, thoughtful design, and creating experiences that feel effortless.
          </p>
          <p className="text-muted-foreground font-body text-lg leading-relaxed">
            When I'm not coding, you'll find me exploring the outdoors, reading, or tinkering with new technologies.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground font-body text-sm">
            © {new Date().getFullYear()} · Built with care
          </p>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <Github className="w-4 h-4" />
            </a>
            <a href="mailto:hello@example.com" className="text-muted-foreground hover:text-foreground transition-colors">
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
