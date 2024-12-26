import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface ModelSelectorProps {
  model: string;
  setModel: (model: string) => void;
  availableModels: Array<{ id: string; name: string }>;
  isLoading: boolean;
}

export function ModelSelector({ model, setModel, availableModels, isLoading }: ModelSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading models...</span>
      </div>
    )
  }

  return (
    <Select value={model} onValueChange={setModel}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {availableModels.map((availableModel) => (
          <SelectItem key={availableModel.id} value={availableModel.id}>
            {availableModel.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

