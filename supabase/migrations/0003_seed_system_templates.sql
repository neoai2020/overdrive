-- ============================================================================
-- Seed: system-provided ad templates available to all workspaces.
-- These are the proven creative structures the brief references.
-- ============================================================================

insert into public.templates (workspace_id, is_system, kind, name, summary, structure, default_length, niches)
values
  (null, true, 'ugc_story', '"I tried everything"',
    'Failed-solutions confession → discovery → result. Highest-converting weight-loss structure.',
    '["hook: I tried everything", "list 3 failed solutions", "discovery moment", "transformation reveal", "soft CTA"]'::jsonb,
    25, '{weight_loss, supplement, peptides}'),

  (null, true, 'ugc_authority', 'Doctor reveal',
    'Clinical credibility open, mechanism explainer, proof, soft CTA. Great for supplements & peptides.',
    '["hook: doctor-style authority claim", "credibility marker", "mechanism explainer", "proof", "soft CTA"]'::jsonb,
    35, '{supplement, peptides, skincare}'),

  (null, true, 'b_roll_listicle', '"3 reasons why"',
    'Fast-paced numbered payoff with VO. Works across biz-opp and finance.',
    '["hook: pattern-interrupt promise", "reason 1", "reason 2", "reason 3", "CTA"]'::jsonb,
    20, '{biz_opp, forex, crypto, trading}'),

  (null, true, 'ugc_pattern_interrupt', '"Stop scrolling"',
    'Hard interrupt → bold claim → proof → urgency. Cold-traffic workhorse.',
    '["hook: stop scrolling pattern interrupt", "bold claim", "proof", "urgency", "CTA"]'::jsonb,
    18, '{biz_opp, weight_loss, crypto}'),

  (null, true, 'b_roll_transform', 'Before / after',
    'Visual contrast led, minimal copy, strong CTA. Skincare & fitness.',
    '["hook: visual before/after frame", "contrast", "what changed", "CTA"]'::jsonb,
    20, '{skincare, weight_loss, peptides}');
