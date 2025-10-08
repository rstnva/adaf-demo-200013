'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export default function TestPage() {
  return (
    <div className="p-6">
      <h1>Component Test</h1>
      <div className="flex gap-4 items-center">
        <Button>Test Button</Button>
        <Badge>Test Badge</Badge>
        <Card className="p-4">Test Card</Card>
      </div>
    </div>
  );
}