"use client";

// React hooks for live data (see watchList / watchDoc in lib/db.js).
// They return undefined while loading, then the current rows (or document, or null).
import { useEffect, useState } from "react";
import { watchDoc, watchList } from "./db";

export function useLiveList(name, field, value, op = "==") {
  const [rows, setRows] = useState(undefined);
  useEffect(() => {
    if (!value) return;
    setRows(undefined);
    return watchList(name, { field, op, value }, setRows);
  }, [name, field, value, op]);
  return rows;
}

export function useLiveDoc(name, id) {
  const [row, setRow] = useState(undefined);
  useEffect(() => {
    if (!id) return;
    setRow(undefined);
    return watchDoc(name, id, setRow);
  }, [name, id]);
  return row;
}
