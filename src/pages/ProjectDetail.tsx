import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, Github } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const STREAMLIT_URL = "https://trial-twin.streamlit.app/";
const GITHUB_URL = "https://github.com/dhivya-is-coding/trial-twin";

const tags = ["Python", "Streamlit", "scikit-survival", "lifelines", "Plotly", "Pandas"];

const ProjectDetail = () => {
  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-6 pt-28 pb-24">
        {/* Back link */}
        <Link
          to="/#projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10 font-body"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>

        {/* Header */}
        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-3">
          TrialTwin Lab
        </h1>
        <p className="font-body text-lg text-muted-foreground mb-6">
          Digital twins for oncology clinical trials
        </p>

        {/* Tech tags */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="font-body">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mb-12">
          <Button asChild>
            <a href={STREAMLIT_URL} target="_blank" rel="noopener noreferrer">
              Launch App
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              View Source
              <Github className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </div>

        <Separator className="mb-12" />

        {/* Blog CTA */}
        <Link
          to="/blog/trialtwin-lab"
          className="group block rounded-lg border border-primary/30 bg-primary/5 p-6 mb-16 transition-all duration-300 hover:border-primary/60 hover:bg-primary/10 hover:shadow-[0_0_40px_-10px_hsl(32,90%,55%,0.25)]"
        >
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
              Read the Technical Deep Dive
            </h2>
          </div>
          <p className="font-body text-sm text-muted-foreground leading-relaxed mb-3">
            A detailed walkthrough of the architecture, synthetic data pipeline, survival modeling, digital twin generation, and PROCOVA efficiency analysis.
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm font-body font-medium text-primary">
            Read the blog post
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        {/* Description */}
        <div className="max-w-3xl space-y-6 mb-16">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Overview
          </h2>
          <p className="font-body text-muted-foreground leading-relaxed">
            TrialTwin Lab is an end-to-end digital twin engine for oncology clinical trials.
            It generates synthetic patient cohorts, harmonizes clinical data, trains prognostic
            survival models, and produces counterfactual predictions for treated patients — enabling
            researchers to estimate individual treatment effects and improve trial efficiency.
          </p>
          <p className="font-body text-muted-foreground leading-relaxed">
            The system uses a Cox proportional hazards model trained exclusively on control-arm
            baseline features to generate "digital twins" — predicted survival curves for what would
            have happened to treated patients had they received the control treatment. By comparing
            observed outcomes against these counterfactual predictions, the platform quantifies
            individual treatment effects across the trial population.
          </p>
          <p className="font-body text-muted-foreground leading-relaxed">
            A PROCOVA-style covariate adjustment simulation demonstrates how prognostic score
            adjustment narrows confidence intervals, reducing the number of patients needed
            for equivalent statistical power. The interactive dashboard provides two views:
            a Patient Explorer for individual digital twin analysis and a Trial Dashboard for
            aggregate results and efficiency metrics.
          </p>
        </div>

        {/* Key Features */}
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground mb-6">
            Key Features
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: "Patient Explorer", desc: "Interactive survival curves, feature contributions, and individual treatment effects for each patient." },
              { title: "Trial Dashboard", desc: "Kaplan-Meier curves by arm, aggregate metrics, digital twin summaries, and data quality reports." },
              { title: "Synthetic Data Generation", desc: "Configurable cohort generation with correlated covariates, Weibull survival, and longitudinal tumor dynamics." },
              { title: "Efficiency Analysis", desc: "PROCOVA-style covariate adjustment showing CI reduction and sample size savings." },
            ].map((feature) => (
              <div key={feature.title} className="rounded-lg bg-card border border-border p-5">
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default ProjectDetail;
