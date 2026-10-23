# Diabetic Retinopathy Classifier: Frontend

**Live site: https://kannan14122006.github.io/diabeticretinopathy/**

A web app that grades retinal fundus photographs on the 5-level ICDR scale (0 No DR, 1 Mild, 2 Moderate, 3 Severe, 4 Proliferative DR).

The trained model **runs inside the browser** with [ONNX Runtime Web](https://onnxruntime.ai/). The whole app is static and hosted free on GitHub Pages: no server and no laptop are needed, it works on phones and other devices, and **uploaded images never leave the user's device**.

Training code, the model and the optional REST API are in the backend repo: https://github.com/kannan14122006/dr-backend.

## Pages

| Page | What it shows |
|---|---|
| **Diagnose** | Upload or drag-drop a fundus image. The page shows the predicted level, the confidence, all 5 probabilities, a severity scale, a referable / non-referable verdict, typical findings, and the input, preprocessed and Grad-CAM heatmap images. |
| **Dataset Analysis** | EyePACS class distribution (35,126 images), imbalance ratio, referable split, image stats and sample images for each level. |
| **Model Performance** | Quadratic kappa (0.726), accuracy, macro F1 and AUC, the confusion matrix, per-level precision/recall/F1, referable sensitivity and specificity, and training curves. |
| **DR Stages** | Clinical description of the 5 ICDR stages and the lesions (MA, HM, hard and soft exudates). |

## How in-browser inference works

0. **Fundus check:** images that don't look like a retinal fundus photo (screenshots, documents, spreadsheets, ordinary photos) are rejected with reasons, and a *Grade anyway* option is offered. It is tested on 3,000 held-out EyePACS images (1.1% flagged, mostly very dark or ungradable) and 38 non-fundus images (all rejected).
1. The image is decoded, the black border is cropped, and the image is area-resized to 224×224 (`js/inference.js`, which mirrors `dr-backend/app/preprocess.py`).
2. `models/dr_model.onnx` (EfficientNet-B0, 16 MB) contains the rest of the pipeline: local-average colour subtraction, the retina-disk mask, ImageNet normalisation, the classifier, and class activation maps for the heatmap.
3. The browser predictions were checked against the original PyTorch pipeline and gave the same grade on every test image (maximum probability difference < 0.02).

## Run locally

```bash
python -m http.server 5500
```

Then open http://localhost:5500. You can also double-click `run.bat`. A static server is needed because ES modules don't load from `file://`.

**Optional: use the Python backend instead of in-browser inference.** Open the site with `?api=http://localhost:8000` (this is remembered in the browser). Use `?api=local` to switch back.

## Updating the model

After retraining in `dr-backend`, run this from the `dr-backend` folder:

```bash
python -m deploy.export_onnx --out ../dr-frontend/models --data-dir ../dr-frontend/data
```

Then commit and push this repo. GitHub Pages redeploys automatically.

## Structure

```
index.html            layout and the four views
css/styles.css        styling (light and dark, responsive)
models/               dr_model.onnx + model_info.json
data/                 metrics.json + dataset_stats.json
js/inference.js       in-browser preprocessing, ONNX inference, Grad-CAM rendering
js/api.js             browser mode (default) or remote backend mode
js/config.js          ?api= backend override
js/app.js             routing, model status, DR Stages page
js/diagnose.js        upload and result rendering
js/dataset.js         dataset analysis page
js/model.js           model performance page
js/stages.js          clinical text for the 5 grades and the lesions
js/util.js            helpers
```

> Academic mini project. This is not a medical device and must not be used for clinical diagnosis.
