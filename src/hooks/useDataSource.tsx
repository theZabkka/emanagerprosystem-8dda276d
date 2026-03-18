import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type DataSourceType = "demo" | "database";

interface DataSourceContextType {
  dataSource: DataSourceType;
  setDataSource: (source: DataSourceType) => void;
  isDemo: boolean;
}

const DataSourceContext = createContext<DataSourceContextType | null>(null);

const STORAGE_KEY = "emanager-data-source";

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const [dataSource, setDataSourceState] = useState<DataSourceType>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as DataSourceType) || "demo";
    } catch {
      return "demo";
    }
  });

  const setDataSource = (source: DataSourceType) => {
    setDataSourceState(source);
    try {
      localStorage.setItem(STORAGE_KEY, source);
    } catch {}
  };

  return (
    <DataSourceContext.Provider value={{ dataSource, setDataSource, isDemo: dataSource === "demo" }}>
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSource() {
  const context = useContext(DataSourceContext);
  if (!context) throw new Error("useDataSource must be used within DataSourceProvider");
  return context;
}
