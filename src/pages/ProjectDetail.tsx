import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Github } from "lucide-react";
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
        <div className="mb-16">
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

        {/* Screenshots */}
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground mb-6">
            Screenshots
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {["Patient Explorer", "Trial Dashboard"].map((label) => (
              <div
                key={label}
                className="rounded-lg bg-card border border-border aspect-video flex items-center justify-center"
              >
                <span className="text-muted-foreground font-body text-sm">
                  {label} — screenshot coming soon
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default ProjectDetail;
