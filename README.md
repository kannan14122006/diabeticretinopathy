# Diabetic Retinopathy Classifier: Frontend

A web UI for the DR grading backend: https://github.com/kannan14122006/dr-backend. It uses plain HTML, CSS and JavaScript (ES modules) and Chart.js, so there is no build step and Node.js is not required.

## Pages

| Page | What it shows |
|---|---|
| **Diagnose** | Upload or drag-drop a fundus image. The page shows the predicted level (0 No DR, 1 Mild, 2 Moderate, 3 Severe, 4 Proliferative), the confidence, all 5 probabilities, a severity scale, a referable / non-referable verdict, typical findings, and the input, preprocessed and Grad-CAM images. |
| **Dataset Analysis** | Class distribution, imbalance ratio, referable split, image resolution and brightness stats, and sample images for each level. |
| **Model Performance** | Quadratic kappa, accuracy, macro F1 and AUC, the confusion matrix, per-level precision/recall/F1, referable sensitivity and specificity, and training curves. |
| **DR Stages** | Clinical description of the 5 ICDR stages and the lesions (MA, HM, hard and soft exudates). |

## Run

1. Start the backend first (see the `dr-backend` README). It runs on `http://localhost:8000`.
2. Serve this folder with any static server:

   ```bash
   python -m http.server 5500
   ```

3. Open http://localhost:5500.

> You can't open `index.html` by double-clicking it, because ES modules need to be served over `http://`.

To point the UI at a different backend, edit `API_URL` in [js/config.js](js/config.js).

## Structure

```
index.html          layout and the four views
css/styles.css      styling (light and dark, responsive)
js/config.js        backend URL
js/api.js           fetch wrapper for the REST API
js/app.js           hash routing, API status, DR Stages page
js/diagnose.js      upload, prediction and result rendering
js/dataset.js       dataset analysis page
js/model.js         model performance page
js/stages.js        clinical text for the 5 grades and the lesions
js/util.js          helpers (escaping, formatting, charts)
```
