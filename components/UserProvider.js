"use client";

// Keeps track of "who is using the app right now".
//
// Demo ("local" or "demo" mode, see lib/session.js): the header's "Viewing as" switch picks one of
// the sample learners and mentors, which is handy for showing teamwork and the mentor view.
// Real accounts ("auth" mode): the signed-in Firebase user.
//
// Anonymity: userName() is the only way screens show a person's name.
// - Mentors see a learner's anonymous name, unless that learner accepted their connection request.
// - With real accounts, learners' real names are private: a learner sees the names of their own
//   teammates (teamNames) and everyone else's anonymous name.
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { logOut, refreshAuthUser, watchAuth } from "@/lib/auth";
import {
  ensureAccount,
  getConnectionsForLearner,
  getConnectionsForMentor,
  getProfile,
  getTeamNames,
  getTeamPhotos,
  getTeamsForUser,
  getUsers,
} from "@/lib/db";
import { isProfileComplete } from "@/lib/profile";
import { useT } from "@/components/LocaleProvider";
import { getMode } from "@/lib/session";

const UserContext = createContext(null);
const STORAGE_KEY = "pdl-current-user";

export function UserProvider({ children }) {
  const t = useT();
  const pathname = usePathname();
  const [mode, setMode] = useState(null); // decided in the browser (it reads localStorage)
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [profile, setProfile] = useState(null); // real accounts: name, email, date of birth, education
  // real accounts: { email, emailVerified, providers: ["password", "google.com"] }
  const [authInfo, setAuthInfo] = useState(null);
  const [connections, setConnections] = useState([]);
  const [teamNames, setTeamNames] = useState({}); // real accounts: { uid: name } of my teammates
  const [teamPhotos, setTeamPhotos] = useState({}); // real accounts: { uid: photo } of my teammates
  // loaded: we know who is using the app (or that nobody is signed in).
  // dataError: the database could not be read (shown in the header).
  const [loaded, setLoaded] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    setMode(getMode());
  }, []);

  // Demo: load the sample users and restore the last person picked in "Viewing as".
  useEffect(() => {
    if (!mode || mode === "auth") return;
    getUsers()
      .then((all) => {
        setUsers(all);
        let saved = null;
        try {
          saved = window.localStorage.getItem(STORAGE_KEY);
        } catch {}
        const valid = all.find((u) => u.id === saved);
        const firstLearner = all.find((u) => u.role === "learner");
        setCurrentUserId(valid ? valid.id : firstLearner?.id || all[0]?.id || null);
        setLoaded(true);
      })
      .catch((error) => {
        setDataError(error.message);
        setLoaded(true);
      });
  }, [mode]);

  // Real accounts: follow Firebase sign-in, and create the account records on first sign-in.
  useEffect(() => {
    if (mode !== "auth") return;
    return watchAuth(async (authUser) => {
      setDataError("");
      if (!authUser) {
        setAuthInfo(null);
        setUsers([]);
        setCurrentUserId(null);
        setProfile(null);
        setConnections([]);
        setTeamNames({});
        setSignedOut(true);
        setLoaded(true);
        return;
      }
      try {
        const me = await ensureAccount(authUser);
        const [all, mine] = await Promise.all([getUsers(), getProfile(authUser.uid)]);
        setUsers(all.some((u) => u.id === me.id) ? all : [...all, me]);
        setProfile(mine);
        setAuthInfo(describeAuthUser(authUser));
        setCurrentUserId(authUser.uid);
        setSignedOut(false);
      } catch (error) {
        setDataError(error.message);
      }
      setLoaded(true);
    });
  }, [mode]);

  const refreshUsers = useCallback(async () => {
    setUsers(await getUsers());
    if (mode === "auth" && currentUserId) setProfile(await getProfile(currentUserId));
  }, [mode, currentUserId]);

  const refreshProfile = useCallback(async () => {
    if (mode !== "auth" || !currentUserId) return;
    setProfile(await getProfile(currentUserId));
  }, [mode, currentUserId]);

  // After linking Google, adding a password or verifying the email.
  const refreshAuthInfo = useCallback(async () => {
    if (mode !== "auth") return;
    setAuthInfo(describeAuthUser(await refreshAuthUser()));
  }, [mode]);

  const userRecord = users.find((u) => u.id === currentUserId) || null;
  // My own record, with my private name and email added (only I can read them).
  const currentUser = useMemo(() => {
    if (!userRecord) return null;
    if (mode !== "auth") return userRecord;
    return {
      ...userRecord,
      name: userRecord.role === "mentor" ? userRecord.name || profile?.name : profile?.name || userRecord.anonymousName,
      email: profile?.email || "",
      photo: profile?.photo || null,
    };
  }, [userRecord, profile, mode]);
  const isMentor = currentUser?.role === "mentor";

  const refreshConnections = useCallback(async () => {
    if (!currentUser) return setConnections([]);
    try {
      const rows =
        currentUser.role === "mentor"
          ? await getConnectionsForMentor(currentUser.id)
          : await getConnectionsForLearner(currentUser.id);
      setConnections(rows);
    } catch (error) {
      setDataError(error.message);
    }
    // Only when the person (or their role) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    refreshConnections();
  }, [refreshConnections]);

  // Real accounts: my teammates' names. Refreshed on every page change, so a new teammate's
  // name appears without a reload.
  useEffect(() => {
    if (mode !== "auth" || !currentUser || isMentor) return;
    let cancelled = false;
    getTeamsForUser(currentUser.id)
      .then((teams) => Promise.all(teams.map(async (item) => [await getTeamNames(item.id), await getTeamPhotos(item.id)])))
      .then((groups) => {
        if (cancelled) return;
        setTeamNames(Object.assign({}, ...groups.map((g) => g[0])));
        setTeamPhotos(Object.assign({}, ...groups.map((g) => g[1])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, currentUser?.id, isMentor, pathname]);

  function switchUser(id) {
    if (mode === "auth") return;
    setCurrentUserId(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }

  // Learners who accepted this mentor's request: the mentor may see their real name.
  const revealed = useMemo(() => {
    const map = new Map();
    for (const c of connections) if (c.status === "accepted") map.set(c.learnerId, c.learnerName || null);
    return map;
  }, [connections]);
  const revealedPhotos = useMemo(() => {
    const map = new Map();
    for (const c of connections) if (c.status === "accepted" && c.learnerPhoto) map.set(c.learnerId, c.learnerPhoto);
    return map;
  }, [connections]);

  const userName = useCallback(
    (id) => {
      const user = users.find((u) => u.id === id);
      if (!user) return t("Former member"); // the account was deleted
      if (currentUser && id === currentUser.id) return currentUser.name || user.anonymousName;
      if (isMentor && user.role === "learner") {
        return revealed.has(id) ? revealed.get(id) || user.name || user.anonymousName : user.anonymousName;
      }
      return user.name || teamNames[id] || user.anonymousName;
    },
    [users, currentUser, isMentor, revealed, teamNames, t]
  );

  // A person's photo, with the same privacy as their name (null = show initials).
  const userPhoto = useCallback(
    (id) => {
      const user = users.find((u) => u.id === id);
      if (!user) return null;
      if (currentUser && id === currentUser.id) return currentUser.photo || null;
      if (isMentor && user.role === "learner") return revealedPhotos.get(id) || null;
      return user.photo || teamPhotos[id] || null;
    },
    [users, currentUser, isMentor, revealedPhotos, teamPhotos]
  );

  const signOut = useCallback(async () => {
    await logOut();
    window.location.href = "/";
  }, []);

  return (
    <UserContext.Provider
      value={{
        mode,
        users,
        currentUser,
        isMentor,
        isAdmin: Boolean(currentUser?.admin),
        switchUser,
        userName,
        userPhoto,
        refreshUsers,
        connections,
        refreshConnections,
        loaded,
        signedOut: mode === "auth" && signedOut,
        profile,
        refreshProfile,
        // Real accounts must fill in their basic details before using the app (see AuthGate).
        profileComplete: mode !== "auth" || !currentUser || isProfileComplete(profile),
        authInfo,
        refreshAuthInfo,
        dataError,
        signOut,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

function describeAuthUser(user) {
  if (!user) return null;
  return {
    email: user.email || "",
    emailVerified: Boolean(user.emailVerified),
    providers: (user.providerData || []).map((p) => p.providerId),
  };
}

export function useUser() {
  return useContext(UserContext);
}
