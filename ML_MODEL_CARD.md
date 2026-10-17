# LiftLab ML and Advisor model card

## Intended use

A browser-based educational data-science workflow for liquid-rate prediction and interpretable artificial-lift screening. It is not a field-control system, validated optimizer or learned classifier of the best lift method.

## What learns and what does not

- **Supervised ML:** a separate ridge regression for gas lift, ESP and rod pumping learns coefficients from labelled CSV observations.
- **Physics model:** the existing simplified equations remain deterministic.
- **Advisor bot:** a deterministic rule engine and keyword-routed conversational interface explains model limits and user-reported infrastructure constraints. It is not an LLM, fault-diagnosis model or generative AI service.

No API key or backend is required. Computation happens locally in the tab. The app does not transmit uploaded file contents or persist them across reloads. The hosting provider can still receive normal page requests.

## Data contract

One record per observation. Required: `well_id`, `method`, `reservoir_mpa`, `depth_m`, `density`, `whp_mpa`, `pi`, `friction`, `liquid_rate`.

Method-specific predictors:

- gas: `injection`
- esp: `frequency`, `stages`
- rod: `diameter`, `stroke`, `spm`, `fillage`

Use consistent SI units documented in the interface. `liquid_rate` is m³/day on a consistent measurement basis. The teaching model assumes formation volume factor 1; measured surface and downhole volumes require appropriate reconciliation before comparison. The friction coefficient is an engineered input in MPa/(m³/day)². Do not estimate it using a held-out target rate and then feed it back as a predictor: that would leak the target.

Use the same anonymized well_id for all observations from a well. Disguising one well under multiple identifiers defeats group separation. Random grouped holdout evaluates new wells, not future operation at an existing well. For time forecasting, use chronological validation outside this prototype.

The parser supports quoted CSV fields, escaped quotes, LF/CRLF and UTF-8 BOM. It rejects invalid required values and removes identical within-well observations. Irrelevant blank equipment columns are permitted. Limits: 2 MB, 5,000 records. Missing values are rejected, not imputed. Supported input ranges reflect the educational simulator's domain, not manufacturer limits. Unknown or user-declared measured provenance is displayed without independent verification.

## Algorithm

For each method, the app requires at least 30 accepted records and 5 wells, with at least 20 training records and 5 test records after splitting. This is a software minimum, not a guarantee of statistical adequacy.

1. Sort unique well IDs and shuffle deterministically with seed 42.
2. Assign approximately 20% of wells to a held-out test set.
3. Compute feature means and population standard deviations on training rows only. Constant features use scale 1.
4. Fit ridge regression minimizing `sum((y - intercept - X_standardized * beta)^2) + alpha * sum(beta^2)`, with fixed alpha 1 and an unpenalized intercept.
5. Solve the small normal-equation system using Gaussian elimination with partial pivoting. Positive regularization stabilizes redundant feature directions. This custom educational solver is not a replacement for a production numerical library.
6. Clip negative predicted rates to zero. Metrics evaluate this same deployed prediction rule. Raw negative predictions are disclosed for scenario estimates.

Alpha is fixed, not chosen using the test set. Avoid repeatedly tuning the data/model to this fixed test result. External validation remains necessary. No model is refit on test labels after evaluation.

## Metrics and interpretability

Report held-out MAE, RMSE, R² and RMSE of a constant training-mean baseline. R² can be negative and is undefined for constant test targets. Warn when the model does not beat the baseline. Show actual/predicted and residual plots, exploratory statistics, Pearson correlations and standardized coefficients.

A coefficient describes an association per one training standard deviation, holding other predictors fixed. It is not causal feature importance. Correlated predictors can make coefficient interpretations unstable. Out-of-training-range inputs trigger an extrapolation warning, but being within every individual range does not guarantee joint-distribution coverage. No confidence intervals or calibrated uncertainty estimates are implemented.

## Synthetic demonstration

A deterministic generator (seed 73) creates 120 synthetic wells with two observations for each of three methods: 720 rows total. Labels use the existing teaching model with multiplicative uniform noise from −6% to +6%. All synthetic IDs begin `SYNTH-`. Zero model rates remain zero. No real field observations are included.

Synthetic evaluation measures approximation of those same teaching equations under the generator's distribution. It cannot establish physical realism, field accuracy, superiority of a lift method or fault-detection performance. The displayed provenance remains synthetic when demo mode is used.

## Advisory rules

The advisor can identify:

- Reported lack of injection gas, ESP electrical supply, or rod-pump surface prime mover.
- Zero modeled flow, generic ESP runout, rod displacement above modeled supply.
- A target-rate gap or a target above the linear IPR zero-pressure rate bound.
- Gas injection above the best sampled point in an illustrative sweep, without calling it a field optimum.
- User-reported free gas or solids requiring further review.
- Missing fluid, completion, trajectory, equipment and economic information.

Unknown inputs do not become assumed absences. Findings contain a reason and a next investigation step. They never automatically change the simulator or select field setpoints. The bot always evaluates the selected method; it explains this even if the question mentions another method.

## Validation performed

Automated JavaScript tests cover CSV parsing, missing labels, duplicate removal, group separation, training-only scaling, an analytical ridge solution, constant data, extrapolation, negative output, data sufficiency, synthetic provenance, infrastructure constraints, runout/supply rules and bot limitations. Existing Python physics tests remain in CI.

These are software verification checks, not field validation. Further work should use reviewed measured datasets, externally validated equipment curves, uncertainty estimation, time-based backtesting and cost/reliability data before any operational recommendation.

## References

- https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.Ridge.html
- https://scikit-learn.org/stable/common_pitfalls.html
- https://scikit-learn.org/stable/modules/cross_validation.html
- https://www.slb.com/resource-library/oilfield-review/defining-series/defining-artificial-lift
- https://www.slb.com/resource-library/oilfield-review/defining-series/defining-esp
- https://www.slb.com/resource-library/oilfield-review/defining-series/defining-rod-pumps

These sources inform the concepts. scikit-learn is not a runtime dependency, and SLB does not validate the app's numerical coefficients or recommendations.
