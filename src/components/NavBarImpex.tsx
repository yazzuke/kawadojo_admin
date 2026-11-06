import React from "react";
import { Link } from "react-router-dom";
import { Calculator } from "lucide-react";

interface NavBarImpexProps {
  activeTab: "search" | "saved";
  onTabChange: (tab: "search" | "saved") => void;
}

const NavBarImpex: React.FC<NavBarImpexProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-[#141414] rounded-lg border border-[#333333] shadow-inner w-full sm:w-auto">
      <button
        onClick={() => onTabChange("search")}
        className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 ${
          activeTab === "search"
            ? "bg-kawa-green text-black shadow-md"
            : "text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
        }`}
      >
        Consulta API Impex
      </button>
      <button
        onClick={() => onTabChange("saved")}
        className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 ${
          activeTab === "saved"
            ? "bg-kawa-green text-black shadow-md"
            : "text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
        }`}
      >
        Guardados en DB
      </button>
      <Link
        to="/impex-cotizaciones"
        className="flex items-center justify-center gap-1.5 flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-all duration-200"
      >
        <Calculator size={15} /> Cotizaciones
      </Link>
    </div>
  );
};

export default NavBarImpex;
