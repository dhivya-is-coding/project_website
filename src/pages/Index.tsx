import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import LandscapeScene from "@/components/LandscapeScene";
import PageLayout from "@/components/PageLayout";
import ProjectCard from "@/components/ProjectCard";

const projects = [
  {
    title: "TrialTwin Lab",
    description: "Digital twin engine for oncology clinical trials. Generates synthetic patients, trains survival models, and estimates individual treatment effects to improve trial efficiency.",
    tags: ["Python", "Streamlit", "scikit-survival", "Plotly"],
    link: "/projects/trialtwin-lab",
    internal: true,
  },
];

const Index = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [hash]);

  return (
    <PageLayout>
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
            I am a computer scientist with a heart that beats for medtech. Starting out at USC as a biomedical engineer, I slid into computer science because I truly believe in the power of cutting-edge technology to revolutionize healthcare. I'm interested in devices and the algorithms that control them, techniques like CRISPR, and how we can leverage data to make leaps and bounds to what comes next in healthcare. I'm excited to be in an industry that I'm so passionate about, and would love to connect to talk about big ideas or opportunities!
          </p>
          <p className="text-muted-foreground font-body text-lg leading-relaxed">
            When I'm not coding, you'll find me reading, dancing, making art, exploring the outdoors, with my friends and loved ones right beside me.
          </p>
        </div>
      </section>
    </PageLayout>
  );
};

export default Index;
