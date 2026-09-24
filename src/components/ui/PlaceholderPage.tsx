import { Card, CardContent } from '@/components/ui/Card';

interface PlaceholderProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-luna-dark-navy">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {description}
        </p>
      </div>

      <Card>
        <CardContent className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🚧</span>
          </div>
          <h3 className="text-lg font-medium text-luna-dark-navy mb-2">Coming in Phase 2</h3>
          <p className="text-gray-500 max-w-sm">
            This module is part of the next development phase and will be implemented soon with full backend integration.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
