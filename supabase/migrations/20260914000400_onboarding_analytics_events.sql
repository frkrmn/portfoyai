alter table public.experiment_events drop constraint if exists experiment_events_event_type_check;
alter table public.experiment_events add constraint experiment_events_event_type_check check (event_type in ('pricing_view','upgrade_click','paywall_view','prompt_suggestion_click','prompt_quality_ready','onboarding_generation_start'));
