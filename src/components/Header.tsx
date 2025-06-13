
import { Shield } from "lucide-react";

const Header = () => {
  return (
    <header className="bg-gradient-purple text-white py-4 px-6 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8" />
          <h1 className="text-2xl font-bold">Anonimizador Jurídico</h1>
        </div>
        <div className="flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm">Conforme LGPD</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
