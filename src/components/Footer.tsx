
import { Shield } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="h-6 w-6" />
            <span className="text-xl font-bold">Anonimizador Jurídico</span>
          </div>
          
          <p className="text-gray-300 mb-2">
            Ferramenta desenvolvida para garantir conformidade com LGPD e sigilo profissional da OAB.
          </p>
          <p className="text-gray-400 text-sm">
            Processamento 100% local - seus dados não são enviados para servidores externos.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
