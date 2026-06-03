-- ============================================================================
-- Seed 25 system presenters across the top DR niches × personas.
-- Each row is workspace_id NULL + is_system TRUE → visible to every workspace.
--
-- Reference IDs / images are placeholders for the MockProvider; real provider
-- integrations (Higgsfield trained characters, fal image refs) will populate
-- reference_id / reference_image_url when admin connects them.
-- ============================================================================

insert into public.presenters
  (is_system, name, persona, niche_fit, gender, age_band, ethnicity, reference_id, reference_image_url, voice_default, notes, active)
values
  -- ── Weight loss / fitness ──
  ('t', 'Hannah K.',   'mom-next-door',      array['weight_loss','peptides'],          'female', '35-50', 'white',    'mock-presenter-01', 'https://placehold.co/512x512/png?text=Hannah',  'rachel', 'Relatable mom; works for transformation stories', true),
  ('t', 'Marcus T.',   'gym-bro',            array['weight_loss','peptides'],          'male',   '25-35', 'black',    'mock-presenter-02', 'https://placehold.co/512x512/png?text=Marcus',  'antoni', 'High-energy fitness presenter', true),
  ('t', 'Priya R.',    'wellness-coach',     array['weight_loss','skincare'],          'female', '25-35', 'south_asian','mock-presenter-03','https://placehold.co/512x512/png?text=Priya',   'bella',  'Calm, science-backed wellness voice', true),
  ('t', 'Jordan M.',   'transformation',     array['weight_loss','peptides'],          'male',   '35-50', 'latino',   'mock-presenter-04', 'https://placehold.co/512x512/png?text=Jordan',  'josh',   'Before/after authority figure', true),

  -- ── Finance / forex / biz-opp / crypto ──
  ('t', 'Daniel V.',   'finance-suit',       array['forex','biz_opp','crypto'],        'male',   '35-50', 'white',    'mock-presenter-05', 'https://placehold.co/512x512/png?text=Daniel',  'adam',   'Trustworthy authority for finance pitches', true),
  ('t', 'Tasha B.',    'side-hustle-mom',    array['biz_opp','forex'],                 'female', '25-35', 'black',    'mock-presenter-06', 'https://placehold.co/512x512/png?text=Tasha',   'domi',   'Relatable for "I quit my 9-5" stories', true),
  ('t', 'Kyle S.',     'crypto-bro',         array['crypto','forex','biz_opp'],        'male',   '18-25', 'white',    'mock-presenter-07', 'https://placehold.co/512x512/png?text=Kyle',    'sam',    'Gen-Z crypto/forex tone', true),
  ('t', 'Elena G.',    'forex-trader',       array['forex','crypto'],                  'female', '25-35', 'latino',   'mock-presenter-08', 'https://placehold.co/512x512/png?text=Elena',   'bella',  'Confident, screen-recording-friendly', true),
  ('t', 'Robert J.',   'retiree-investor',   array['forex','crypto','biz_opp'],        'male',   '50+',   'white',    'mock-presenter-09', 'https://placehold.co/512x512/png?text=Robert',  'thomas', '"After I retired I discovered..." stories', true),

  -- ── BPC / skincare / supplements ──
  ('t', 'Sofia M.',    'beauty-bestie',      array['skincare','peptides'],             'female', '25-35', 'latino',   'mock-presenter-10', 'https://placehold.co/512x512/png?text=Sofia',   'bella',  'Warm, glow-up, GRWM energy', true),
  ('t', 'Amara O.',    'glow-girl',          array['skincare'],                        'female', '18-25', 'black',    'mock-presenter-11', 'https://placehold.co/512x512/png?text=Amara',   'rachel', 'Gen-Z skincare trend voice', true),
  ('t', 'Mei L.',      'k-beauty-expert',    array['skincare','peptides'],             'female', '25-35', 'east_asian','mock-presenter-12','https://placehold.co/512x512/png?text=Mei',     'bella',  'Authority for science-backed skincare', true),
  ('t', 'Olivia P.',   'anti-aging',         array['skincare','peptides'],             'female', '35-50', 'white',    'mock-presenter-13', 'https://placehold.co/512x512/png?text=Olivia',  'rachel', 'Mid-life anti-aging story angle', true),

  -- ── E-commerce / lifestyle ──
  ('t', 'Ben H.',      'tech-reviewer',      array['biz_opp'],                         'male',   '25-35', 'white',    'mock-presenter-14', 'https://placehold.co/512x512/png?text=Ben',     'antoni', 'Honest unboxing/review energy', true),
  ('t', 'Riley C.',    'unboxing-friend',    array['skincare','peptides'],             'female', '25-35', 'mixed',    'mock-presenter-15', 'https://placehold.co/512x512/png?text=Riley',   'domi',   'Casual product discovery POV', true),
  ('t', 'Naomi F.',    'busy-pro',           array['weight_loss','skincare'],          'female', '35-50', 'white',    'mock-presenter-16', 'https://placehold.co/512x512/png?text=Naomi',   'rachel', '"As a working mom of three..." angle', true),

  -- ── B2B / SaaS / tech ──
  ('t', 'Alex W.',     'tech-founder',       array['biz_opp'],                         'male',   '25-35', 'white',    'mock-presenter-17', 'https://placehold.co/512x512/png?text=Alex',    'josh',   'B2B founder, direct-to-camera', true),
  ('t', 'Sam K.',      'creator-economy',    array['biz_opp'],                         'nonbinary','25-35','east_asian','mock-presenter-18','https://placehold.co/512x512/png?text=Sam',     'sam',    'Personal brand/creator tone', true),

  -- ── Health / peptides / wellness extras ──
  ('t', 'Diana R.',    'nurse-authority',    array['weight_loss','peptides','skincare'],'female','35-50','white',   'mock-presenter-19', 'https://placehold.co/512x512/png?text=Diana',   'bella',  'Medical-adjacent authority figure', true),
  ('t', 'Carlos V.',   'family-man',         array['weight_loss','biz_opp'],           'male',   '35-50', 'latino',   'mock-presenter-20', 'https://placehold.co/512x512/png?text=Carlos',  'adam',   '"For my family" testimonial angle', true),

  -- ── Younger Gen-Z angles ──
  ('t', 'Maya J.',     'gen-z-relatable',    array['weight_loss','skincare','biz_opp'],'female', '18-25', 'mixed',    'mock-presenter-21', 'https://placehold.co/512x512/png?text=Maya',    'domi',   'TikTok-native presenter', true),
  ('t', 'Tyler N.',    'gen-z-bro',          array['weight_loss','biz_opp','crypto'],  'male',   '18-25', 'white',    'mock-presenter-22', 'https://placehold.co/512x512/png?text=Tyler',   'sam',    'College-age, casual delivery', true),

  -- ── Older / authority angles ──
  ('t', 'Margaret W.', 'wise-elder',         array['weight_loss','skincare','peptides','forex'], 'female','50+', 'white',  'mock-presenter-23', 'https://placehold.co/512x512/png?text=Margaret','rachel', '"I wish I knew this 20 years ago"', true),
  ('t', 'James P.',    'retired-pro',        array['forex','biz_opp','crypto'],        'male',   '50+',   'black',    'mock-presenter-24', 'https://placehold.co/512x512/png?text=James',   'thomas', 'Calm authority, second-act story', true),

  -- ── Wildcard / pattern-interrupt ──
  ('t', 'Zoe X.',      'pattern-interrupt',  array['skincare','biz_opp','weight_loss'],'female', '25-35', 'mixed',    'mock-presenter-25', 'https://placehold.co/512x512/png?text=Zoe',     'bella',  'High-energy, unconventional hook style', true)
on conflict do nothing;
