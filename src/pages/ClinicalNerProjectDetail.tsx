import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Github } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const GITHUB_URL = "https://github.com/dhivya-is-coding/clinical-ner";

const tags = ["Python", "PyTorch", "HuggingFace", "BioBERT", "seqeval", "Google Colab"];

const ClinicalNerProjectDetail = () => {
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
          Clinical NER
        </h1>
        <p className="font-body text-lg text-muted-foreground mb-6">
          Fine-tuning BioBERT for clinical named entity recognition
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
          to="/blog/clinical-ner"
          className="group block rounded-lg border border-primary/30 bg-primary/5 p-6 mb-16 transition-all duration-300 hover:border-primary/60 hover:bg-primary/10 hover:shadow-[0_0_40px_-10px_hsl(32,90%,55%,0.25)]"
        >
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
              Read the Technical Deep Dive
            </h2>
          </div>
          <p className="font-body text-sm text-muted-foreground leading-relaxed mb-3">
            A detailed walkthrough of subword label alignment, BioBERT fine-tuning on BC5CDR, entity-level evaluation, error taxonomy, and domain transfer analysis on synthetic prior authorization notes.
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
            Clinical NER fine-tunes BioBERT v1.1 on the BC5CDR dataset for Disease and Chemical
            entity recognition in biomedical text. The pipeline handles subword-to-label alignment
            for WordPiece tokenization, trains with entity-level strict span matching via seqeval,
            and includes a complete inference path from raw text to character-level entity spans.
          </p>
          <p className="font-body text-muted-foreground leading-relaxed">
            Beyond in-distribution evaluation, the project stress-tests the model on synthetic
            prior authorization notes to quantify the domain transfer gap between PubMed abstracts
            and clinical documents. The analysis surfaces specific, predictable failure modes:
            brand-name drugs, multi-word disease spans, drug-dose patterns, and clinical abbreviations.
          </p>
          <p className="font-body text-muted-foreground leading-relaxed">
            The results are honest about what works, what doesn't, and what would need to change
            for production use — including the data flywheel that would close the domain gap.
          </p>
        </div>

        {/* Key Features */}
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground mb-6">
            Key Features
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: "Subword Label Alignment", desc: "Robust tokenization pipeline using word_ids() and PyTorch's -100 ignore index for correct BIO tag alignment across WordPiece subwords." },
              { title: "Entity-Level Evaluation", desc: "Strict span matching with seqeval — per-type F1 for Chemical and Disease entities, plus a four-category error taxonomy." },
              { title: "Domain Transfer Analysis", desc: "Synthetic prior authorization notes test brand-name drugs, clinical abbreviations, and multi-word disease spans the model hasn't seen." },
              { title: "Raw Text Inference", desc: "Complete pipeline from arbitrary text to character-level entity spans using offset mapping and BIO decoding." },
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

export default ClinicalNerProjectDetail;
