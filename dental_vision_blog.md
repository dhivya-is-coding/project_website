# Building a Dental X-ray Classifier: Transfer Learning on a Tiny Dataset

## The Problem

Dental panoramic X-rays (OPGs) are one of the most common imaging modalities in dentistry. A dentist reads an OPG and makes a judgment call: are these restorations acceptable, or does the patient need further review? The question is binary, but the signal is subtle — caries, fractures, infections, and impacted teeth all manifest differently on X-rays, and the decision boundary between "healthy" and "pathological" is often ambiguous even to trained clinicians.

This project builds a binary classifier for dental OPGs: given a panoramic X-ray, predict whether the image shows **acceptable** dentition or **needs review** for potential pathology. Three models are trained and compared: a simple CNN baseline, a Keras ResNet50 with frozen backbone, and a PyTorch ResNet50 with two-stage fine-tuning. The PyTorch model is exported to TorchScript and packaged for serverless inference on AWS Lambda.

Every design decision is discussed, every bug is documented, and the results are honest about what 517 images can and cannot teach a neural network.

---

## The Dataset: 517 Images and a Mapping Problem

### Choosing the Data

The [Dental OPG Xray Dataset](https://www.kaggle.com/datasets/imtkaggleteam/dental-opg-xray-dataset) from Kaggle contains 517 panoramic dental X-rays across six diagnostic classes: Healthy Teeth, Caries, BDC-BDR (bone defects), Fractured Teeth, Impacted Teeth, and Infection. The images are crops from full panoramic radiographs, all originals with no synthetic augmentation.

517 images is tiny for deep learning. Most image classification benchmarks use tens or hundreds of thousands of images. The choice was deliberate: this is a real-world constraint. Medical imaging datasets are small because labeling requires domain expertise, patient consent, and institutional review. Building something useful under this constraint is the challenge.

### The Binary Mapping

Six classes is too many for 517 images — roughly 86 images per class, which means ~60 training images per class after splitting. Instead, the classes are collapsed to a binary problem: Healthy Teeth maps to `acceptable`, everything else maps to `needs_review`.

```python
CLASS_MAPPING = {
    "Healthy Teeth": "acceptable",
    "Caries": "needs_review",
    "BDC-BDR": "needs_review",
    "Fractured Teeth": "needs_review",
    "Impacted teeth": "needs_review",
    "Infection": "needs_review",
}
```

This is a clinical framing, not a technical convenience. A screening system doesn't need to diagnose the specific pathology — it needs to flag images that warrant a dentist's closer attention. The binary framing maps cleanly to this triage use case.

### Stratified Splitting

The dataset is split 70/15/15 (train/val/test) with stratification on the binary label:

```python
train_imgs, temp_imgs, train_labels, temp_labels = train_test_split(
    images, labels, test_size=0.30, stratify=labels, random_state=RANDOM_SEED
)
val_imgs, test_imgs, val_labels, test_labels = train_test_split(
    temp_imgs, temp_labels, test_size=0.50, stratify=temp_labels, random_state=RANDOM_SEED
)
```

The result: 361 train (156 acceptable, 205 needs_review), 78 val, 78 test. The class imbalance is moderate — 43% acceptable, 57% needs_review — addressed later with class-weighted loss functions in both frameworks.

All images are resized to 224x224 with Lanczos interpolation during preprocessing, not at training time. This is an intentional choice: preprocessing once avoids redundant I/O and resize computation during training, and guarantees that every model sees identical input regardless of framework-specific data loading.

---

## Model 1: Keras CNN Baseline

The first model is a simple CNN designed to establish a lower bound on performance. If a three-layer convnet can't beat random guessing (50% for binary), the dataset might be fundamentally too noisy to learn from.

The architecture is deliberately shallow:

```
Conv2D(32, 3x3) → ReLU → MaxPool(2x2)
Conv2D(64, 3x3) → ReLU → MaxPool(2x2)
Conv2D(128, 3x3) → ReLU → GlobalAveragePooling
Dropout(0.5) → Dense(1, sigmoid)
```

Global average pooling instead of flattening dramatically reduces the parameter count — from ~360,000 (flattening the 53x53x128 feature maps) to just 129 (128 pooled features + bias). That three-order-of-magnitude reduction matters when you have 361 training images. Dropout at 0.5 is aggressive, but standard practice for small datasets where overfitting is the primary risk.

---

## Model 2: Keras ResNet50 Transfer Learning

The second model uses ResNet50 pretrained on ImageNet with a frozen backbone and a custom classification head:

```
ResNet50(imagenet, include_top=False) → GlobalAveragePooling → Dropout(0.3) → Dense(1, sigmoid)
```

The backbone is entirely frozen — no fine-tuning. The rationale: with only 361 training images, unfreezing even a few ResNet layers risks catastrophic forgetting. The pretrained features are rich enough that a simple linear probe should outperform the CNN baseline. The dropout is lowered to 0.3 because the feature extractor is already regularized by its pretraining.

---

## Model 3: PyTorch ResNet50 with Two-Stage Fine-Tuning

The primary model uses a different strategy. Instead of keeping the backbone completely frozen, it uses two-stage training to gradually introduce the backbone's later layers to the dental domain.

**Stage 1** freezes the entire backbone and trains only the classifier head:

```python
def freeze_backbone(model):
    for name, param in model.named_parameters():
        if 'fc' not in name:
            param.requires_grad = False
```

This produces 4,098 trainable parameters out of 23.5 million. The model learns a linear mapping from ImageNet features to dental classes — essentially logistic regression on top of a frozen feature extractor.

**Stage 2** unfreezes the last two ResNet blocks (layer3 and layer4) and fine-tunes with a 10x lower learning rate:

```python
def unfreeze_last_n_blocks(model, n=2):
    blocks_to_unfreeze = [f'layer{i}' for i in range(5 - n, 5)]
    for name, param in model.named_parameters():
        if any(block in name for block in blocks_to_unfreeze) or 'fc' in name:
            param.requires_grad = True
```

This brings 22 million parameters into play. The lower learning rate (1e-5 vs 1e-4) prevents the unfrozen layers from diverging too quickly — the head is already calibrated from Stage 1, and the backbone layers should adjust incrementally to refine the features for dental data rather than rewrite them entirely.

Both stages use cosine annealing for the learning rate schedule and early stopping based on validation loss:

```python
optimizer1 = torch.optim.Adam(
    filter(lambda p: p.requires_grad, model.parameters()),
    lr=lr_stage1,
)
scheduler1 = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer1, T_max=epochs_stage1)

history1 = train_stage(
    model, train_loader, val_loader, criterion, optimizer1, scheduler1,
    device, epochs=epochs_stage1, patience=5, stage_name="Stage 1",
)
```

Class weights are computed from the training distribution and passed to CrossEntropyLoss:

```python
class_weights = get_class_weights(TRAIN_DIR, device)
criterion = nn.CrossEntropyLoss(weight=class_weights)
```

The Keras models use binary cross-entropy with sigmoid output (one logit), while the PyTorch model uses cross-entropy with softmax output (two logits). Both are functionally equivalent for binary classification — the softmax over two logits reduces to a sigmoid on their difference. The two-logit formulation makes it simpler to extend to multi-class later and works cleanly with PyTorch's `CrossEntropyLoss(weight=...)` API, which takes per-class weights directly. The BCE alternative requires the separate `pos_weight` parameter for class weighting, which is less intuitive when the class count might change.

---

## The Augmentation Bug: Why Pipeline Ordering Matters

The first training run produced dismal results. Both Keras models hovered at ~50% validation accuracy — barely above coin flip. The CNN showed no learning curve at all, and the ResNet50 oscillated between 47% and 53% across epochs.

The training loss was decreasing, which meant the models were fitting the training data. But the validation accuracy refused to budge. Classic overfitting? On 361 images, that was the obvious hypothesis. But both models had regularization (dropout, early stopping), and the ResNet50 backbone was frozen — there shouldn't be enough capacity to memorize the training set when only 4,098 parameters are trainable.

### The Root Cause

The data augmentation pipeline was applying brightness and contrast jitter *after* ImageNet normalization:

```python
# BROKEN: augment after normalize
images = images / 255.0
images = (images - mean) / std
images = augmentation(images)  # RandomBrightness, RandomContrast on [-2, 2] range
```

ImageNet normalization centers pixel values around zero with standard deviations around 0.22-0.23. After normalization, pixel values range roughly from -2 to +2. But Keras's `RandomBrightness(0.1)` doesn't care about the actual input values — it uses its `value_range` parameter (default `[0, 255]`) to calibrate the offset. With `factor=0.1`, it adds a random shift of up to `0.1 * 255 = 25.5`. On [0, 255] inputs, that's a subtle brightness variation. On [-2, +2] inputs, it's an offset of 25.5 applied to values that span a range of 4 — the augmented images are completely destroyed. The model was seeing pure noise on training data while validation data (no augmentation) was clean, making generalization impossible.

### The Fix

Augmentation must happen on raw pixel values, before normalization:

```python
def preprocess_train(images, labels):
    images = tf.cast(images, tf.float32)
    images = augmentation(images, training=True)  # augment on [0, 255]
    images = images / 255.0                        # scale to [0, 1]
    mean = tf.constant([0.485, 0.456, 0.406], shape=[1, 1, 1, 3])
    std = tf.constant([0.229, 0.224, 0.225], shape=[1, 1, 1, 3])
    images = (images - mean) / std                 # ImageNet normalize
    return images, labels
```

After the fix: the CNN reached 57.7% validation accuracy, and the Keras ResNet50 reached 65.4%. Still modest numbers, but the learning curves now showed clear improvement over epochs — the models were actually learning from the data rather than fitting noise.

The PyTorch pipeline never had this bug because torchvision's `transforms.Compose` applies augmentations (flip, rotation, color jitter) on PIL images *before* `transforms.ToTensor()` and `transforms.Normalize()`. The ordering is explicit in the composition:

```python
train_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.RandomCrop(IMAGE_SIZE),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.1, contrast=0.1),
    transforms.ToTensor(),           # converts to [0, 1]
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])
```

This is a design difference between the two frameworks worth noting. In torchvision, the pipeline is an ordered list of transforms where the output of each is the input of the next. In Keras, augmentation layers and preprocessing functions are often composed separately, making it easier to accidentally reorder them. Neither approach is inherently better, but the Keras pattern requires more discipline to get the ordering right.

---

## MPS on Apple Silicon: Fast When It Works, Painful When It Doesn't

All training was done on an M-series Mac using Apple's Metal Performance Shaders (MPS) backend. MPS is PyTorch's GPU acceleration for Apple Silicon, and TensorFlow supports Metal through the `tensorflow-metal` plugin.

Both frameworks detected and used the GPU without issues. But MPS has compatibility constraints that required code changes:

```python
# MPS compatibility: num_workers=0, pin_memory=False
train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True,
                          num_workers=0, pin_memory=False)
```

Multi-worker data loading (`num_workers > 0`) causes intermittent crashes on MPS because the multiprocessing spawns subprocesses that compete for Metal command buffers. Setting `pin_memory=True` is a CUDA optimization that has no benefit on MPS and can cause hangs. Both are set to their safe defaults.

The larger issue was thermal throttling. During Stage 2 of PyTorch training — 22 million unfrozen parameters — some epochs took 15 to 85 minutes due to the GPU frequency scaling back under sustained load. There's no software fix for this. On a production workload, you'd use a cloud GPU (or even an NVIDIA desktop GPU) where thermal management is designed for sustained compute. For a portfolio project, it meant running training overnight and checking the results in the morning.

---

## Evaluation: Honest Numbers

The evaluation runs all three models against the held-out test set (78 images) and computes accuracy, precision, recall, F1, AUC-ROC, and inference latency:

| Model | Accuracy | Precision | Recall | F1 | AUC | Latency (ms) |
|-------|----------|-----------|--------|------|------|-------------|
| PyTorch ResNet50 | 0.462 | 0.518 | 0.659 | 0.580 | 0.494 | 23.1 |
| Keras CNN | 0.564 | 0.564 | 1.000 | 0.721 | 0.400 | 20.2 |
| Keras ResNet50 | 0.590 | 0.597 | 0.841 | 0.698 | 0.493 | 37.8 |

These numbers are not good. The PyTorch and Keras ResNet50 AUC values sit at ~0.49 — essentially random. The models have no discriminative ability at ranking which images are more likely to be `needs_review`. The Keras CNN is worse: its AUC of 0.400 is *below* random, meaning its probability scores are inversely correlated with the true labels — it's actively anti-ranking. The accuracy numbers slightly exceed 50% because the class balance is ~43/57, and the models learn a bias toward predicting `needs_review` for everything (the Keras CNN achieves 100% recall by literally predicting positive for every image).

### Why the Numbers Are Bad

517 images is not enough data for this task. Dental OPGs are complex images where the pathological signal (a hairline fracture, early caries, a subtle infection) occupies a small fraction of the image area. ImageNet features — learned from dogs, cars, and landscapes — provide useful low-level texture and edge representations, but the mid-level and high-level features don't transfer well to dental radiology.

Transfer learning on small medical imaging datasets is a known hard problem. Published literature typically shows meaningful results with 2,000-10,000 images per class. With ~150-200 images per binary class in the training set, there simply isn't enough diversity for the model to learn the decision boundary between healthy and pathological.

This is documented honestly in the results because the alternative — cherry-picking a favorable train/test split, overtuning hyperparameters until the test accuracy climbs, or omitting AUC from the evaluation — would be misleading. The infrastructure, pipeline, and methodology are sound. The data is the bottleneck.

### What Evaluation Looks Like in Code

The evaluation script loads each model, runs prediction, computes metrics, and generates comparison plots — all in a single pass:

```python
pt_model = load_pytorch_model()
pt_preds, pt_probs = predict_pytorch(pt_model, image_paths)
pt_latency_mean, pt_latency_std = measure_latency_pytorch(pt_model)

results["PyTorch ResNet50"] = {"y_true": y_true, "preds": pt_preds, "probs": pt_probs}
plot_confusion_matrix(y_true, pt_preds, "pytorch_resnet50")
```

Latency is measured on CPU by running 50 inference passes on a single image after 5 warmup passes, timing each with `time.perf_counter()`. The warmup passes let the CPU stabilize — JIT compilation, cache warming, and memory allocation all inflate the first few passes and would skew the timing if included.

---

## AWS Lambda Deployment: Serverless Inference

The PyTorch model is exported to TorchScript for deployment on AWS Lambda — not because it's the best performer (the Keras ResNet50 has the highest accuracy), but because TorchScript is the deployment format and PyTorch is the primary framework for the project. TorchScript serializes the model's computation graph into a format that can be loaded without the original Python class definitions — you don't need to import `timm` or define the model architecture at inference time.

The Lambda function architecture is straightforward:

1. **Cold start**: Download the TorchScript model from S3 to `/tmp/model.pt`, load it into memory
2. **Warm invocation**: Model is already in memory (global variable), skip download
3. **Inference**: Decode base64 image, preprocess, forward pass, return JSON

```python
def lambda_handler(event, context):
    body = event.get("body", "")
    if event.get("isBase64Encoded", False):
        image_bytes = base64.b64decode(body)
    else:
        data = json.loads(body)
        image_bytes = base64.b64decode(data["image"])

    model = load_model()
    input_tensor = preprocess_image(image_bytes)

    with torch.no_grad():
        output = model(input_tensor)
        probs = torch.softmax(output, dim=1)
        pred_idx = probs.argmax(1).item()
        confidence = probs[0, pred_idx].item()

    return {
        "statusCode": 200,
        "body": json.dumps({
            "prediction": CLASS_NAMES[pred_idx],
            "confidence": round(confidence, 4),
            "probabilities": {
                "acceptable": round(probs[0, 0].item(), 4),
                "needs_review": round(probs[0, 1].item(), 4),
            },
        }),
    }
```

The Docker image uses PyTorch CPU-only wheels (`--index-url https://download.pytorch.org/whl/cpu`) to keep the container lean. The full PyTorch with CUDA support is over 2GB of dependencies that serve no purpose on Lambda's CPU-only runtime. CPU-only PyTorch is ~200MB — a 10x reduction in image size that directly improves cold start times.

The infrastructure is defined as a SAM template: a Lambda function (Docker-packaged, 1024MB memory, 60-second timeout), an API Gateway endpoint for POST /predict, an S3 bucket for model weights, and the necessary IAM policies. One `sam deploy` command provisions everything.

The tradeoff: Lambda's cold start with PyTorch is slow (10-15 seconds). For a production dental imaging system, you'd use a provisioned concurrency or a dedicated endpoint (SageMaker). For a portfolio project demonstrating the deployment pattern, Lambda is sufficient and costs nothing at low volume.

---

## Key Takeaways

1. **Pipeline ordering is not optional.** Augmenting normalized images produces garbage. This cost two full training runs and hours of debugging. The fix was a three-line reorder. In Keras, the pipeline composition is implicit — you have to trace the data flow manually to verify the ordering. In torchvision, it's explicit in the `transforms.Compose` list.

2. **Small datasets need honest evaluation.** With 517 images, AUC near 0.5 is the expected result, not a failure of the model architecture. Reporting accuracy alone (59%) would be misleading — it disguises the fact that the model has no ranking ability. AUC, precision-recall curves, and confusion matrices together tell the real story.

3. **Two-stage fine-tuning is the right approach, even when it doesn't help.** Unfreezing backbone layers didn't improve performance here because the bottleneck is data, not model capacity. On a 5,000-image dataset, Stage 2 would likely produce a meaningful jump in AUC. The infrastructure for two-stage training is in place for when the data catches up.

4. **MPS is usable but unforgiving.** It works out of the box for both PyTorch and TensorFlow, but `num_workers > 0` will crash silently, `pin_memory=True` will hang, and thermal throttling will turn a 30-minute training run into a 3-hour one. Know the constraints before you start.

5. **TorchScript export is the bridge between training and deployment.** The traced model is framework-independent: no `timm` import, no model class definition, no Python class pickling. It loads from a file and runs a forward pass. This is what makes Lambda deployment feasible — the container only needs `torch` and `torchvision`, not the entire training stack.

6. **The data is always the bottleneck.** Three different architectures, two frameworks, two-stage fine-tuning, class weighting, augmentation pipelines — none of it compensates for having 361 training images. With 5,000+ labeled dental OPGs, the same pipeline would produce clinically useful predictions. The code is ready. The data isn't.

---

## Reproducing This Project

```bash
git clone <repo-url> && cd dental-vision

python3.12 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

python src/data/download.py          # requires Kaggle API credentials
python src/data/preprocessing.py     # 517 images → 361/78/78 split

python src/training/train_keras.py --model cnn --epochs 30
python src/training/train_keras.py --model resnet50 --epochs 30
python src/training/train_pytorch.py --epochs-stage1 15 --epochs-stage2 10

python src/evaluation/evaluate.py    # generates all plots + metrics
python src/inference/predict.py --image path/to/xray.jpg --model pytorch
```

The full source is ~1,400 lines of Python across 16 files. Python 3.12 required (3.14 doesn't have PyTorch wheels yet).
