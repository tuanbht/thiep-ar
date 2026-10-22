-- Visitors' analytics moved to Google Analytics 4 (lib/analytics/ga.ts): the events table goes, its indexes with it.
-- The orders and payments tables stay the record of what was sold.
drop table if exists public.events;
