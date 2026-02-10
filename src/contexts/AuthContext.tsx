import React, { createContext, useContext, useState, ReactNode } from "react";
import { AppRole, UserProfile } from "@/types";

interface AuthContextType {
  user: UserProfile | null;
  role: AppRole;
  setRole: (role: AppRole) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: "dono",
  setRole: () => {},
  isAuthenticated: true,
});

export const useAuth = () => useContext(AuthContext);

// Mock user for development — will be replaced with real auth
const mockUser: UserProfile = {
  id: "1",
  name: "Marina Silva",
  email: "marina@organiza.com",
  phone: "(11) 99999-0000",
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<AppRole>("dono");

  return (
    <AuthContext.Provider
      value={{
        user: mockUser,
        role,
        setRole,
        isAuthenticated: true,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
