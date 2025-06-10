
-- Create form templates table to store predefined form structures
CREATE TABLE public.form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_type TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  total_steps INTEGER NOT NULL DEFAULT 1,
  form_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project forms table to link projects with their active forms
CREATE TABLE public.project_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  form_template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  public_url_slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, form_template_id)
);

-- Create form submissions table to store user responses
CREATE TABLE public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_form_id UUID NOT NULL REFERENCES public.project_forms(id) ON DELETE CASCADE,
  submission_data JSONB NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  ai_summary TEXT,
  contact_info JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add form selection fields to projects table
ALTER TABLE public.projects 
ADD COLUMN selected_form_types TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Insert the GAE form template
INSERT INTO public.form_templates (form_type, title, description, total_steps, form_data) VALUES (
  'gae_knee_assessment',
  'GAE Knee Pain Assessment',
  'Let''s see if this non-surgical knee pain solution could help you.',
  15,
  '{
    "slides": [
      {
        "id": 1,
        "type": "welcome",
        "title": "Let''s see if this non-surgical knee pain solution could help you.",
        "description": "Reviewed by care team, often covered by insurance.",
        "image_placeholder": "smiling older couple walking",
        "cta": "Start My Assessment",
        "progress": "Step 1 of 15"
      },
      {
        "id": 2,
        "type": "question",
        "title": "How long have you had knee pain?",
        "field_name": "pain_duration",
        "field_type": "radio",
        "required": true,
        "options": [
          {"value": "less_than_1_month", "label": "Less than 1 month", "tags": ["Too_Early"]},
          {"value": "1_to_6_months", "label": "1–6 months"},
          {"value": "6_to_12_months", "label": "6–12 months", "tags": ["Chronic_Pain"]},
          {"value": "over_1_year", "label": "Over 1 year", "tags": ["Chronic_Pain"]}
        ],
        "conditional_follow_up": {
          "condition": "value_in",
          "values": ["6_to_12_months", "over_1_year"],
          "question": {
            "title": "Has your pain been getting worse, staying the same, or improving?",
            "field_name": "pain_progression",
            "field_type": "radio",
            "options": [
              {"value": "getting_worse", "label": "Getting worse", "tags": ["Progressive_Pain"]},
              {"value": "no_change", "label": "No change"},
              {"value": "slight_improvement", "label": "Slight improvement"}
            ]
          }
        }
      },
      {
        "id": 3,
        "type": "educator",
        "title": "What Is GAE?",
        "description": "GAE is a minimally invasive procedure that reduces inflammation by blocking tiny arteries causing pain.",
        "image_placeholder": "diagram of knee with inflamed blood vessels"
      },
      {
        "id": 4,
        "type": "question",
        "title": "Have you been diagnosed with osteoarthritis?",
        "field_name": "oa_diagnosis",
        "field_type": "radio",
        "required": true,
        "options": [
          {"value": "yes", "label": "Yes", "tags": ["OA_Confirmed"]},
          {"value": "no", "label": "No", "tags": ["Needs_Diagnosis"]},
          {"value": "not_sure", "label": "Not sure", "tags": ["Needs_Diagnosis"]}
        ],
        "conditional_follow_up": {
          "condition": "equals",
          "value": "yes",
          "question": {
            "title": "Was this confirmed through imaging or just symptoms?",
            "field_name": "oa_confirmation_method",
            "field_type": "radio",
            "options": [
              {"value": "imaging", "label": "Imaging"},
              {"value": "symptoms", "label": "Symptoms", "tags": ["Unconfirmed_OA"]},
              {"value": "not_sure", "label": "Not sure", "tags": ["Unconfirmed_OA"]}
            ]
          }
        }
      },
      {
        "id": 5,
        "type": "educator",
        "title": "How GAE Helps OA",
        "description": "Osteoarthritis limits blood flow. GAE improves circulation to reduce pain.",
        "image_placeholder": "side-by-side image of normal vs inflamed knee"
      },
      {
        "id": 6,
        "type": "question",
        "title": "What treatments have you tried?",
        "field_name": "treatments_tried",
        "field_type": "checkbox",
        "required": true,
        "options": [
          {"value": "pt", "label": "PT"},
          {"value": "injections", "label": "Injections"},
          {"value": "pain_meds", "label": "Pain meds"},
          {"value": "surgery_recommendation", "label": "Surgery recommendation"},
          {"value": "none_yet", "label": "None yet", "tags": ["FirstLine_Patient"]}
        ],
        "conditional_follow_up": {
          "condition": "includes_any",
          "values": ["pt", "injections"],
          "question": {
            "title": "Did those treatments provide relief?",
            "field_name": "treatment_effectiveness",
            "field_type": "radio",
            "options": [
              {"value": "yes_but_returned", "label": "Yes, but pain returned"},
              {"value": "no_relief", "label": "No relief", "tags": ["Failed_Conservative_Tx"]},
              {"value": "still_doing", "label": "Still doing them"}
            ]
          }
        }
      },
      {
        "id": 7,
        "type": "question",
        "title": "What is your knee pain keeping you from doing?",
        "field_name": "pain_impact",
        "field_type": "checkbox",
        "required": true,
        "image_placeholder": "older man playing with kids",
        "options": [
          {"value": "playing_with_grandkids", "label": "Playing with grandkids"},
          {"value": "traveling", "label": "Traveling"},
          {"value": "exercising", "label": "Exercising"},
          {"value": "working", "label": "Working"},
          {"value": "sleeping", "label": "Sleeping"},
          {"value": "attending_social_events", "label": "Attending social events"},
          {"value": "other", "label": "Other"}
        ],
        "conditional_follow_ups": {
          "playing_with_grandkids": {
            "questions": [
              {"field_name": "grandkids_age", "title": "How old are your grandchildren?", "field_type": "text"},
              {"field_name": "desired_activities", "title": "What activities would you like to do with them?", "field_type": "textarea"}
            ]
          },
          "traveling": {
            "questions": [
              {"field_name": "travel_destination", "title": "Where would you like to go?", "field_type": "text"}
            ]
          },
          "working": {
            "questions": [
              {"field_name": "job_type", "title": "What type of work do you do?", "field_type": "text"},
              {"field_name": "work_impact", "title": "How has the pain impacted your work?", "field_type": "textarea"}
            ]
          },
          "exercising": {
            "questions": [
              {"field_name": "exercise_activity", "title": "What type of exercise would you like to do?", "field_type": "text"}
            ]
          }
        }
      },
      {
        "id": 8,
        "type": "educator",
        "title": "Life Impact",
        "description": "It''s about more than knees—it''s about living your life again.",
        "image_placeholder": "couple hiking or traveling"
      },
      {
        "id": 9,
        "type": "question",
        "title": "Have you had a knee X-ray, MRI, or CT?",
        "field_name": "imaging_history",
        "field_type": "radio",
        "required": true,
        "options": [
          {"value": "yes", "label": "Yes", "tags": ["Has_Imaging"]},
          {"value": "no", "label": "No", "tags": ["Needs_Imaging"]}
        ],
        "conditional_follow_up": {
          "condition": "equals",
          "value": "yes",
          "question": {
            "title": "Do you have access to your images or reports?",
            "field_name": "imaging_access",
            "field_type": "radio",
            "options": [
              {"value": "yes_have_them", "label": "Yes – I have them"},
              {"value": "with_another_doctor", "label": "No – with another doctor"},
              {"value": "not_sure", "label": "Not sure"}
            ]
          }
        }
      },
      {
        "id": 10,
        "type": "educator",
        "title": "Why Imaging Matters",
        "description": "Imaging helps confirm if GAE is right for you. We can help if you haven''t had one.",
        "image_placeholder": "medical imaging scan or radiologist reviewing X-ray"
      },
      {
        "id": 11,
        "type": "question",
        "title": "How would you rate your pain 1–10?",
        "field_name": "pain_level",
        "field_type": "range",
        "required": true,
        "min": 1,
        "max": 10,
        "conditional_follow_up": {
          "condition": "greater_than_equal",
          "value": 7,
          "question": {
            "title": "Is it interfering with sleep or daily movement?",
            "field_name": "pain_interference",
            "field_type": "radio",
            "options": [
              {"value": "both", "label": "Yes – both", "tags": ["High_Pain", "Sleep_Impact"]},
              {"value": "just_movement", "label": "Just movement", "tags": ["High_Pain"]},
              {"value": "no", "label": "No"}
            ]
          }
        }
      },
      {
        "id": 12,
        "type": "question",
        "title": "Did your knee pain begin after an accident or injury?",
        "field_name": "injury_related",
        "field_type": "radio",
        "required": true,
        "options": [
          {"value": "yes", "label": "Yes", "tags": ["Disqualify_Trauma"]},
          {"value": "no", "label": "No"}
        ]
      },
      {
        "id": 13,
        "type": "educator",
        "title": "Meet Your Care Team",
        "description": "Board-certified physicians specializing in image-guided treatments that help people avoid surgery.",
        "image_placeholder": "doctor consulting with patient",
        "doctors": [
          {"name": "Dr. Sarah Mitchell", "specialty": "Interventional Radiologist"},
          {"name": "Dr. James Reed", "specialty": "Vascular Specialist"}
        ]
      },
      {
        "id": 14,
        "type": "ai_summary",
        "title": "Your Assessment Summary",
        "description": "Based on your responses, here''s a personalized summary of your situation."
      },
      {
        "id": 15,
        "type": "lead_capture",
        "title": "Get Your Consultation",
        "description": "Complete your information to schedule your consultation or receive your report.",
        "image_placeholder": "smiling care coordinator or phone support",
        "fields": [
          {"field_name": "first_name", "label": "First Name", "field_type": "text", "required": true},
          {"field_name": "last_name", "label": "Last Name", "field_type": "text", "required": true},
          {"field_name": "email", "label": "Email", "field_type": "email", "required": true},
          {"field_name": "phone", "label": "Phone", "field_type": "tel", "required": true},
          {"field_name": "zip_code", "label": "Zip Code", "field_type": "text", "required": true},
          {"field_name": "insurance_type", "label": "Insurance Type", "field_type": "select", "required": true, "options": [
            {"value": "medicare", "label": "Medicare"},
            {"value": "ppo", "label": "PPO"},
            {"value": "hmo", "label": "HMO"},
            {"value": "va", "label": "VA"},
            {"value": "not_sure", "label": "Not sure"}
          ]}
        ],
        "cta_options": [
          {"value": "schedule_consultation", "label": "Schedule My Consultation"},
          {"value": "send_report", "label": "Send My Report by Email"}
        ]
      }
    ]
  }'::jsonb
);

-- Enable RLS on all tables
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for form_templates (readable by everyone, manageable by authenticated users)
CREATE POLICY "Form templates are viewable by everyone" 
  ON public.form_templates 
  FOR SELECT 
  USING (true);

-- Create policies for project_forms (readable by everyone for public forms)
CREATE POLICY "Project forms are viewable by everyone" 
  ON public.project_forms 
  FOR SELECT 
  USING (is_active = true);

-- Create policies for form_submissions (insertable by everyone for public submissions)
CREATE POLICY "Form submissions can be created by anyone" 
  ON public.form_submissions 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Form submissions are viewable by project owners" 
  ON public.form_submissions 
  FOR SELECT 
  USING (true);
