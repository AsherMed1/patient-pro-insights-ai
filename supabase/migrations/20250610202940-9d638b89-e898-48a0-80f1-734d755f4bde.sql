
-- Insert the PFE Screening Survey template
INSERT INTO form_templates (
  form_type,
  title,
  description,
  total_steps,
  form_data
) VALUES (
  'pfe_screening',
  'PFE Screening Survey',
  'Smart screening survey for Plantar Fascia Embolization (PFE) designed for direct-to-patient lead generation',
  15,
  '{
    "slides": [
      {
        "id": 1,
        "type": "welcome",
        "title": "Let''s find out if PFE is the right option for your heel pain.",
        "description": "Complete this quick assessment to see if Plantar Fascia Embolization could help reduce your heel pain without surgery.",
        "image_placeholder": "Person with heel pain or foot exam",
        "cta": "Start My Assessment",
        "progress": "Step 1 of 15"
      },
      {
        "id": 2,
        "type": "question",
        "title": "How long have you been experiencing heel pain from plantar fasciitis?",
        "field_name": "pain_duration",
        "field_type": "radio",
        "required": true,
        "options": [
          {
            "value": "less_than_1_month",
            "label": "Less than 1 month"
          },
          {
            "value": "1_to_3_months",
            "label": "1–3 months"
          },
          {
            "value": "3_to_6_months",
            "label": "3–6 months",
            "tags": ["Chronic_Pain"]
          },
          {
            "value": "more_than_6_months",
            "label": "More than 6 months",
            "tags": ["Chronic_Pain"]
          }
        ]
      },
      {
        "id": 3,
        "type": "educator",
        "title": "Are You a Candidate?",
        "description": "Have you been living with the daily pain of plantar fasciitis but want to avoid surgery? PFE might be a great option to reduce pain and restore activity.",
        "image_placeholder": "Person massaging foot in discomfort"
      },
      {
        "id": 4,
        "type": "question",
        "title": "How often does heel pain stop you from exercising or being active?",
        "field_name": "activity_limitation",
        "field_type": "radio",
        "required": true,
        "options": [
          {
            "value": "never",
            "label": "Never"
          },
          {
            "value": "rarely",
            "label": "Rarely"
          },
          {
            "value": "sometimes",
            "label": "Sometimes"
          },
          {
            "value": "often",
            "label": "Often",
            "tags": ["Activity_Limited"]
          },
          {
            "value": "always",
            "label": "Always",
            "tags": ["Activity_Limited"]
          }
        ]
      },
      {
        "id": 5,
        "type": "educator",
        "title": "Did You Know?",
        "description": "PFE targets tiny blood vessels causing inflammation in your heel. Most patients experience relief without surgery or long recovery times.",
        "image_placeholder": "Anatomy of heel with inflammation marked"
      },
      {
        "id": 6,
        "type": "question",
        "title": "Have you had any imaging or tests for your plantar fasciitis?",
        "field_name": "imaging_tests",
        "field_type": "radio",
        "required": true,
        "options": [
          {
            "value": "xray",
            "label": "Yes – X-ray",
            "tags": ["Has_Imaging"]
          },
          {
            "value": "mri",
            "label": "Yes – MRI",
            "tags": ["Has_Imaging"]
          },
          {
            "value": "ultrasound",
            "label": "Yes – Ultrasound",
            "tags": ["Has_Imaging"]
          },
          {
            "value": "no",
            "label": "No",
            "tags": ["Needs_Imaging"]
          }
        ],
        "conditional_follow_up": {
          "condition": "value_in",
          "values": ["xray", "mri", "ultrasound"],
          "question": {
            "title": "Do you have access to those images or results?",
            "field_name": "imaging_access",
            "field_type": "radio",
            "options": [
              {
                "value": "have_them",
                "label": "Yes – I have them"
              },
              {
                "value": "with_doctor",
                "label": "No – they''re with another doctor"
              },
              {
                "value": "not_sure",
                "label": "Not sure"
              }
            ]
          }
        }
      },
      {
        "id": 7,
        "type": "educator",
        "title": "Did You Know?",
        "description": "Diagnostic imaging can confirm the extent of inflammation. PFE works by reducing blood flow to the inflamed area to provide long-term relief.",
        "image_placeholder": "Medical imaging or heel anatomy diagram"
      },
      {
        "id": 8,
        "type": "question",
        "title": "Do you feel sharp pain in the bottom of your heel when you first get out of bed or after sitting?",
        "field_name": "morning_pain",
        "field_type": "radio",
        "required": true,
        "options": [
          {
            "value": "yes",
            "label": "Yes",
            "tags": ["Classic_PF_Symptoms"]
          },
          {
            "value": "no",
            "label": "No"
          }
        ],
        "conditional_follow_up": {
          "condition": "equals",
          "value": "yes",
          "question": {
            "title": "Does the pain improve with rest or avoiding pressure on your foot?",
            "field_name": "rest_improvement",
            "field_type": "radio",
            "options": [
              {
                "value": "yes",
                "label": "Yes",
                "tags": ["Rest_Response"]
              },
              {
                "value": "no",
                "label": "No"
              }
            ]
          }
        }
      },
      {
        "id": 9,
        "type": "question",
        "title": "What treatments have you tried?",
        "description": "Select all that apply",
        "field_name": "treatment_history",
        "field_type": "checkbox",
        "required": true,
        "options": [
          {
            "value": "orthotics",
            "label": "Orthotics"
          },
          {
            "value": "ice_therapy",
            "label": "Ice therapy"
          },
          {
            "value": "otc_pain_meds",
            "label": "OTC pain meds"
          },
          {
            "value": "cortisone_injections",
            "label": "Cortisone injections"
          },
          {
            "value": "physical_therapy",
            "label": "Physical therapy"
          },
          {
            "value": "night_splints",
            "label": "Night splints"
          },
          {
            "value": "other",
            "label": "Other"
          }
        ]
      },
      {
        "id": 10,
        "type": "question",
        "title": "Has plantar fasciitis kept you from standing or walking for long periods?",
        "field_name": "mobility_limitation",
        "field_type": "radio",
        "required": true,
        "options": [
          {
            "value": "never",
            "label": "Never"
          },
          {
            "value": "rarely",
            "label": "Rarely"
          },
          {
            "value": "sometimes",
            "label": "Sometimes"
          },
          {
            "value": "often",
            "label": "Often",
            "tags": ["Mobility_Limited"]
          },
          {
            "value": "always",
            "label": "Always",
            "tags": ["Mobility_Limited"]
          }
        ]
      },
      {
        "id": 11,
        "type": "question",
        "title": "What''s the most frustrating part of your heel pain?",
        "description": "Select all that apply",
        "field_name": "main_motivator",
        "field_type": "checkbox",
        "required": true,
        "options": [
          {
            "value": "waking_up_pain",
            "label": "Waking up in pain",
            "tags": ["Main_Motivator_Morning_Pain"]
          },
          {
            "value": "missing_activities",
            "label": "Missing out on activities",
            "tags": ["Main_Motivator_Activity_Loss"]
          },
          {
            "value": "work_exercise_impact",
            "label": "Can''t work or exercise normally",
            "tags": ["Main_Motivator_Function_Loss"]
          },
          {
            "value": "embarrassment_anxiety",
            "label": "Embarrassment / anxiety",
            "tags": ["Main_Motivator_Emotional"]
          },
          {
            "value": "temporary_fixes",
            "label": "Ongoing frustration with temporary fixes",
            "tags": ["Main_Motivator_Treatment_Failure"]
          },
          {
            "value": "other",
            "label": "Other"
          }
        ],
        "conditional_follow_up": {
          "condition": "includes_any",
          "values": ["waking_up_pain", "missing_activities", "work_exercise_impact", "embarrassment_anxiety", "temporary_fixes", "other"],
          "question": {
            "title": "Tell us more about how this affects your daily life.",
            "field_name": "motivator_detail",
            "field_type": "textarea",
            "options": []
          }
        }
      },
      {
        "id": 12,
        "type": "educator",
        "title": "Did You Know?",
        "description": "Unlike surgery, PFE lets most people return to normal activity quickly. No stitches, no cutting—just a small pinhole and a powerful impact.",
        "image_placeholder": "Person walking pain-free or returning to daily life"
      },
      {
        "id": 13,
        "type": "educator",
        "title": "Meet the Team That Specializes in PFE",
        "description": "Our board-certified interventional radiologists use image-guided procedures to reduce chronic foot pain and improve mobility—without surgery.",
        "image_placeholder": "Headshot of interventional radiologist(s)",
        "doctors": [
          {
            "name": "Dr. Sarah Johnson",
            "specialty": "Interventional Radiologist",
            "image": null
          },
          {
            "name": "Dr. Michael Chen",
            "specialty": "Interventional Radiologist",
            "image": null
          }
        ]
      },
      {
        "id": 14,
        "type": "ai_summary",
        "title": "Your Assessment Results",
        "description": "Based on your responses, our care team will review your assessment and provide personalized recommendations for your treatment options."
      },
      {
        "id": 15,
        "type": "lead_capture",
        "title": "Get Your Personalized Treatment Plan",
        "description": "Complete your information below and we''ll connect you with our care team to discuss your PFE options.",
        "image_placeholder": "Happy patient with care coordinator",
        "fields": [
          {
            "field_name": "first_name",
            "label": "First Name",
            "field_type": "text",
            "required": true
          },
          {
            "field_name": "last_name",
            "label": "Last Name",
            "field_type": "text",
            "required": true
          },
          {
            "field_name": "phone",
            "label": "Phone Number",
            "field_type": "tel",
            "required": true
          },
          {
            "field_name": "email",
            "label": "Email Address",
            "field_type": "email",
            "required": true
          },
          {
            "field_name": "zip_code",
            "label": "Zip Code",
            "field_type": "text",
            "required": true
          },
          {
            "field_name": "insurance_provider",
            "label": "Insurance Provider",
            "field_type": "select",
            "required": true,
            "options": [
              {
                "value": "aetna",
                "label": "Aetna"
              },
              {
                "value": "anthem",
                "label": "Anthem Blue Cross Blue Shield"
              },
              {
                "value": "bcbs",
                "label": "Blue Cross Blue Shield"
              },
              {
                "value": "cigna",
                "label": "Cigna"
              },
              {
                "value": "humana",
                "label": "Humana"
              },
              {
                "value": "medicare",
                "label": "Medicare"
              },
              {
                "value": "medicare_advantage",
                "label": "Medicare Advantage"
              },
              {
                "value": "medicaid",
                "label": "Medicaid"
              },
              {
                "value": "united",
                "label": "UnitedHealthcare"
              },
              {
                "value": "other",
                "label": "Other"
              }
            ]
          }
        ],
        "cta_options": [
          {
            "value": "schedule_consultation",
            "label": "Schedule My Consultation"
          },
          {
            "value": "email_results",
            "label": "Send My Results by Email"
          }
        ]
      }
    ]
  }'::jsonb
);
