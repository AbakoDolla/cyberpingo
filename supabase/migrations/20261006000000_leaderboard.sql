-- CyberPingo · Leaderboard & Ligue hebdomadaire
-- Vue publique et apprenant du classement, des rangs mérités et des récompenses CyberBits.

create or replace function public.get_leaderboard(p_limit integer default 50)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_path text,
  xp integer,
  level integer,
  current_streak integer,
  rank_position bigint,
  reward_cb integer
) language sql security definer set search_path = '' as $$
  select
    p.id as user_id,
    p.username,
    p.display_name,
    p.avatar_path,
    p.xp,
    p.level,
    p.current_streak,
    pos.rank_position,
    case
      when pos.rank_position = 1 then 250
      when pos.rank_position = 2 then 150
      when pos.rank_position = 3 then 100
      when pos.rank_position between 4 and 10 then 50
      when pos.rank_position between 11 and 25 then 20
      else 0
    end as reward_cb
  from (
    select
      id,
      row_number() over (order by xp desc, created_at asc) as rank_position
    from public.profiles
    where (onboarding_completed = true or xp > 0)
  ) pos
  join public.profiles p on p.id = pos.id
  order by pos.rank_position asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke all on function public.get_leaderboard(integer) from public, anon;
grant execute on function public.get_leaderboard(integer) to authenticated;
