/**
 * Aset kantor virtual. Model dibuat di Meshy dengan lisensi CC BY 4.0,
 * menggunakan gambar referensi CC0 dari komunitas Meshy. File `.meshy`
 * diterjemahkan ke GLB memakai meshy2glb (MIT).
 */
export interface OfficeModelAsset {
  key: string;
  file: string;
  taskId: string;
  role: string;
  prompt: string;
  creator: string;
  sourceUrl: string;
  referenceTaskId: string;
  referenceLicense: "cc0";
  modelLicense: "cc-by-4.0";
}

export const OFFICE_MODELS: OfficeModelAsset[] = [
  {
    key: "worker-01",
    file: "/models/office/worker-01.glb",
    taskId: "01a217b0-ca5d-7683-ac85-eea03f26222a",
    role: "Founder / CEO",
    prompt: "Confident founder in business suit, generic stylized office character, full body, neutral A-pose",
    creator: "rayquaza.666",
    sourceUrl: "https://www.meshy.ai/discover/executive-man",
    referenceTaskId: "01a03e0d-6189-7f64-854e-127fcbf26aa8",
    referenceLicense: "cc0",
    modelLicense: "cc-by-4.0",
  },
  {
    key: "worker-02",
    file: "/models/office/worker-02.glb",
    taskId: "01a217bb-45bf-74ab-9155-3e8b31fe457b",
    role: "CTO",
    prompt: "Thoughtful technology director in smart casual shirt, generic stylized office character, full body, neutral A-pose",
    creator: "celularbcx",
    sourceUrl: "https://www.meshy.ai/discover/01a19cae-312c-73ef-8b16-ae637b2cdb21",
    referenceTaskId: "01a19cac-db5a-758d-b407-83b31d67f7bc",
    referenceLicense: "cc0",
    modelLicense: "cc-by-4.0",
  },
  {
    key: "worker-03",
    file: "/models/office/worker-03.glb",
    taskId: "01a217bb-f55f-7602-9bdb-96d1d26fa36e",
    role: "COO",
    prompt: "Organized operations manager holding a tablet, generic stylized office character, full body, neutral A-pose",
    creator: "truculences",
    sourceUrl: "https://www.meshy.ai/discover/019c9a5d-8f4d-754f-b026-ed4030f37380",
    referenceTaskId: "019c9a32-b1b1-705d-90fa-2974812b562f",
    referenceLicense: "cc0",
    modelLicense: "cc-by-4.0",
  },
  {
    key: "worker-04",
    file: "/models/office/worker-04.glb",
    taskId: "01a217bc-23bf-746a-b0c3-ffca3d25fd3f",
    role: "Lead Full-Stack Developer",
    prompt: "Friendly senior software developer with laptop bag, generic stylized office character, full body, neutral A-pose",
    creator: "serdykee",
    sourceUrl: "https://www.meshy.ai/discover/019e9e35-d823-72f1-bfd3-391233fc5896",
    referenceTaskId: "019e9e33-ee6e-77c2-94d8-5b5a65406594",
    referenceLicense: "cc0",
    modelLicense: "cc-by-4.0",
  },
  {
    key: "worker-05",
    file: "/models/office/worker-05.glb",
    taskId: "01a217bb-6cee-7763-8d1b-3391c9eb0099",
    role: "UI/UX Designer",
    prompt: "Creative product designer with sketchbook, generic stylized office character, full body, neutral A-pose",
    creator: "lm2103200016",
    sourceUrl: "https://www.meshy.ai/discover/019e97d8-56f8-72eb-8ad2-229e85e8a0b7",
    referenceTaskId: "019e97ca-446d-7459-a978-e89832ef0ae1",
    referenceLicense: "cc0",
    modelLicense: "cc-by-4.0",
  },
  {
    key: "worker-06",
    file: "/models/office/worker-06.glb",
    taskId: "01a217bc-66fe-770c-8b1d-680f02506dd3",
    role: "AI Engineer",
    prompt: "Curious AI engineer in casual hoodie, generic stylized office character, full body, neutral A-pose",
    creator: "playstore",
    sourceUrl: "https://www.meshy.ai/discover/Executive-Balance",
    referenceTaskId: "01a00f82-634e-7312-9901-f5e61b539d14",
    referenceLicense: "cc0",
    modelLicense: "cc-by-4.0",
  },
  {
    key: "worker-07",
    file: "/models/office/worker-07.glb",
    taskId: "01a217bc-a87c-76b6-a6e1-68a8d547bbba",
    role: "Data Analyst",
    prompt: "Analytical data specialist with tablet, generic stylized office character, full body, neutral A-pose",
    creator: "sujithsujith313",
    sourceUrl: "https://www.meshy.ai/discover/male-interviewer",
    referenceTaskId: "70e7353b-53fb-4f91-8c94-3f41bde76d2f",
    referenceLicense: "cc0",
    modelLicense: "cc-by-4.0",
  },
  {
    key: "worker-08",
    file: "/models/office/worker-08.glb",
    taskId: "01a217bc-d6d9-7125-b147-eccddc71a473",
    role: "QA & Security Engineer",
    prompt: "Detail-oriented QA and security engineer, generic stylized office character, full body, neutral A-pose",
    creator: "Emmett Cross",
    sourceUrl: "https://www.meshy.ai/discover/019f6e50-a37a-7033-9b9c-707a06cf8eb1",
    referenceTaskId: "019f6e12-1e0b-7129-8a45-5c964d5b91da",
    referenceLicense: "cc0",
    modelLicense: "cc-by-4.0",
  },
];

export function modelForIndex(index: number): OfficeModelAsset {
  return OFFICE_MODELS[index % OFFICE_MODELS.length];
}
