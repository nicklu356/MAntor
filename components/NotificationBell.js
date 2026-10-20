"use client";

// The bell in the header: what happened in my teams since I last looked.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useUser } from "./UserProvider";
import {
  getProject,
  getTasks,
  getTeamComments,
  getTeamFeedback,
  getTeamsForMentor,
  getTeamsForUser,
} from "@/lib/db";
import { buildNotifications, countUnread } from "@/lib/notifications";
import { timeAgo } from "@/lib/format";

const seenKey = (userId) => `mantor-notifications-seen-${userId}`;

export default function NotificationBell() {
  const pathname = usePathname();
  const { currentUser, isMentor, userName, users, connections } = useUser();
  const [items, setItems] = useState([]);
  const [lastSeen, setLastSeen] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    (async () => {
      const teams = isMentor
        ? await getTeamsForMentor(currentUser.id)
        : await Promise.all(
            (await getTeamsForUser(currentUser.id)).map(async (t) => ({ ...t, project: await getProject(t.projectId) }))
          );
      const detailed = await Promise.all(
        teams.map(async (team) => {
          const [tasks, comments, feedback] = await Promise.all([
            getTasks(team.id),
            getTeamComments(team.id),
            getTeamFeedback(team.id),
          ]);
          return { ...team, tasks, comments, feedback };
        })
      );
      if (cancelled) return;
      setItems(buildNotifications({ viewer: currentUser, teams: detailed, connections, userName, users }));
      try {
        setLastSeen(window.localStorage.getItem(seenKey(currentUser.id)));
      } catch {
        setLastSeen(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // pathname: refresh after navigating, so new activity shows up without a reload.
  }, [currentUser, isMentor, connections, userName, users, pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!currentUser) return null;
  const unread = countUnread(items, lastSeen);

  function markAllRead() {
    const stamp = new Date().toISOString();
    setLastSeen(stamp);
    try {
      window.localStorage.setItem(seenKey(currentUser.id), stamp);
    } catch {}
  }

  return (
    <div className="bell" ref={ref}>
      <button
        className="bell-button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3a1.5 1.5 0 0 0-3 0v1.16A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"
          />
        </svg>
        {unread > 0 && <span className="bell-count">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="bell-panel card">
          <div className="spread">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button className="btn btn-ghost btn-small" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="muted small">Nothing yet. Activity in your teams shows up here.</p>
          ) : (
            <ul className="list-plain bell-list">
              {items.slice(0, 15).map((item) => {
                const isNew = !lastSeen || String(item.at) > lastSeen;
                return (
                  <li key={item.id} className={isNew ? "unread" : ""}>
                    <Link href={item.href} onClick={markAllRead}>
                      {item.text}
                    </Link>
                    {item.detail && <div className="muted small clamp-2">{item.detail}</div>}
                    <div className="muted small">{timeAgo(item.at)}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
