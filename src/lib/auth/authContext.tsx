"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../firebase/client";
import { isLocalDevMode } from "../firebase/config";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isAdmin: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  isLocalMode: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginLocalAdmin: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_ADMIN_KEY = "gia_pha_admin_session";
const DEFAULT_LOCAL_ADMIN_PIN = "admin123";

// Admin allowlist from env
const ADMIN_PRIMARY_UID = process.env.NEXT_PUBLIC_ADMIN_PRIMARY_UID || "admin-initial-uid";
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "admin@giapha.vn,admin@domain.com")
  .split(",")
  .map(e => e.trim().toLowerCase());

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLocal = isLocalDevMode();

  useEffect(() => {
    // 1. If in Local Dev Mode, check local storage session
    if (isLocal || !auth) {
      const saved = localStorage.getItem(LOCAL_ADMIN_KEY);
      if (saved === "true") {
        setUser({
          uid: "local-admin-uid",
          email: "admin@local.dev",
          displayName: "Quản trị viên (Local)",
          isAdmin: true,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
      return;
    }

    // 2. Firebase Auth listener
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        // Check if user is in admin allowlist
        const isUidAdmin = fbUser.uid === ADMIN_PRIMARY_UID;
        const isEmailAdmin = fbUser.email ? ADMIN_EMAILS.includes(fbUser.email.toLowerCase()) : false;
        
        // Also check custom claims if any
        let hasCustomClaimAdmin = false;
        try {
          const idTokenResult = await fbUser.getIdTokenResult();
          hasCustomClaimAdmin = !!idTokenResult.claims.admin;
        } catch {
          // ignore
        }

        const isAdmin = isUidAdmin || isEmailAdmin || hasCustomClaimAdmin;

        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email,
          photoURL: fbUser.photoURL,
          isAdmin,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isLocal]);

  // Login methods
  const loginWithEmail = async (email: string, pass: string) => {
    if (isLocal || !auth) {
      if (pass === DEFAULT_LOCAL_ADMIN_PIN) {
        localStorage.setItem(LOCAL_ADMIN_KEY, "true");
        setUser({
          uid: "local-admin-uid",
          email,
          displayName: "Quản trị viên (Local)",
          isAdmin: true,
        });
      } else {
        throw new Error("Mật khẩu quản trị viên nội bộ không chính xác (Mặc định: admin123)");
      }
      return;
    }

    await signInWithEmailAndPassword(auth, email, pass);
  };

  const loginWithGoogle = async () => {
    if (isLocal || !auth) {
      localStorage.setItem(LOCAL_ADMIN_KEY, "true");
      setUser({
        uid: "local-admin-uid",
        email: "google-admin@local.dev",
        displayName: "Quản trị viên Google (Local)",
        isAdmin: true,
      });
      return;
    }

    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginLocalAdmin = async (password: string): Promise<boolean> => {
    if (password === DEFAULT_LOCAL_ADMIN_PIN) {
      localStorage.setItem(LOCAL_ADMIN_KEY, "true");
      setUser({
        uid: "local-admin-uid",
        email: "admin@local.dev",
        displayName: "Quản trị viên",
        isAdmin: true,
      });
      return true;
    }
    return false;
  };

  const logout = async () => {
    if (isLocal || !auth) {
      localStorage.removeItem(LOCAL_ADMIN_KEY);
      setUser(null);
      return;
    }

    await fbSignOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: !!user?.isAdmin,
        isLoading,
        isLocalMode: isLocal,
        loginWithEmail,
        loginWithGoogle,
        loginLocalAdmin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
