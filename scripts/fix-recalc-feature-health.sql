-- Fix: Avoid format() for percentage strings to prevent "unrecognized format() type specifier" errors
-- Instead of format('%.0f%%', value), use concat(round(value)::text, '%')

CREATE OR REPLACE FUNCTION public.recalc_feature_health(p_feature_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_health feature_health;
  v_reason text;
  v_blocked_count int;
  v_total_count int;
  v_blocked_pct numeric;
BEGIN
  -- Count tasks
  SELECT
    COUNT(*) FILTER (WHERE blocked = true),
    COUNT(*)
  INTO v_blocked_count, v_total_count
  FROM tasks
  WHERE feature_id = p_feature_id;

  -- Calculate health
  IF v_total_count = 0 THEN
    v_health := 'healthy';
    v_reason := 'No tasks';
  ELSE
    v_blocked_pct := (v_blocked_count::numeric / v_total_count::numeric) * 100;
    
    IF v_blocked_pct >= 50 THEN
      v_health := 'critical';
      -- FIX: Use concat instead of format() to avoid "%.0f%%" issue
      v_reason := v_blocked_count || ' of ' || v_total_count || ' tasks blocked (' || round(v_blocked_pct) || '%)';
    ELSIF v_blocked_pct >= 25 THEN
      v_health := 'warning';
      -- FIX: Use concat instead of format() to avoid "%.0f%%" issue
      v_reason := v_blocked_count || ' of ' || v_total_count || ' tasks blocked (' || round(v_blocked_pct) || '%)';
    ELSE
      v_health := 'healthy';
      v_reason := CASE WHEN v_blocked_count > 0
        -- FIX: Use concat instead of format() to avoid "%.0f%%" issue
        THEN v_blocked_count || ' of ' || v_total_count || ' tasks blocked (' || round(v_blocked_pct) || '%)'
        ELSE 'All tasks unblocked'
      END;
    END IF;
  END IF;

  -- Update feature
  UPDATE features
  SET
    health = v_health,
    health_reason = v_reason,
    health_updated_at = NOW()
  WHERE id = p_feature_id;
END;
$function$;
