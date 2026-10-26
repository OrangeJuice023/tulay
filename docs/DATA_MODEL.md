# Data Model

## Core Entities

### profiles
- id (uuid, PK, references auth.users)
- display_name (text)
- bio (text)
- career_background (text)
- current_situation (text)
- career_goal (text)
- availability (text/jsonb)
- preferred_language (text)
- visibility_settings (jsonb) - control what's visible
- is_demo (boolean, default false)
- created_at, updated_at (timestamptz)

### skills
- id (uuid, PK)
- profile_id (uuid, FK -> profiles)
- name (text)
- category (text)
- level (text) // beginner/intermediate/advanced/expert
- type (text) // offer/has

### help_requests (needs)
- id (uuid, PK)
- profile_id (uuid, FK -> profiles)
- description (text)
- goal_context (text)
- urgency (text)
- status (text) // open/fulfilled/closed
- created_at, updated_at

### help_offers
- id (uuid, PK)
- profile_id (uuid, FK -> profiles)
- description (text)
- capacity (text)
- status (text)
- created_at, updated_at

### match_proposals
- id (uuid, PK)
- requester_id (uuid, FK -> profiles)
- responder_id (uuid, FK -> profiles)
- match_reason (text) // AI explanation
- suggested_collab (text)
- compatibility_factors (jsonb)
- status (text) // proposed/viewed/accepted/rejected/expired
- created_at, updated_at

### introduction_requests
- id (uuid, PK)
- match_proposal_id (uuid, FK -> match_proposals)
- from_profile_id (uuid, FK -> profiles)
- to_profile_id (uuid, FK -> profiles)
- message (text) // editable by sender
- status (text) // pending/approved/rejected
- reviewed_at (timestamptz)
- created_at, updated_at

### collaborations
- id (uuid, PK)
- introduction_request_id (uuid, FK -> introduction_requests)
- profile1_id (uuid, FK -> profiles)
- profile2_id (uuid, FK -> profiles)
- intended_outcome (text)
- agreed_next_steps (jsonb/array)
- status (text) // proposed/accepted/in_progress/completed/cancelled
- created_at, updated_at

### collaboration_feedback
- id (uuid, PK)
- collaboration_id (uuid, FK -> collaborations)
- profile_id (uuid, FK -> profiles)
- useful (boolean)
- notes (text)
- created_at

## Security
- All tables have RLS enabled
- Users can only CRUD their own profile and related records
- Match proposals visible to involved parties only
- Introductions visible to sender/receiver only
- Collaborations visible to participants only
- Demo profiles marked with is_demo flag
