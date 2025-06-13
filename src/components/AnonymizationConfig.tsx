
import { Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface AnonymizationOptions {
  cpf: string;
  names: string;
  phones: string;
  emails: string;
  keepConsistency: boolean;
  preserveFormatting: boolean;
}

interface AnonymizationConfigProps {
  options: AnonymizationOptions;
  onChange: (options: AnonymizationOptions) => void;
  disabled?: boolean;
}

const AnonymizationConfig = ({ options, onChange, disabled = false }: AnonymizationConfigProps) => {
  const updateOption = (key: keyof AnonymizationOptions, value: any) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <Card className={`p-6 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center mb-6">
        <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full mr-3">
          <Settings className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-semibold">2. Configure a anonimização</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="cpf-config" className="text-sm font-medium mb-2 block">
            CPF
          </Label>
          <Select
            disabled={disabled}
            value={options.cpf}
            onValueChange={(value) => updateOption('cpf', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="partial">Mascaramento Parcial (***.***.**-09)</SelectItem>
              <SelectItem value="full">Mascaramento Total (***.***.***-**)</SelectItem>
              <SelectItem value="pseudonym">Pseudônimo (PESSOA_001)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="names-config" className="text-sm font-medium mb-2 block">
            Nomes Próprios
          </Label>
          <Select
            disabled={disabled}
            value={options.names}
            onValueChange={(value) => updateOption('names', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="pseudonym">Pseudônimo (PESSOA_001)</SelectItem>
              <SelectItem value="generic">Nome Genérico (Fulano de Tal)</SelectItem>
              <SelectItem value="initials">Iniciais (F.T.S.)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="phones-config" className="text-sm font-medium mb-2 block">
            Telefones
          </Label>
          <Select
            disabled={disabled}
            value={options.phones}
            onValueChange={(value) => updateOption('phones', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="partial">Mascaramento Parcial ((XX) XXXXX-9999)</SelectItem>
              <SelectItem value="full">Mascaramento Total ((XX) XXXXX-XXXX)</SelectItem>
              <SelectItem value="generic">Número Genérico ((11) 99999-9999)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="emails-config" className="text-sm font-medium mb-2 block">
            E-mails
          </Label>
          <Select
            disabled={disabled}
            value={options.emails}
            onValueChange={(value) => updateOption('emails', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="partial">Mascaramento Parcial (***@dominio.com)</SelectItem>
              <SelectItem value="full">Mascaramento Total (***@***.***)</SelectItem>
              <SelectItem value="generic">E-mail Genérico (contato@exemplo.com)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="consistency"
            checked={options.keepConsistency}
            onCheckedChange={(checked) => updateOption('keepConsistency', checked)}
            disabled={disabled}
          />
          <Label 
            htmlFor="consistency" 
            className="text-sm cursor-pointer"
          >
            Manter consistência (mesmo dado sempre igual)
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="formatting"
            checked={options.preserveFormatting}
            onCheckedChange={(checked) => updateOption('preserveFormatting', checked)}
            disabled={disabled}
          />
          <Label 
            htmlFor="formatting" 
            className="text-sm cursor-pointer"
          >
            Preservar formatação
          </Label>
        </div>
      </div>
    </Card>
  );
};

export default AnonymizationConfig;
