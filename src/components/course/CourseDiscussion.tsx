import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listDiscussions,
  postDiscussion,
  deleteDiscussion,
} from "@/lib/discussions.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Reply, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { formatDistanceToNow } from "date-fns";

type DiscussionRow = {
  id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  author: { full_name: string | null; avatar_url: string | null };
};

export function CourseDiscussion({ courseId }: { courseId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const list = useServerFn(listDiscussions);
  const post = useServerFn(postDiscussion);
  const del = useServerFn(deleteDiscussion);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["course-discussion", courseId],
    queryFn: () => list({ data: { courseId } }) as Promise<DiscussionRow[]>,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["course-discussion", courseId] });

  const postMut = useMutation({
    mutationFn: (vars: { body: string; parentId: string | null }) =>
      post({
        data: { courseId, body: vars.body, parentId: vars.parentId },
      }),
    onSuccess: () => {
      setBody("");
      setReplyBody("");
      setReplyTo(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not post"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not delete"),
  });

  const topLevel = messages.filter((m) => !m.parent_id);
  const repliesOf = (id: string) =>
    messages.filter((m) => m.parent_id === id);

  const initials = (name: string | null) =>
    (name ?? "?")
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const renderMessage = (m: DiscussionRow, isReply = false) => (
    <div
      key={m.id}
      className={`flex gap-3 ${isReply ? "ml-10 mt-3" : "py-4 border-b border-border last:border-0"}`}
    >
      <Avatar className="h-9 w-9 shrink-0">
        {m.author.avatar_url ? (
          <AvatarImage src={m.author.avatar_url} alt="" />
        ) : null}
        <AvatarFallback className="text-xs">
          {initials(m.author.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">
            {m.author.full_name ?? "Member"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words">
          {m.body}
        </p>
        <div className="flex items-center gap-3 mt-2">
          {!isReply && (
            <button
              type="button"
              onClick={() =>
                setReplyTo((cur) => (cur === m.id ? null : m.id))
              }
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Reply className="h-3 w-3" /> Reply
            </button>
          )}
          {user?.id === m.user_id && (
            <button
              type="button"
              onClick={() => delMut.mutate(m.id)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
        </div>
        {!isReply && replyTo === m.id && (
          <div className="mt-3 space-y-2">
            <Textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply…"
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!replyBody.trim() || postMut.isPending}
                onClick={() =>
                  postMut.mutate({ body: replyBody.trim(), parentId: m.id })
                }
              >
                Reply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReplyTo(null);
                  setReplyBody("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        {!isReply &&
          repliesOf(m.id).map((r) => renderMessage(r, true))}
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-card p-6 mt-8">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Discussion</h2>
        <span className="text-xs text-muted-foreground ml-1">
          {messages.length} {messages.length === 1 ? "message" : "messages"}
        </span>
      </div>

      <div className="space-y-2 mb-6">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ask a question or share a thought…"
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            disabled={!body.trim() || postMut.isPending}
            onClick={() =>
              postMut.mutate({ body: body.trim(), parentId: null })
            }
          >
            {postMut.isPending ? "Posting…" : "Post"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : topLevel.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6">
          No messages yet. Start the conversation.
        </div>
      ) : (
        <div>{topLevel.map((m) => renderMessage(m))}</div>
      )}
    </div>
  );
}