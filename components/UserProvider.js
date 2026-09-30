"use client";

// Keeps track of "who is using the app right now".
// There is no real login yet: the header lets you switch between demo learners and mentors,
// which is handy for showing teamwork and the mentor view during the pitch.
//
// Anonymity: when the viewer is a mentor, userName() returns a learner's anonymous name
// instead of their real name. Every screen uses userName(), so nothing leaks by accident.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getUsers } from "@/lib/db";

const UserContext = createContext(null);
const STORAGE_KEY = "pdl-current-user";

export function UserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

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

  function switchUser(id) {
    setCurrentUserId(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }

  const currentUser = users.find((u) => u.id === currentUserId) || null;
  const isMentor = currentUser?.role === "mentor";

  const userName = (id) => {
    const user = users.find((u) => u.id === id);
    if (!user) return "Unknown";
    if (isMentor && user.role === "learner") return user.anonymousName;
    return user.name;
  };

  return (
    <UserContext.Provider value={{ users, currentUser, isMentor, switchUser, userName, refreshUsers }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
