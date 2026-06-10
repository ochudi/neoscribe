import type { RunInputType } from "@/lib/api/types";

export interface SampleInput {
  id: string;
  label: string;
  inputType: RunInputType;
  content: string;
}

export const SAMPLE_INPUTS: SampleInput[] = [
  {
    id: "bronchitis",
    label: "Cough & fever visit",
    inputType: "transcript",
    content: `Clinician: What brings you in today?
Patient: I've had this cough for about three days now. It's productive — I'm bringing up greenish phlegm.
Clinician: Any fever?
Patient: A mild one, comes and goes. I checked last night and it was 37.9.
Clinician: Any shortness of breath?
Patient: A little when I climb the stairs. And I've been really tired.
Clinician: Your chest has some scattered wheezes but the lungs are otherwise clear. This looks like acute bronchitis. Are you still taking your lisinopril?
Patient: Yes, 10 mg every morning.
Clinician: Good — keep that going. I'll add an inhaler, salbutamol two puffs as needed. If you're not improving in a week, come back and we'll get a chest X-ray.`,
  },
  {
    id: "diabetes-review",
    label: "Diabetes follow-up",
    inputType: "transcript",
    content: `Clinician: How have the sugars been since we increased the metformin?
Patient: Better in the mornings, mostly between 6 and 8. But I get dizzy spells in the afternoon, and my feet tingle at night.
Clinician: Any chest pain or palpitations with the dizziness?
Patient: No, it passes after a minute or two.
Clinician: Your blood pressure today is 152 over 94, which is higher than I'd like. The tingling could be early diabetic neuropathy, so I want to check that properly.
Patient: Okay.
Clinician: Plan — continue metformin 1000 mg twice daily, and I'm starting amlodipine 5 mg once daily for the blood pressure. We'll do an HbA1c, a lipid panel, and kidney function tests today, plus a monofilament foot exam. I'd like to see you again in three months, sooner if the dizziness gets worse.`,
  },
  {
    id: "abdominal-pain",
    label: "Abdominal pain (ER)",
    inputType: "transcript",
    content: `Clinician: Tell me about this pain.
Patient: It started around my belly button last night, and now it's moved down to my right side, low down. It's sharp, and it got worse on the drive here with every bump.
Clinician: Any vomiting?
Patient: Twice this morning. I haven't been able to eat anything.
Clinician: Fever?
Patient: I feel hot. They said 38.4 at the desk.
Clinician: I'm pressing here — does that hurt? And when I let go quickly?
Patient: Both. The letting go is worse.
Clinician: You have rebound tenderness in the right iliac fossa, and I'm concerned about acute appendicitis. We're going to get bloods — full blood count and CRP — plus a urine test, and an abdominal CT to confirm. Nothing to eat or drink from now on, and I'm asking the surgical team to review you today. We'll start IV fluids and give you morphine for the pain.`,
  },
  {
    id: "structured-note",
    label: "Structured clinic note",
    inputType: "structured_note",
    content: `## HPI
58-year-old man, 2 weeks of exertional chest tightness radiating to the left arm, relieved by rest within 5 minutes. No symptoms at rest. Smoker, 20 pack-years.

## PMH
Hypertension. Hyperlipidaemia.

## Medications
Amlodipine 10 mg OD. Atorvastatin 40 mg nocte.

## Examination
BP 138/86, HR 76 regular. Heart sounds normal, no murmurs. Chest clear.

## Assessment
Stable angina, high pre-test probability of coronary artery disease.

## Plan
- Start aspirin 75 mg OD and GTN spray PRN
- Resting ECG today; outpatient exercise stress test
- Fasting lipids and HbA1c
- Strong smoking-cessation advice given; referred to cessation clinic
- Review in 2 weeks or sooner if pain at rest`,
  },
];
