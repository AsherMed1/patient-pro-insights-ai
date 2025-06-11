
-- Insert the UFE Screening Survey template
INSERT INTO form_templates (
  form_type,
  title,
  description,
  total_steps,
  form_data
) VALUES (
  'ufe_screening',
  'UFE Screening Survey',
  'Interactive survey to qualify women for Uterine Fibroid Embolization (UFE) treatment',
  20,
  '{
    "slides": [
      {
        "id": 1,
        "type": "welcome",
        "title": "UFE Assessment",
        "description": "Let''s find out if Uterine Fibroid Embolization (UFE) is the right solution for you. This short screening is private, personalized, and could be your next step toward relief.",
        "image_placeholder": "Smiling woman with hand on stomach",
        "cta": "Start My Assessment",
        "progress": "Step 1 of 20"
      },
      {
        "id": 2,
        "type": "question",
        "title": "How long do your periods typically last?",
        "field_name": "period_duration",
        "field_type": "radio",
        "required": true,
        "options": [
          {"value": "3_5_days", "label": "3–5 days", "tags": []},
          {"value": "6_7_days", "label": "6–7 days", "tags": ["Long_Bleeding"]},
          {"value": "8_plus_days", "label": "8 days or more", "tags": ["Long_Bleeding"]}
        ],
        "conditional_follow_up": {
          "condition": "value_in",
          "values": ["6_7_days", "8_plus_days"],
          "question": {
            "title": "Do you often feel like your period drags on or disrupts your routine?",
            "field_name": "period_disruption",
            "field_type": "radio",
            "options": [
              {"value": "yes", "label": "Yes", "tags": ["Period_Disruption"]},
              {"value": "no", "label": "No", "tags": []}
            ]
          }
        }
      },
      {
        "id": 3,
        "type": "question",
        "title": "How heavy are your periods?",
        "field_name": "period_flow",
        "field_type": "radio",
        "required": true,
        "options": [
          {"value": "light", "label": "Light", "tags": []},
          {"value": "moderate", "label": "Moderate (change every few hours)", "tags": []},
          {"value": "heavy", "label": "Heavy (change every hour)", "tags": ["Heavy_Bleeding"]},
          {"value": "very_heavy", "label": "Very heavy (double protection or accidents)", "tags": ["Heavy_Bleeding"]}
        ]
      },
      {
        "id": 4,
        "type": "educator",
        "title": "Did You Know?",
        "description": "Heavy periods can be a sign of uterine fibroids. They can lead to fatigue, anemia, and even missed work or events.",
        "image_placeholder": "Pad with red petals"
      },
      {
        "id": 5,
        "type": "question",
        "title": "How often do you experience pelvic pain or cramping, even when not on your period?",
        "field_name": "pelvic_pain",
        "field_type": "radio",
        "required": true,
        "options": [
          {"value": "never", "label": "Never", "tags": []},
          {"value": "occasionally", "label": "Occasionally", "tags": ["Pelvic_Pain"]},
          {"value": "frequently", "label": "Frequently", "tags": ["Pelvic_Pain"]},
          {"value": "constantly", "label": "Constantly", "tags": ["Pelvic_Pain"]}
        ]
      },
      {
        "id": 6,
        "type": "question",
        "title": "Do you feel pressure or fullness in your abdomen?",
        "field_name": "abdominal_pressure",
        "field_type": "radio",
        "required": true,
        "options": [
          {"value": "never", "label": "Never", "tags": []},
          {"value": "occasionally", "label": "Occasionally", "tags": ["Pelvic_Pressure"]},
          {"value": "frequently", "label": "Frequently", "tags": ["Pelvic_Pressure"]},
          {"value": "constantly", "label": "Constantly", "tags": ["Pelvic_Pressure"]}
        ]
      },
      {
        "id": 7,
        "type": "question",
        "title": "Bowel and Bladder Symptoms",
        "description": "Please answer both questions about your symptoms",
        "field_name": "bowel_symptoms",
        "field_type": "radio",
        "required": true,
        "options": [
          {"value": "never", "label": "Never", "tags": []},
          {"value": "occasionally", "label": "Occasionally", "tags": ["Bowel_Symptoms"]},
          {"value": "frequently", "label": "Frequently", "tags": ["Bowel_Symptoms"]},
          {"value": "constantly", "label": "Constantly", "tags": ["Bowel_Symptoms"]}
        ],
        "fields": [
          {
            "field_name": "urinary_symptoms",
            "label": "Have you had any of the following urinary symptoms?",
            "field_type": "checkbox",
            "options": [
              {"value": "frequent_urination", "label": "Frequent urination", "tags": ["Urinary_Symptoms"]},
              {"value": "difficulty_emptying", "label": "Difficulty fully emptying bladder", "tags": ["Urinary_Symptoms"]},
              {"value": "urgency", "label": "Urgency", "tags": ["Urinary_Symptoms"]},
              {"value": "no_symptoms", "label": "No urinary symptoms", "tags": []}
            ]
          }
        ]
      },
      {
        "id": 8,
        "type": "educator",
        "title": "Did You Know?",
        "description": "Fibroids can press on organs like your bladder or intestines—causing bloating, constipation, or urgency.",
        "image_placeholder": "Toilet paper + cactus / organ pressure graphic"
      },
      {
        "id": 9,
        "type": "question",
        "title": "How often do these symptoms (pain, bleeding, pressure) interfere with your daily life or work?",
        "field_name": "life_interference",
        "field_type": "radio",
        "required": true,
        "options": [
          {"value": "never", "label": "Never", "tags": []},
          {"value": "occasionally", "label": "Occasionally", "tags": ["Life_Disruption"]},
          {"value": "frequently", "label": "Frequently", "tags": ["Life_Disruption"]},
          {"value": "constantly", "label": "Constantly", "tags": ["Life_Disruption"]}
        ],
        "conditional_follow_up": {
          "condition": "value_in",
          "values": ["frequently", "constantly"],
          "question": {
            "title": "Where do you feel the biggest impact?",
            "field_name": "impact_areas",
            "field_type": "checkbox",
            "options": [
              {"value": "motherhood", "label": "Being a mom", "tags": ["Motherhood_Impact"]},
              {"value": "work", "label": "Work performance", "tags": ["Work_Impact"]},
              {"value": "social", "label": "Social life", "tags": ["Social_Impact"]},
              {"value": "intimacy", "label": "Intimacy or relationship", "tags": ["Relationship_Impact"]},
              {"value": "sleep", "label": "Sleep", "tags": ["Sleep_Impact"]},
              {"value": "other", "label": "Other", "tags": ["Other_Impact"]}
            ]
          }
        }
      },
      {
        "id": 10,
        "type": "question",
        "title": "Do you experience pain during intercourse?",
        "field_name": "intercourse_pain",
        "field_type": "radio",
        "required": true,
        "options": [
          {"value": "never", "label": "Never", "tags": []},
          {"value": "occasionally", "label": "Occasionally", "tags": ["Dyspareunia"]},
          {"value": "frequently", "label": "Frequently", "tags": ["Dyspareunia"]},
          {"value": "constantly", "label": "Constantly", "tags": ["Dyspareunia"]}
        ]
      },
      {
        "id": 11,
        "type": "educator",
        "title": "Did You Know?",
        "description": "Fibroids pressing on sensitive areas can cause pain during intimacy—affecting both physical and emotional closeness.",
        "image_placeholder": "Couple embracing or smiling"
      },
      {
        "id": 12,
        "type": "question",
        "title": "Do you feel tired or run down during or after your period?",
        "field_name": "period_fatigue",
        "field_type": "radio",
        "required": true,
        "options": [
          {"value": "never", "label": "Never", "tags": []},
          {"value": "occasionally", "label": "Occasionally", "tags": ["Fatigue_Symptom"]},
          {"value": "frequently", "label": "Frequently", "tags": ["Fatigue_Symptom"]},
          {"value": "constantly", "label": "Constantly", "tags": ["Fatigue_Symptom"]}
        ]
      },
      {
        "id": 13,
        "type": "question",
        "title": "What have you tried to manage your symptoms?",
        "field_name": "treatments_tried",
        "field_type": "checkbox",
        "required": true,
        "options": [
          {"value": "pain_relievers", "label": "Pain relievers (ibuprofen)", "tags": ["Tried_Conservative_Tx"]},
          {"value": "birth_control", "label": "Hormonal birth control", "tags": ["Tried_Conservative_Tx"]},
          {"value": "heating_pads", "label": "Heating pads", "tags": ["Tried_Conservative_Tx"]},
          {"value": "diet_exercise", "label": "Diet or exercise changes", "tags": ["Tried_Conservative_Tx"]},
          {"value": "other", "label": "Other", "tags": ["Tried_Conservative_Tx"]}
        ],
        "conditional_follow_up": {
          "condition": "includes_any",
          "values": ["pain_relievers", "birth_control"],
          "question": {
            "title": "Have those helped?",
            "field_name": "treatment_effectiveness",
            "field_type": "radio",
            "options": [
              {"value": "temporarily", "label": "Only temporarily", "tags": ["Failed_Conservative_Tx"]},
              {"value": "not_at_all", "label": "Not at all", "tags": ["Failed_Conservative_Tx"]},
              {"value": "still_using", "label": "Still using them", "tags": []},
              {"value": "havent_tried_enough", "label": "Haven''t tried enough yet", "tags": []}
            ]
          }
        }
      },
      {
        "id": 14,
        "type": "educator",
        "title": "Did You Know?",
        "description": "If other treatments haven''t worked, UFE may be your next step. It''s non-surgical and typically has a shorter recovery time.",
        "image_placeholder": "Happy woman outdoors, arms up"
      },
      {
        "id": 15,
        "type": "question",
        "title": "What would relief from these symptoms allow you to do again or enjoy more?",
        "field_name": "emotional_motivators",
        "field_type": "checkbox",
        "required": true,
        "options": [
          {"value": "work_focus", "label": "Focus better at work", "tags": ["Motivator_Work"]},
          {"value": "active_with_kids", "label": "Be more active with my kids", "tags": ["Motivator_Motherhood"]},
          {"value": "enjoy_intimacy", "label": "Enjoy intimacy again", "tags": ["Motivator_Intimacy"]},
          {"value": "travel_plan", "label": "Travel or plan events confidently", "tags": ["Motivator_Social"]},
          {"value": "sleep_better", "label": "Sleep without interruption", "tags": ["Motivator_Sleep"]},
          {"value": "other", "label": "Other", "tags": ["Motivator_Other"]}
        ]
      },
      {
        "id": 16,
        "type": "educator",
        "title": "Meet the Team Behind UFE",
        "description": "Our interventional radiologists specialize in helping women like you avoid surgery and feel like themselves again.",
        "image_placeholder": "Smiling doctor or care team photo"
      },
      {
        "id": 17,
        "type": "question",
        "title": "Please select your insurance provider",
        "field_name": "insurance_provider",
        "field_type": "select",
        "required": true,
        "options": [
          {"value": "aetna", "label": "AETNA", "tags": ["Insurance_Type"]},
          {"value": "anthem", "label": "Anthem", "tags": ["Insurance_Type"]},
          {"value": "bcbs", "label": "BCBS", "tags": ["Insurance_Type"]},
          {"value": "cigna", "label": "Cigna", "tags": ["Insurance_Type"]},
          {"value": "humana", "label": "Humana", "tags": ["Insurance_Type"]},
          {"value": "medicare", "label": "Medicare Advantage", "tags": ["Insurance_Type"]},
          {"value": "other", "label": "Other", "tags": ["Insurance_Type"]}
        ]
      },
      {
        "id": 18,
        "type": "lead_capture",
        "title": "Contact Information",
        "description": "Please provide your contact information to receive your personalized assessment.",
        "image_placeholder": "Contact form illustration",
        "fields": [
          {"field_name": "first_name", "label": "First Name", "field_type": "text", "required": true},
          {"field_name": "last_name", "label": "Last Name", "field_type": "text", "required": true},
          {"field_name": "phone", "label": "Phone Number", "field_type": "tel", "required": true},
          {"field_name": "email", "label": "Email Address", "field_type": "email", "required": true},
          {"field_name": "date_of_birth", "label": "Date of Birth", "field_type": "date", "required": true},
          {"field_name": "zip_code", "label": "Zip Code", "field_type": "text", "required": true}
        ],
        "cta_options": [
          {"value": "submit", "label": "Get My Personalized Assessment"}
        ]
      },
      {
        "id": 19,
        "type": "ai_summary",
        "title": "Your Assessment Summary",
        "description": "Based on your responses, our care team will review your assessment and provide personalized recommendations for UFE treatment options."
      },
      {
        "id": 20,
        "type": "lead_capture",
        "title": "Unlock Your Personalized Assessment",
        "description": "Submit your email to take the next step toward relief from fibroid symptoms.",
        "fields": [
          {"field_name": "final_email", "label": "Email Address", "field_type": "email", "required": true}
        ],
        "cta_options": [
          {"value": "unlock", "label": "Get My Results"}
        ]
      }
    ]
  }'::jsonb
);
