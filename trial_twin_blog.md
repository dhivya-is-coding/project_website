# Building Digital Twins for Oncology Clinical Trials: A Technical Deep Dive

## Why Digital Twins in Clinical Trials?

Randomized controlled trials are the gold standard of evidence-based medicine, but they're expensive. A typical Phase III oncology trial enrolls 500-1,000 patients at a cost of $30,000-$50,000 per patient. The statistical bottleneck: you need a large control arm to estimate the treatment effect with sufficient precision.

If you can accurately predict what a treated patient's outcome *would have been* under the control condition — a "digital twin" — you can use that prediction as a covariate to reduce residual variance, narrow confidence intervals, and ultimately require fewer patients for the same statistical power. This is the PROCOVA (Prognostic Covariate Adjustment) methodology, which received FDA guidance acceptance in 2023.

This article walks through TrialTwin Lab, an end-to-end implementation of this methodology: from synthetic data generation through survival modeling, digital twin prediction, and statistical efficiency quantification. Every design decision is discussed, every tradeoff is made explicit, and every code snippet is from the actual working codebase.

---

## Architecture Overview

The pipeline is structured as seven sequential stages, each with a clear contract:

```
YAML Config ──> Data Ingest ──> Harmonize ──> QA Checks (8/8)
                                                    │
                Endpoint Derivation (OS, PFS, Landmark)
                                                    │
                Feature Engineering (baseline + longitudinal)
                                                    │
            ┌── Cox PH (baseline) ──> Digital Twins ──> Prognostic Score
            │   GBM (all features)                           │
            │                                      PROCOVA Efficiency Sim
            │                                                │
            └── Streamlit Dashboard ─────────────────────────┘
```

Everything is config-driven. A single YAML file defines the trial: disease area, sample size, survival parameters, covariate effects, lab distributions, visit schedule, and feature engineering parameters. Swap the config, swap the trial. The entire pipeline reproduces from scratch in under 10 seconds:

```bash
make clean && make all && make test  # 14/14 tests pass
```

---

## Step 1: Synthetic Data Generation — Getting the Correlations Right

### The Problem with Naive Synthetic Data

Most synthetic data generators sample each variable independently. The result: a dataset where ECOG performance status has no relationship with tumor burden, lab values are uncorrelated with disease severity, and survival times bear no relationship to patient characteristics. Models trained on such data learn nothing meaningful, and any downstream analysis is an exercise in fitting noise.

Real oncology data has deep correlation structures. Sicker patients (higher ECOG scores) tend to have larger tumor burdens, elevated LDH, lower albumin, and lower hemoglobin — and they die sooner. If your synthetic generator doesn't capture this, your survival model will have no discriminative ability, your digital twins will be random noise, and your efficiency simulation will show no gain.

### The Sickness Factor Approach

The generator in `trialtwin/ingest/synthetic.py` introduces a latent "sickness factor" that induces realistic correlations across all baseline measurements:

```python
# Baseline tumor burden (log-normal, correlated with ECOG)
log_tumor = self.rng.normal(
    tumor_cfg["mean"] + 0.2 * ecog,  # sicker patients have larger tumors
    tumor_cfg["std"],
    size=n,
)

# Sickness factor derived from ECOG and tumor burden
sickness_factor = 0.3 * ecog + 0.1 * (log_tumor - tumor_cfg["mean"])

# Labs are shifted by sickness factor
for lab_name, lab_cfg in cfg.get("baseline_labs").items():
    if lab_name in ("hemoglobin", "albumin", "lymphocytes"):
        adjusted_mean = mean - sickness_factor * std * 0.5  # protective labs decrease
    elif lab_name in ("ldh", "neutrophils"):
        adjusted_mean = mean + sickness_factor * std * 0.5  # risk markers increase
```

This is a deliberate tradeoff. A more sophisticated approach would use a multivariate Gaussian copula to jointly sample all baseline covariates from a specified correlation matrix. The sickness factor approach is simpler and more interpretable: it encodes the clinical intuition that "sicker patients are sicker across the board" without requiring you to specify a 10x10 correlation matrix. The cost is that we can't independently control the correlation between, say, hemoglobin and albumin — they're both driven by the same latent factor. For a project demonstrating the digital twin methodology, this tradeoff is acceptable. For a production system, you'd want the copula.

### Weibull Survival with Covariate Effects

The survival times are generated from a Weibull model with covariate-dependent hazard. The Weibull was chosen over the exponential because its shape parameter allows modeling increasing hazard rates (shape > 1), which is realistic for advanced NSCLC where patients deteriorate over time.

The linear predictor accumulates contributions from each covariate:

```python
lp = np.zeros(n)
lp += cov_effects["age"] * (subjects["age"].values - 62) / 10
lp += cov_effects["ecog"] * subjects["ecog"].values
lp += cov_effects["log_tumor"] * (self._log_tumor - 3.5)
lp += cov_effects["log_ldh"] * (np.log(subjects["ldh"].values) - np.log(250))
lp += cov_effects["albumin"] * (subjects["albumin"].values - 3.8)
lp += cov_effects["hemoglobin"] * (subjects["hemoglobin"].values - 12.5)

# Treatment effect as hazard ratio
is_treated = (subjects["treatment_arm"] == "treatment").values
lp[is_treated] += np.log(treatment_hr)  # HR=0.73 → log(0.73) ≈ -0.31
```

Each covariate is centered at its population mean so the linear predictor is approximately zero for an "average" patient, and the baseline scale parameter corresponds to the configured median survival. The treatment hazard ratio of 0.73 means treated patients have 27% lower hazard at every timepoint — a clinically plausible effect size for immunotherapy vs. chemotherapy in second-line NSCLC.

The Weibull parameterization converts the linear predictor into individual scale parameters:

```python
baseline_scale = median_months * 30.44 / (np.log(2) ** (1 / shape))
individual_scale = baseline_scale * np.exp(-lp / shape)
u = self.rng.uniform(0, 1, size=n)
os_times = individual_scale * (-np.log(u)) ** (1 / shape)
```

This is the inverse CDF method: sample a uniform(0,1), invert the Weibull CDF to get a survival time. The `np.exp(-lp / shape)` term ensures that higher linear predictor (higher hazard) produces shorter survival times.

### Longitudinal Tumor Dynamics

The generator creates realistic tumor trajectories that differ by treatment arm:

- **Control arm**: monotonic exponential growth at 1.5% per day
- **Treatment arm**: initial shrinkage (1% per day), with 40% of patients eventually regrowing after a mean of 120 days

```python
if is_treated:
    if day < regrowth_day:
        tumor = baseline_tumor * np.exp(shrink_rate * day)
    else:
        nadir = baseline_tumor * np.exp(shrink_rate * regrowth_day)
        tumor = nadir * np.exp(growth_rate * 0.8 * (day - regrowth_day))
else:
    tumor = baseline_tumor * np.exp(growth_rate * day)
```

This creates the characteristic immunotherapy response pattern: rapid initial shrinkage followed by durable response in ~60% of patients and eventual progression in ~40%. This is critical because the PFS endpoint is derived from these trajectories using a RECIST-simplified progression criterion (20% increase from nadir).

### Why Not Real Data?

The project also includes a real data adapter for the GBSG2 breast cancer dataset (686 patients from scikit-survival), but the synthetic generator is the primary data source. The reasons:

1. **Control over ground truth**: With synthetic data, we know the true treatment effect (HR = 0.73) and can verify whether the pipeline recovers it.
2. **Complete feature set**: GBSG2 has no longitudinal data, no tumor measurements, and no lab trajectories. The digital twin methodology's value is demonstrated best with rich longitudinal features.
3. **Reproducibility**: `seed=42` guarantees identical results across runs. Real data requires data access agreements and can't be distributed.

The tradeoff is that results on synthetic data don't prove the methodology works on real data. That's acceptable for a demonstration project — the value is in the methodology implementation, not the specific numbers.

---

## Step 2: Harmonization and Quality Assurance

### The Three-Table Schema

All data sources — synthetic, GBSG2, or hypothetical future sources — are harmonized into a three-table schema:

```python
@dataclass
class HarmonizedDataset:
    subjects: pd.DataFrame       # One row per patient (demographics, baseline labs)
    longitudinal: pd.DataFrame   # Multiple rows per patient (visits, tumors, labs)
    endpoints: pd.DataFrame      # One row per patient (os_time, os_event, pfs_time, pfs_event)
```

This is a design decision with a specific tradeoff. The alternative is a single wide table (one row per patient, all features flattened). The three-table design was chosen because:

1. **Longitudinal data has variable cardinality** — patients have different numbers of visits, and a wide table would require padding or ragged arrays.
2. **Separation of concerns** — endpoint derivation reads from `subjects` + `endpoints` + `longitudinal`; feature engineering reads from `subjects` + `longitudinal`; modeling reads the derived feature matrix. Each stage touches only the tables it needs.
3. **Extensibility** — adding a new data source means implementing `DataSource.load() -> dict[str, DataFrame]` and mapping to this schema. The `Harmonizer` validates that required columns exist.

The cost is that some operations (e.g., "get hemoglobin at baseline for subject X") require a join. In practice, this is never a bottleneck for 300-patient datasets.

### Eight Automated QA Checks

Before any modeling happens, 8 validation checks run against the harmonized data:

```python
ALL_CHECKS = [
    NoNegativeSurvivalTimes(),     # OS/PFS times >= 0
    NoPostDeathMeasurements(),      # No longitudinal data after death
    PlausibleLabRanges(),           # Hemoglobin 3-20, albumin 1-6, etc.
    MonotonicVisitTimes(),          # Visit days strictly increasing per subject
    NoFutureDataLeakage(),          # Informational: data extends beyond landmark
    ConsistentCensoring(),          # Censored patients don't have time=0
    CompleteDemographics(),         # subject_id, treatment_arm, age non-null
    BalancedRandomization(),        # Arms within 65/35 split
]
```

These checks are not theoretical. During development, `PlausibleLabRanges` caught that the synthetic generator was producing hemoglobin values up to 20.93 g/dL (the upper plausible limit is 20). The fix required tightening the lab clipping from `nrange[1] * 3` to `nrange[1] * 1.15` for baseline and `nrange[1]` for longitudinal values. Without the QA check, these implausible values would have been silently carried into the feature matrix.

The `NoFutureDataLeakage` check is intentionally informational (always passes). It documents that longitudinal data extends beyond the landmark day, and that leakage prevention is enforced downstream in the feature engineering code, not at the data level. This is a deliberate separation: the raw data should contain all available information, and temporal filtering should happen at the feature extraction stage where the landmark day is explicitly parameterized.

---

## Step 3: Endpoint Derivation

### Overall Survival

OS derivation is straightforward: extract `os_time` and `os_event` from the endpoints table, merge with `treatment_arm` from subjects. The merge is critical because downstream code filters on `treatment_arm` in the feature matrix, which receives treatment_arm from `os_data`.

### Progression-Free Survival

PFS is the first composite endpoint derived from tumor data. The implementation follows RECIST-simplified criteria:

```python
nadir = tumors[0, 1]  # baseline tumor size
progression_day = None

for day, size in tumors[1:]:
    nadir = min(nadir, size)
    if nadir > 0 and size >= nadir * 1.20:  # 20% increase from nadir
        progression_day = day
        break
```

PFS event = first of (progression, death). PFS time = min(progression_day, os_time). If neither occurs, the patient is censored at the last tumor assessment.

The key design decision: PFS is *always* less than or equal to OS. This is enforced by the definition (`pfs_time = min(progression_day, os_time)`) and validated by a test (`test_pfs_leq_os`). This is a clinical data invariant that must hold — a patient cannot progress after they die.

### Landmark Survival

The binary landmark endpoint (alive at 12 months: yes/no) is derived for completeness but isn't used in the digital twin pipeline. It's included because binary endpoints are common in oncology trial reporting and give an intuitive summary statistic: "31% of patients survived past one year."

---

## Step 4: Feature Engineering — The Leakage Trap

### Baseline Features

Baseline features are extracted from the subjects table at a single timepoint (randomization). These include demographics (age, sex, ECOG), tumor burden (log-transformed), and lab values with clinically meaningful derived features:

```python
features["anemia_flag"] = (subjects["hemoglobin"] < 10).astype(int)
features["hypoalbuminemia_flag"] = (subjects["albumin"] < 3.5).astype(int)
features["nlr"] = subjects["neutrophils"] / subjects["lymphocytes"].clip(lower=0.1)
```

The log transforms on LDH, tumor burden, and neutrophils are applied because these variables have log-normal distributions in real patient populations. Without the transform, a few patients with very high LDH (say, 1500 U/L) would dominate the Cox model's linear predictor.

The neutrophil-to-lymphocyte ratio (NLR) is a well-known prognostic marker in oncology. It's included as a derived feature rather than leaving it to the model because (a) the ratio has stronger prognostic value than either component alone, and (b) Cox PH models don't automatically learn interactions without explicit feature engineering.

### Longitudinal Features

Longitudinal features capture the patient's early trajectory using only data within the first 60 days (the "landmark day"):

```python
early = longitudinal[longitudinal["days_since_randomization"] <= landmark_day].copy()
```

This temporal filter is the single most important line of code in the feature engineering module. Without it, features would incorporate tumor measurements from 6 or 12 months post-randomization — which is the very outcome we're trying to predict. This is classic future data leakage and would produce artificially inflated C-indices that don't generalize.

The 60-day landmark was chosen because it's late enough to capture early treatment response patterns (most immunotherapy responses are visible by 8 weeks) but early enough that the features are available for prospective prediction. In a real trial, you'd validate this choice by testing sensitivity to different landmark days.

The extracted features include:

- **Tumor slope**: linear regression of tumor size over time within the 60-day window
- **Tumor percent change**: relative change from baseline to last measurement
- **Best response**: minimum tumor size relative to baseline (always negative or zero for responders)
- **Lab trajectories**: mean value and change-from-baseline within 60 days for hemoglobin, albumin, LDH, and neutrophils

### The Builder: Tracking Baseline vs. Longitudinal

The `FeatureBuilder` does something subtle that's critical for the digital twin methodology: it tracks which columns are baseline features and which are longitudinal.

```python
class FeatureBuilder:
    def __init__(self, config: TrialConfig):
        self.config = config
        self.baseline_cols: list[str] = []

    def build(self, harmonized, os_data):
        baseline = extract_baseline_features(harmonized.subjects)
        self.baseline_cols = [c for c in baseline.columns if c != "subject_id"]
        # ... merge longitudinal, impute, return
```

This metadata is consumed downstream in `run_pipeline.py`:

```python
baseline_cols = builder.baseline_cols
X_control_baseline = features.loc[control_mask, baseline_cols]  # For Cox/digital twins
X_control_all = features[control_mask].drop(columns=["subject_id", "treatment_arm"])  # For GBM
```

Why the split? This leads directly to the most important design decision in the project.

---

## Step 5: The Baseline-Only Prognostic Model — The Hardest Bug to Find

### The Failure

When the pipeline first ran end-to-end, the Cox model was trained on *all* features (baseline + longitudinal) for control-arm patients. It fit successfully with a C-index of 0.69 — respectable. But when this model generated digital twins for treated patients, the results were nonsensical:

```
Mean predicted control median: 14 days
Mean individual treatment effect: 315 days
```

Fourteen days. The true median OS for control-arm patients was ~200 days. The model was predicting that treated patients, if they had been on the control arm, would have died in two weeks.

### The Root Cause

Investigating the feature distributions revealed the problem:

```
tumor_pct_change — CONTROL: mean=+1.23 (tumors grew 123%)
tumor_pct_change — TREATED: mean=-0.39 (tumors shrank 39%)
```

The Cox model learned a coefficient of -2.32 for `tumor_pct_change`: a one-unit decrease in percent change corresponds to a 10x increase in hazard. This makes sense *within the control arm* — a control patient whose tumor grew less is healthier. But when you apply this model to a treated patient whose tumor *shrank* by 39%, the model extrapolates wildly: it interprets the shrinkage as an impossibly extreme health signal and predicts the patient would die almost immediately under control conditions.

The risk scores confirmed this: control-arm patients had mean risk of 1.77, while treated patients had mean risk of 72.3 — a 40x difference, entirely driven by out-of-distribution longitudinal features.

### The Fix

The solution is conceptually simple but has deep methodological implications: **the digital twin model must use only baseline (pre-treatment) features**.

Longitudinal features like tumor slope, percent change, and best response are *post-randomization* measurements. They're causally downstream of the treatment assignment. Using them to predict counterfactual control outcomes for treated patients is asking: "If this patient had been on control, what would their control survival have been, given that their tumor shrank on treatment?" The question is incoherent — the tumor shrinkage is *because* of the treatment.

This is how digital twin models are built: baseline prognostic models only. The prognostic score must be a function of pre-treatment characteristics to be a valid covariate in the PROCOVA analysis. If post-randomization data leaks in, the prognostic score is confounded with treatment effect and the efficiency gain is spurious.

The pipeline now trains two separate models:

```python
# Prognostic model (baseline only) — used for digital twins and efficiency
cox = CoxPHModel(penalizer=0.1)
cox.fit(X_control_baseline, os_control["os_time"], os_control["os_event"])

# GBM model (uses all features — tree models handle collinearity)
gbm = GBMSurvivalModel()
gbm.fit(X_control_all, os_control["os_time"], os_control["os_event"])
```

The Cox model on baseline features achieves a C-index of 0.615 — lower than the 0.69 with all features, but this is the *correct* number. The GBM with all features (C-index 0.901) is retained for model comparison purposes, but it's never used for digital twin generation.

### The Second Convergence Problem

Even with baseline-only features, a subtler issue remained. The `best_response` longitudinal feature had near-zero variance within the control arm (all control tumors grow, so best_response ≈ 0 for everyone). When this feature leaked into the Cox fitting data through the full feature matrix, lifelines threw a convergence error:

```
ConvergenceError: Convergence halted due to matrix inversion problems.
Column(s) ['best_response'] have very low variance.
```

The Cox wrapper was enhanced with automatic low-variance detection:

```python
class CoxPHModel:
    VARIANCE_THRESHOLD = 1e-3

    def fit(self, X, duration, event):
        variances = X.var()
        self._dropped_cols = list(variances[variances < self.VARIANCE_THRESHOLD].index)
        self._feature_cols = [c for c in X.columns if c not in self._dropped_cols]
        df = X[self._feature_cols].copy()
        # ... fit
```

The dropped columns are tracked so that prediction methods automatically select the same subset. This is defensive coding: even though the pipeline now sends only baseline features to the Cox model (which don't include `best_response`), the guard protects against future regressions if someone adds a new near-constant baseline feature.

---

## Step 6: Digital Twin Generation

The `DigitalTwinGenerator` takes a fitted control-arm model and applies it to treated patients to produce counterfactual predictions:

```python
class DigitalTwinGenerator:
    def generate_twins(self, X, subject_ids):
        risk_scores = self.model.predict_risk_score(X)
        sf = self.model.predict_survival_function(X)

        # Median survival: time when S(t) crosses 0.5
        medians = []
        for col in sf.columns:
            curve = sf[col]
            below_half = curve[curve <= 0.5]
            if not below_half.empty:
                medians.append(below_half.index[0])
            else:
                medians.append(curve.index[-1])  # censored: use last timepoint
```

The individual treatment effect is then:

```python
treatment_effect = observed_os_time - predicted_median_survival
```

A positive treatment effect means the patient survived longer than their digital twin predicted under control. The pipeline produces a mean treatment effect of +89 days — treated patients lived, on average, three months longer than their predicted control outcome.

### What the Prognostic Score Actually Is

The prognostic score is the Cox model's linear predictor: `X @ beta`. It's a single scalar that summarizes a patient's predicted control-arm risk from their baseline characteristics. Higher values mean worse predicted prognosis.

This is the critical output of the digital twin system. Not the predicted survival curve, not the individual treatment effect — the *prognostic score*. Because the prognostic score is what gets used as a covariate in the efficiency analysis.

---

## Step 7: PROCOVA Efficiency Analysis — The Payoff

The PROCOVA methodology is elegant in its simplicity. It runs two Cox regressions on the full trial data:

```python
# Standard analysis: treatment only
cph_standard.fit(df[["os_time", "os_event", "treatment"]], ...)

# Adjusted analysis: treatment + prognostic_score
cph_adjusted.fit(df[["os_time", "os_event", "treatment", "prognostic_score"]], ...)
```

Both models estimate the treatment effect (hazard ratio). The difference is precision. By including the prognostic score as a covariate, the adjusted model explains away some of the residual variance in survival times — patients with similar prognostic scores have more similar outcomes, so the treatment effect estimate has a tighter confidence interval.

The results:

| Analysis | HR | 95% CI | CI Width |
|----------|-----|--------|----------|
| Standard (treatment only) | 0.771 | 0.603–0.987 | 0.384 |
| Adjusted (+ prognostic score) | 0.703 | 0.548–0.902 | 0.354 |

The CI width shrinks by 7.8%. This may sound modest, but the relationship between CI width and sample size is quadratic: a 7.8% narrower CI means you could achieve the same precision with roughly 15% fewer patients. For a 600-patient Phase III trial, that's 90 fewer enrollments — saving millions of dollars and months of recruitment time.

The adjusted HR (0.703) is also more extreme than the standard HR (0.771). This isn't a coincidence: by adjusting for baseline prognosis, the model controls for imbalances in prognostic factors between arms (which random chance doesn't eliminate with n=300), revealing the "true" treatment effect more clearly.

---

## Step 8: Model API Design — Wrapping Two Very Different Libraries

### The lifelines Problem

lifelines' `CoxPHFitter` has an unusual API: `fit()` takes a single DataFrame containing features, duration, AND event columns. Prediction methods take a DataFrame containing features only. This asymmetry is a common source of bugs.

The `CoxPHModel` wrapper provides a clean sklearn-like interface:

```python
cox.fit(X, duration, event)        # Internally: concat into single df, fit
cox.predict_risk_score(X)          # Internally: select _feature_cols, predict
cox.predict_survival_function(X)   # Same column selection
```

### The scikit-survival Problem

scikit-survival's `GradientBoostingSurvivalAnalysis` requires a structured numpy array for the target: `dtype=[('event', bool), ('time', float)]`. This is converted from pandas Series internally:

```python
def _make_survival_target(event, time):
    return np.array(
        list(zip(event.astype(bool), time.astype(float))),
        dtype=[("event", bool), ("time", float)],
    )
```

### Duck Typing for Evaluation

Both model wrappers expose `predict_risk_score(X) -> pd.Series`, which allows the evaluation module to work with either model via duck typing:

```python
def evaluate_model(model, X, os_data):
    risk_scores = model.predict_risk_score(X)  # works for both Cox and GBM
    c_index = concordance_index(os_data["os_time"], -risk_scores, os_data["os_event"])
    return {"c_index": c_index}
```

Note the negation of risk scores. `concordance_index` expects that higher values = longer survival, but both models output higher values = higher risk = shorter survival. This is a subtle sign convention issue that's easy to get wrong and produces a C-index below 0.5 if you do.

---

## Step 9: Interactive Dashboard

The Streamlit dashboard has two views:

**Patient Explorer**: Select a treated patient and see their individual digital twin analysis — predicted control-arm survival curve, observed outcome overlaid, individual treatment effect, and top-5 feature contributions to the risk score. The feature contributions are computed as `coefficient × feature_value`, showing which baseline characteristics most drive this patient's predicted prognosis.

**Trial Dashboard**: Aggregate results — KM curves by arm with confidence bands (plotly), efficiency comparison bar chart, distribution of individual treatment effects, and the full QA report embedded inline.

The artifacts are loaded from the pipeline's pickle output, so the dashboard is fully decoupled from the training pipeline. `make train` once, `make app` as many times as you want.

---

## Testing Strategy

The test suite has 14 tests across three modules, all using session-scoped fixtures that generate synthetic data once and share it across tests:

```python
@pytest.fixture(scope="session")
def harmonized(nsclc_config, raw_data):
    harmonizer = Harmonizer(nsclc_config)
    return harmonizer.harmonize(raw_data)
```

The tests validate *data contracts*, not implementation details:

- **Endpoint tests** (6): No negative times, events are binary, treatment_arm is present, PFS <= OS, landmark survival is plausible
- **Feature tests** (5): No NaN after imputation, one row per subject, required columns present, numeric-only after dropping metadata, baseline_cols tracked
- **QA tests** (3): All 8 checks pass, exactly 8 checks registered, each check returns a well-formed result

The tests don't assert specific numeric values (like "C-index should be 0.615") because that would make the tests fragile to parameter changes. Instead, they validate structural invariants that must hold regardless of the configuration.

---

## Key Takeaways

1. **Correlation structure in synthetic data matters more than sample size.** A 300-patient dataset with realistic covariate correlations produces a more informative C-index of 0.615 than a 10,000-patient dataset with independent features would.

2. **The baseline-only constraint is not a limitation — it's the methodology.** Using post-randomization features for counterfactual prediction is methodologically invalid. The lower C-index (0.615 vs 0.901) is the correct price for causal validity.

3. **QA checks should run before modeling, not after.** The lab range violation was caught before any model saw the data. If it had propagated into features, debugging the resulting model performance degradation would have been much harder.

4. **Config-driven pipelines are worth the upfront investment.** The entire trial definition lives in 96 lines of YAML. Switching from NSCLC to breast cancer (GBSG2) requires zero code changes — just `make data --config configs/trial_gbsg2.yaml`.

5. **The efficiency gain (7.8% CI width reduction) is the metric that matters.** Not the C-index, not the predicted medians, not the individual treatment effects. Those are intermediate outputs. The CI width reduction is the direct measure of how many fewer patients you'd need in your trial.

---

## Reproducing This Project

```bash
git clone <repo-url> && cd trialtwin-lab
python -m venv .venv && source .venv/bin/activate
make install       # pip install -r requirements.txt && pip install -e .
make all           # data → train → report (~8 seconds)
make test          # 14/14 tests pass
make app           # launches Streamlit dashboard on localhost:8501
```

The full source is ~2,100 lines of Python across 41 files. Python 3.10+ required.
