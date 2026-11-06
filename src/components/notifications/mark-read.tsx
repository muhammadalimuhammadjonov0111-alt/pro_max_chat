"use client";

import * as React from "react";

import { markNotificationsRead } from "@/actions/user";

export function MarkNotificationsRead() {
  React.useEffect(() => {
    markNotificationsRead();
  }, []);
  return null;
}
