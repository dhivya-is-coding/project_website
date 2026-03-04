import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, Github } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const GITHUB_URL = "https://github.com/dhivya-is-coding/dental-vision";

const tags = ["Python", "PyTorch", "Keras", "ResNet50", "AWS Lambda", "Docker"];

const DentalVisionProjectDetail = () => {
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
          Dental Vision
        </h1>
        <p className="font-body text-lg text-muted-foreground mb-6">
          Transfer learning for dental X-ray classification
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
          to="/blog/dental-vision"
          className="group block rounded-lg border border-primary/30 bg-primary/5 p-6 mb-16 transition-all duration-300 hover:border-primary/60 hover:bg-primary/10 hover:shadow-[0_0_40px_-10px_hsl(32,90%,55%,0.25)]"
        >
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
              Read the Technical Deep Dive
            </h2>
          </div>
          <p className="font-body text-sm text-muted-foreground leading-relaxed mb-3">
            A detailed walkthrough of the dataset constraints, transfer learning approaches, augmentation pipeline bugs, MPS training on Apple Silicon, and serverless deployment on AWS Lambda.
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
            Dental Vision is a binary classifier for dental panoramic X-rays (OPGs) that predicts
            whether an image shows acceptable dentition or needs further review for potential pathology.
            Three models are trained and compared: a simple CNN baseline, a Keras ResNet50 with frozen
            backbone, and a PyTorch ResNet50 with two-stage fine-tuning.
          </p>
          <p className="font-body text-muted-foreground leading-relaxed">
            The project confronts the reality of small-dataset medical imaging head-on. With only 517
            images across six diagnostic classes collapsed into a binary triage label, every design
            decision — from augmentation ordering to class-weighted loss functions — is driven by the
            constraint of limited data. The results are reported honestly, including AUC scores that
            confirm the data bottleneck.
          </p>
          <p className="font-body text-muted-foreground leading-relaxed">
            The best model is exported to TorchScript and packaged for serverless inference on AWS Lambda
            behind an API Gateway endpoint. The full infrastructure is defined as a SAM template for
            one-command deployment.
          </p>
        </div>

        {/* Key Features */}
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground mb-6">
            Key Features
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: "Multi-Framework Comparison", desc: "Three models across Keras and PyTorch — CNN baseline, frozen ResNet50, and two-stage fine-tuned ResNet50 — benchmarked on identical data splits." },
              { title: "Two-Stage Fine-Tuning", desc: "Gradual backbone unfreezing with cosine annealing and class-weighted loss to maximize learning from 361 training images." },
              { title: "Honest Evaluation", desc: "Full metrics suite including AUC-ROC, precision-recall, confusion matrices, and inference latency — no cherry-picked results." },
              { title: "Serverless Deployment", desc: "TorchScript export to AWS Lambda with Docker packaging, API Gateway endpoint, and SAM infrastructure-as-code." },
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

export default DentalVisionProjectDetail;
