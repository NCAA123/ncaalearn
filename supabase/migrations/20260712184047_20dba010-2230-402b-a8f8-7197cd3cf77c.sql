
-- Enable realtime for discussions
ALTER PUBLICATION supabase_realtime ADD TABLE public.academy_discussions;

-- Notify parent-post author when someone replies
CREATE OR REPLACE FUNCTION public.notify_discussion_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_user UUID;
  course_slug TEXT;
  course_title TEXT;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO parent_user FROM public.academy_discussions WHERE id = NEW.parent_id;
  IF parent_user IS NULL OR parent_user = NEW.user_id THEN RETURN NEW; END IF;
  SELECT slug, title INTO course_slug, course_title FROM public.academy_courses WHERE id = NEW.course_id;
  INSERT INTO public.academy_notifications(user_id, title, body, link)
  VALUES (
    parent_user,
    'New reply to your post',
    'Someone replied on "' || COALESCE(course_title, 'a course') || '"',
    '/courses/' || COALESCE(course_slug, '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_discussion_reply ON public.academy_discussions;
CREATE TRIGGER trg_notify_discussion_reply
AFTER INSERT ON public.academy_discussions
FOR EACH ROW EXECUTE FUNCTION public.notify_discussion_reply();
