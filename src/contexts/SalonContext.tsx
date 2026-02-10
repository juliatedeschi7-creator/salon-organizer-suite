import React, { createContext, useContext, useState, ReactNode } from "react";
import { SalonSettings, WorkingHours } from "@/types";

const defaultHours: WorkingHours[] = [
  { day: "Segunda", enabled: true, open: "09:00", close: "19:00" },
  { day: "Terça", enabled: true, open: "09:00", close: "19:00" },
  { day: "Quarta", enabled: true, open: "09:00", close: "19:00" },
  { day: "Quinta", enabled: true, open: "09:00", close: "19:00" },
  { day: "Sexta", enabled: true, open: "09:00", close: "19:00" },
  { day: "Sábado", enabled: true, open: "09:00", close: "16:00" },
  { day: "Domingo", enabled: false, open: "09:00", close: "13:00" },
];

const defaultSalon: SalonSettings = {
  id: "1",
  name: "Studio Beleza",
  description: "Salão de beleza completo",
  address: "Rua das Flores, 123 - Centro",
  phone: "(11) 3333-4444",
  clientLink: "studio-beleza",
  primaryColor: "#c0365d",
  accentColor: "#e67e22",
  notificationsEnabled: true,
  workingHours: defaultHours,
};

interface SalonContextType {
  salon: SalonSettings;
  updateSalon: (updates: Partial<SalonSettings>) => void;
}

const SalonContext = createContext<SalonContextType>({
  salon: defaultSalon,
  updateSalon: () => {},
});

export const useSalon = () => useContext(SalonContext);

export const SalonProvider = ({ children }: { children: ReactNode }) => {
  const [salon, setSalon] = useState<SalonSettings>(defaultSalon);

  const updateSalon = (updates: Partial<SalonSettings>) => {
    setSalon((prev) => ({ ...prev, ...updates }));
  };

  return (
    <SalonContext.Provider value={{ salon, updateSalon }}>
      {children}
    </SalonContext.Provider>
  );
};
