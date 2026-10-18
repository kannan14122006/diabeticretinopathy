// Clinical description of the 5 ICDR grades (survey section I, Fig. 1).
export const STAGES = [
  {
    grade: 0,
    name: "No DR",
    group: "Normal",
    summary: "No visible signs of diabetic retinopathy.",
    findings: ["No microaneurysms, haemorrhages or exudates"],
    action: "Routine annual screening. Keep blood glucose, HbA1c and blood pressure under control.",
    referable: false,
  },
  {
    grade: 1,
    name: "Mild NPDR",
    group: "Non-proliferative",
    summary: "The earliest stage: small bulges form in weakened capillary walls.",
    findings: ["Microaneurysms only: small red dots with sharp margins, ≤ 125 µm"],
    action: "Not referable. Re-screen in 6–12 months.",
    referable: false,
  },
  {
    grade: 2,
    name: "Moderate NPDR",
    group: "Non-proliferative",
    summary: "More than microaneurysms, but not as severe as grade 3. Vessels start leaking blood and plasma.",
    findings: [
      "Dot / blot and flame haemorrhages (> 125 µm, irregular margins)",
      "Hard exudates: yellow lipid deposits from plasma leakage",
      "Soft exudates (cotton-wool spots): white ovals from nerve-fibre swelling",
    ],
    action: "Referable DR. Refer to an ophthalmologist.",
    referable: true,
  },
  {
    grade: 3,
    name: "Severe NPDR",
    group: "Non-proliferative",
    summary: "Widespread blockage of retinal vessels starves the retina of blood (4-2-1 rule).",
    findings: [
      "> 20 intraretinal haemorrhages in each of 4 quadrants",
      "Venous beading in ≥ 2 quadrants",
      "Intraretinal microvascular abnormalities (IRMA) in ≥ 1 quadrant",
      "No neovascularisation yet",
    ],
    action: "Urgent referral. High risk of progressing to proliferative DR.",
    referable: true,
  },
  {
    grade: 4,
    name: "Proliferative DR",
    group: "Proliferative",
    summary: "Fragile new vessels grow (angiogenesis) along the vascular arcades and optic disc. This stage threatens vision.",
    findings: [
      "Neovascularisation of the disc or elsewhere",
      "Vitreous or pre-retinal haemorrhage",
      "Fibrous scarring and risk of tractional retinal detachment",
    ],
    action: "Urgent referral for treatment (laser photocoagulation, anti-VEGF injections, vitrectomy).",
    referable: true,
  },
];

export const LESIONS = [
  { name: "Microaneurysms (MA)", kind: "Red lesion", text: "Small red round dots, ≤ 125 µm, sharp margins. These are the earliest sign of DR." },
  { name: "Haemorrhages (HM)", kind: "Red lesion", text: "Larger spots, > 125 µm, irregular margins. Flame-shaped haemorrhages are superficial and blot haemorrhages are deep." },
  { name: "Hard exudates", kind: "Bright lesion", text: "Yellow spots with sharp margins, caused by plasma and lipid leakage into the outer retina." },
  { name: "Soft exudates", kind: "Bright lesion", text: "White, fluffy ovals (cotton-wool spots) caused by swelling of the nerve-fibre layer." },
];

export const gradeColor = (g) => `var(--g${g})`;
