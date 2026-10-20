"use client";

// Keeps track of "who is using the app right now".
// There is no real login yet: the header lets you switch between demo learners and mentors,
// which is handy for showing teamwork and the mentor view during the pitch.
//
// Anonymity: when the viewer is a mentor, userName() returns a learner's anonymous name
// instead of their real name, unless that learner accepted the mentor's connection request.
// Every screen uses userName(), so nothing leaks by accident.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getConnectionsForLearner, getConnectionsForMentor, getUsers } from "@/lib/db";

const UserContext = createContext(null);
const STORAGE_KEY = "pdl-current-user";

export function UserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [connections, setConnections] = useState([]);

  const refreshUsers = useCallback(() => getUsers().then(setUsers), []);

  useEffect(() => {
    getUsers().then((all) => {
      setUsers(all);
      let saved = null;
      try {
        saved = window.localStorage.getItem(STORAGE_KEY);
      } catch {}
      const valid = all.find((u) => u.id === saved);
      const firstLearner = all.find((u) => u.role === "learner");
      setCurrentUserId(valid ? valid.id : firstLearner?.id || all[0]?.id || null);
    });
  }, []);

  const currentUser = users.find((u) => u.id === currentUserId) || null;
  const isMentor = currentUser?.role === "mentor";

  const refreshConnections = useCallback(async () => {
    if (!currentUser) return setConnections([]);
    const rows =
      currentUser.role === "mentor"
        ? await getConnectionsForMentor(currentUser.id)
        : await getConnectionsForLearner(currentUser.id);
    setConnections(rows);
  }, [currentUser]);

  useEffect(() => {
    refreshConnections();
  }, [refreshConnections]);

  function switchUser(id) {
    setCurrentUserId(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }

  // Learners who accepted this mentor's request: the mentor may see their real name.
  const revealed = useMemo(
    () => new Set(connections.filter((c) => c.status === "accepted").map((c) => c.learnerId)),
    [connections]
  );

  const userName = useCallback(
    (id) => {
      const user = users.find((u) => u.id === id);
      if (!user) return "Unknown";
      if (isMentor && user.role === "learner" && !revealed.has(user.id)) return user.anonymousName;
      return user.name;
    },
    [users, isMentor, revealed]
  );

  return (
    <UserContext.Provider
      value={{
        users,
        currentUser,
        isMentor,
        switchUser,
        userName,
        refreshUsers,
        connections,
        refreshConnections,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
