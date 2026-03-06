# Fine-Tuning BioBERT for Clinical Named Entity Recognition

## The Problem

Prior authorization is one of the most labor-intensive processes in healthcare administration. A clinician writes a narrative note justifying a treatment request — "Patient is a 58-year-old male with a history of type 2 diabetes mellitus and stage 3 chronic kidney disease, requesting authorization for Ozempic" — and someone on the other end has to read that note, find the diagnoses, find the drugs, and decide whether the request meets criteria. This happens millions of times per year. The bottleneck isn't the decision itself — it's extracting structured information from unstructured clinical text.

Named entity recognition (NER) is the core capability needed to automate this extraction. Given a block of clinical text, identify every mention of a disease and every mention of a drug, with their exact boundaries in the text. This project fine-tunes BioBERT on the BC5CDR dataset for Disease and Chemical entity recognition, evaluates it rigorously on in-distribution test data, and then stress-tests it on synthetic prior authorization notes to quantify the domain transfer gap between PubMed abstracts and clinical documents.

The results are honest about what works, what doesn't, and what would need to change for production use.

---

## The Dataset: BC5CDR

### Why BC5CDR

The BioCreative V Chemical Disease Relation (BC5CDR) corpus contains ~1,500 PubMed abstracts annotated with Disease and Chemical entity spans. The `tner/bc5cdr` version on HuggingFace splits these abstracts into sentences, yielding ~16,000 examples:

| Split | Sentences |
|-------|-----------|
| Train | 5,228 |
| Validation | 5,330 |
| Test | 5,865 |

Two entity types with BIO tagging produces five labels: `O`, `B-Chemical`, `B-Disease`, `I-Disease`, `I-Chemical`. The tag IDs in the dataset are not sequential by entity type — Chemical uses IDs 1 and 4, Disease uses 2 and 3. This is a detail that's easy to get wrong silently. If you assume sequential ordering and build your own mapping, the model trains fine but learns to predict Disease tokens as Chemical and vice versa. The fix is to use the dataset's mapping exactly as provided:

```python
LABEL_NAMES = ["O", "B-Chemical", "B-Disease", "I-Disease", "I-Chemical"]
ID2LABEL = {i: label for i, label in enumerate(LABEL_NAMES)}
```

### Entity Distribution

Chemical and Disease entities appear in roughly equal numbers across all splits. Disease entities are slightly more frequent, but the more important asymmetry is in entity length: Chemical entities tend to be short — most are single-token generic drug names like "metformin" or "carboplatin." Disease entities skew longer and include multi-word spans like "non-small cell lung cancer" and "familial hypercholesterolemia."

This length difference directly predicts where the model will struggle. Longer entities require the model to correctly predict B- tags at the start and then sustain I- tags for every subsequent token without dropping out to O prematurely. Each additional token in the span is another opportunity for a boundary error.

---

## The Model: BioBERT v1.1

### Why BioBERT

`dmis-lab/biobert-v1.1` is a BERT-Base model (12 layers, 768 hidden, 110M parameters) pretrained on ~4.5 billion words from PubMed abstracts. It uses the original BERT cased vocabulary with WordPiece tokenization.

The choice over alternatives was deliberate. Bio_ClinicalBERT (`emilyalsentzer/Bio_ClinicalBERT`) is pretrained on MIMIC-III clinical notes, which would be a better domain match for clinical PA text — but it was pretrained with a max sequence length of 128 and has less total pretraining data (880M vs 4.5B words). PubMedBERT uses a domain-specific vocabulary trained from scratch on PubMed, which avoids the vocabulary mismatch problem of applying general-domain WordPiece to biomedical text. But BioBERT is the standard baseline for biomedical NER, has well-documented published results on BC5CDR (93.47% Chemical F1, 87.15% Disease F1), and the domain transfer gap between PubMed-pretrained and clinical text is itself an interesting result to demonstrate.

### A Tokenizer Bug Worth Documenting

There are two BioBERT checkpoints on HuggingFace: `dmis-lab/biobert-v1.1` and `dmis-lab/biobert-base-cased-v1.1`. The second one is missing `tokenizer_config.json`, which causes the tokenizer to silently default to `do_lower_case=True`. This lowercases all input before tokenization — on a cased model. The result: the model sees inputs that don't match its pretraining distribution, and performance degrades in ways that look like a learning rate problem or a data issue, not a tokenization bug. Stick with `dmis-lab/biobert-v1.1`.

---

## Subword Label Alignment: The Hardest Easy Problem

BioBERT's WordPiece tokenizer splits unknown words into subword pieces. "Pembrolizumab" might become `["Pem", "##bro", "##liz", "##umab"]`. The training data has one label per word, but the model needs one label per subword. The alignment strategy:

- First subword of each word gets the true BIO label
- Continuation subwords get `-100` (PyTorch's ignore index, excluded from loss)
- Special tokens (`[CLS]`, `[SEP]`) get `-100`

```python
def tokenize_and_align_labels(examples, tokenizer, max_length=512):
    tokenized = tokenizer(
        examples["tokens"],
        is_split_into_words=True,
        truncation=True,
        max_length=max_length,
    )

    all_labels = []
    for i, labels in enumerate(examples["tags"]):
        word_ids = tokenized.word_ids(batch_index=i)
        aligned_labels = []
        prev_word_id = None
        for word_id in word_ids:
            if word_id is None:
                aligned_labels.append(-100)
            elif word_id != prev_word_id:
                aligned_labels.append(labels[word_id])
            else:
                aligned_labels.append(-100)
            prev_word_id = word_id
        all_labels.append(aligned_labels)

    tokenized["labels"] = all_labels
    return tokenized
```

The `word_ids()` method is what makes this work. It returns a list mapping each subword position back to its original word index, with `None` for special tokens. The `prev_word_id` check distinguishes the first subword of a word (gets the label) from continuations (get -100).

This is conceptually simple but operationally fragile. An off-by-one error here — say, assigning the label to the last subword instead of the first, or propagating the label to all subwords — silently corrupts the entire training run. The model will train, the loss will decrease, but the learned label semantics will be wrong. The data exploration notebook includes a cell that prints subword-to-label alignment side-by-side for manual verification. This is the single most important sanity check in the pipeline.

---

## Training: Three Epochs on a T4

### Configuration

The training uses HuggingFace's Trainer API with standard hyperparameters for BERT fine-tuning:

```python
TrainingArguments(
    learning_rate=2e-5,
    num_train_epochs=3,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=32,
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="f1",
    weight_decay=0.01,
    fp16=torch.cuda.is_available(),
)
```

Three epochs is the standard for BERT fine-tuning on NER — enough for the classification head to converge, not enough for the pretrained representations to overfit on a dataset of this size. The learning rate of 2e-5 is from the set recommended in the original BERT paper ({2e-5, 3e-5, 5e-5}) and has become the most commonly adopted default for fine-tuning. Weight decay of 0.01 provides mild regularization. FP16 is enabled conditionally — it halves memory usage and speeds up training on T4 GPUs that have tensor cores, but falls back to FP32 on CPU.

### Evaluation Metric

The metric that matters for NER is entity-level F1 with strict span matching, computed by seqeval. A prediction is correct only if both the entity boundaries and the entity type match exactly. Predicting "non-small cell lung" when the true span is "non-small cell lung cancer" is a boundary error — zero credit. Predicting "metformin" as Disease instead of Chemical is a type error — zero credit.

This is stricter than token-level accuracy, which would give partial credit for getting most of the tokens right. Token-level metrics overstate model performance on NER because the vast majority of tokens are `O` (non-entity), and getting those right is trivial.

```python
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)

    true_labels = [
        [ID2LABEL[l] for l in label if l != -100]
        for label in labels
    ]
    true_preds = [
        [ID2LABEL[p] for p, l in zip(pred, label) if l != -100]
        for pred, label in zip(predictions, labels)
    ]

    return {
        "precision": precision_score(true_labels, true_preds),
        "recall": recall_score(true_labels, true_preds),
        "f1": f1_score(true_labels, true_preds),
    }
```

The `-100` filtering is critical: it strips out continuation subwords and special tokens so that each remaining entry corresponds to one word — matching what seqeval interprets as per-token BIO labels. Without this filter, seqeval would see sequences full of subword-level tags that don't correspond to coherent entity spans.

---

## Inference: From Raw Text to Entity Spans

Training uses pre-tokenized input (`is_split_into_words=True`) because the dataset provides word-tokenized sentences. Inference on arbitrary text requires a different path: tokenize the raw string, run the forward pass, then map subword-level predictions back to character offsets in the original text.

The key is `return_offsets_mapping=True` in the tokenizer call, which returns the character span `(start, end)` for each subword token:

```python
def predict_entities(text, model, tokenizer):
    device = next(model.parameters()).device
    inputs = tokenizer(
        text,
        return_offsets_mapping=True,
        return_tensors="pt",
        truncation=True,
        max_length=512,
    )

    offset_mapping = inputs.pop("offset_mapping")[0]
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        logits = model(**inputs).logits[0]

    probs = F.softmax(logits, dim=-1)
    predictions = torch.argmax(probs, dim=-1).cpu().tolist()
    confidences = probs.max(dim=-1).values.cpu().tolist()
    offsets = offset_mapping.cpu().tolist()

    return _decode_bio_tags(predictions, confidences, offsets, text)
```

The offset mapping is popped from the inputs before the forward pass — it's metadata for post-processing, not a model input. Passing it to the model would crash because `BertForTokenClassification` doesn't expect it.

### BIO Decoding

The `_decode_bio_tags` function merges consecutive B- and I- tokens of the same type into entity spans. The logic handles five cases: special tokens (identified by a `(0, 0)` offset) are skipped, a B- tag starts a new entity (closing any current one), an I- tag of the same type extends the current entity, an I- tag of a different type closes the current entity (type mismatch), and an O tag or orphan I- tag (with no active entity) closes any current entity.

Entity confidence is the mean softmax probability across all subword tokens in the span. This is a simplification — the geometric mean or minimum confidence would be more conservative — but the arithmetic mean provides a reasonable signal for downstream filtering. A "confident" entity is one where the model was consistently sure about every token, not just the first one.

---

## Evaluation: Per-Type Metrics and Error Taxonomy

### The Numbers

The evaluation notebook runs the trained model on the full BC5CDR test set (5,865 sentences) and computes entity-level metrics via seqeval's `classification_report`. The per-type breakdown is the important view — overall F1 masks the consistent gap between Chemical and Disease performance.

Chemical entities are easier because they're shorter (mostly single tokens), have less lexical variability (there are only so many ways to spell "metformin"), and follow predictable naming conventions (generic drug names tend to share suffixes: -mab, -nib, -statin). Disease entities are harder because they're longer, more variable ("heart attack" vs "myocardial infarction" vs "acute MI"), and often include modifiers that make boundary detection ambiguous ("advanced metastatic non-small cell lung cancer" — where does the entity start?).

### Error Categorization

The evaluation module classifies every prediction error into one of four types:

1. **False negatives (missed entities)**: A true entity that the model didn't predict at all. Typically the most common error type in NER — models tend to under-predict rather than over-predict, especially for longer entity spans.

2. **False positives (hallucinated entities)**: The model predicted an entity where none exists. Less common but clinically concerning — in a PA system, hallucinating a diagnosis that isn't in the note could lead to incorrect authorization decisions.

3. **Boundary errors**: The model found the entity but got the span wrong — predicting "cell lung cancer" instead of "non-small cell lung cancer", or "chronic kidney" instead of "chronic kidney disease". These are near-misses that indicate the model has learned the concept but not the precise boundary conventions.

4. **Type errors**: The model found the entity with correct boundaries but assigned the wrong type — labeling a disease as a chemical or vice versa. These are rare in practice because the lexical overlap between drug names and disease names is small.

```python
def categorize_errors(true_tags, pred_tags, tokens):
    true_ents = get_entity_spans_from_bio(true_tags, tokens)
    pred_ents = get_entity_spans_from_bio(pred_tags, tokens)

    # Match predicted to true entities by token overlap
    # Exact match = correct, same span different type = type error,
    # overlapping but different span = boundary error, no match = FP/FN
    # ... (full implementation matches predicted to true entities via overlap)
```

The evaluation also computes three diagnostic plots: error type distribution (showing the relative frequency of each error category), entity length vs. accuracy (confirming that longer entities have lower accuracy), and prediction confidence distribution for correct vs. incorrect predictions (showing whether confidence is well-calibrated — whether the model "knows what it doesn't know").

---

## Domain Transfer: PubMed to Prior Authorization

### The Experiment

The model was trained on PubMed abstracts. PA notes are a different domain: they use brand-name drugs (Ozempic, Keytruda, Humira), clinical abbreviations (BID, TID, HbA1c), conversational narrative style ("Patient is a 58-year-old male with..."), and combine drugs with dosages in patterns that don't appear in scientific literature.

Five synthetic PA notes were written to cover different clinical scenarios:

1. **Diabetes + GLP-1 agonist**: Ozempic request with metformin background
2. **Oncology + immunotherapy**: Keytruda request for NSCLC
3. **Cardiology + PCSK9 inhibitor**: Repatha request for familial hypercholesterolemia
4. **Rheumatology + biologic**: Humira request for rheumatoid arthritis
5. **Orthopedic + imaging**: MRI authorization for osteoarthritis evaluation

Each note was manually annotated with character-level entity spans — the ground truth for evaluation. The model runs inference on each note using the raw-text pipeline (offset mapping, BIO decoding), and predictions are compared to annotations using strict span matching.

### Expected Failure Modes

The domain transfer analysis is designed to surface specific, predictable failure patterns:

**Brand-name drugs** are the most obvious gap. BioBERT was pretrained on PubMed, which uses generic names almost exclusively. "Semaglutide" appears in thousands of abstracts; "Ozempic" appears in almost none. The model recognizes the generic name but may miss the brand name, even when both appear in the same sentence ("Requesting authorization for Ozempic (semaglutide)").

**Multi-word disease names** stress-test boundary detection. "Type 2 diabetes mellitus" is four tokens — the model needs to start a B-Disease at "type" and sustain I-Disease through "mellitus" without dropping out early. "Non-small cell lung cancer" is four tokens by whitespace, but the hyphenated "non-small" may split further during WordPiece tokenization, adding subword ambiguity on top of the span length.

**Drug-dose patterns** present a segmentation challenge that is far more common in clinical notes than PubMed abstracts. "Metformin 1000mg BID" — the model should extract "metformin" as a Chemical entity and leave "1000mg BID" alone. But the dosage tokens appear immediately after the drug name with no punctuation separator, which can confuse the boundary.

**Clinical abbreviations** like "UTIs", "DAS28", and "ECOG" are domain-specific shorthand. Some (UTIs = urinary tract infections) are disease mentions that the model should catch. Others (ECOG, DAS28) are clinical scores, not entities. The model has to distinguish between these without having seen them in training.

### What This Demonstrates

The point of this analysis isn't to show that the model fails on clinical text — that's expected and unsurprising. The point is to demonstrate a precise understanding of *why* it fails and *what would fix it*.

The gap between BC5CDR performance and PA note performance is a distribution shift problem, not a model architecture problem. The same BioBERT architecture, fine-tuned on 500-1,000 annotated PA documents, would close most of this gap. This is exactly the data advantage that companies processing PA documents at scale have access to — millions of real clinical notes with entity annotations from clinician workflows. An active learning pipeline (use the current model's predictions as pre-annotations, have clinicians correct them, retrain) creates a flywheel where each iteration makes annotation faster and the model better.

---

## Key Takeaways

1. **Subword alignment is the silent killer.** Every token classification model on a subword tokenizer needs label alignment, and getting it wrong produces models that train normally but learn corrupted semantics. The `word_ids()` method and the `-100` ignore index are the safety net — but you still need to visually verify alignment on concrete examples before trusting the pipeline.

2. **Entity-level F1 is the only honest metric for NER.** Token-level accuracy inflates numbers because most tokens are `O`. Span-level strict matching is harsh — partial credit is zero credit — but it measures what actually matters: did the model extract the right entity with the right boundaries?

3. **Disease entities are harder than Chemical entities.** This is consistent across every published baseline on BC5CDR, and the reasons are structural: diseases have longer spans, more lexical variability, and more ambiguous boundaries. A 5-10 point F1 gap between Chemical and Disease is the expected range.

4. **The domain transfer gap is the real story.** A model trained on PubMed abstracts and tested on clinical text will miss brand-name drugs, struggle with clinical abbreviations, and lose boundary accuracy on conversational narrative. This isn't a failure — it's a precise, predictable consequence of distribution shift. Closing the gap requires domain-specific training data, not a different architecture.

5. **Character offset mapping is non-trivial.** Training uses word-tokenized input with `is_split_into_words=True`. Inference on raw text requires `return_offsets_mapping=True` to recover character spans. These are two different tokenization paths with different data contracts, and the inference pipeline is where most production bugs hide.

6. **The tag ID ordering will bite you.** BC5CDR's label mapping is `{0:O, 1:B-Chemical, 2:B-Disease, 3:I-Disease, 4:I-Chemical}` — not grouped by entity type. Assuming sequential ordering and building your own mapping produces a model that silently swaps Disease and Chemical predictions. Always use the dataset's mapping verbatim.

---

## Reproducing This Project

```bash
git clone <repo-url> && cd clinical-ner
pip install -r requirements.txt
```

Then run the notebooks in order on Google Colab (free T4 GPU):
1. `01_data_exploration.ipynb` — dataset stats, entity distributions, subword alignment check
2. `02_train_ner.ipynb` — fine-tune BioBERT (~15 min on T4)
3. `03_evaluation.ipynb` — test set metrics, error analysis, comparison to baselines
4. `04_demo.ipynb` — displacy visualizations, PA note inference, domain transfer analysis

The full source is ~375 lines of Python across 3 modules, plus 4 notebooks. Python 3.10+ required.
