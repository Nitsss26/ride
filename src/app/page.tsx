import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Car, Route, Bell, Settings } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-center mb-2">RideVerse</h1>
        <p className="text-center text-muted-foreground">Backend Service Overview</p>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ServiceCard
          icon={<Building className="w-8 h-8 text-primary" />}
          title="Ride Service"
          description="Manages ride requests, validation, storage, and status updates."
        />
        <ServiceCard
          icon={<Car className="w-8 h-8 text-primary" />}
          title="Driver Service"
          description="Handles driver matching, batching, status updates, and availability."
        />
        <ServiceCard
          icon={<Bell className="w-8 h-8 text-primary" />}
          title="Notification Service"
          description="Sends ride offers, handles responses, and manages timeouts via WebSockets."
        />
        <ServiceCard
          icon={<Route className="w-8 h-8 text-primary" />}
          title="Location Service"
          description="Tracks real-time driver locations using Redis and batches updates."
        />
        <ServiceCard
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>}
          title="Payment Service"
          description="Processes payments (cash/in-app), records transactions, and notifies completion."
        />
        <ServiceCard
          icon={<Settings className="w-8 h-8 text-primary" />}
          title="Infrastructure Status"
          description="Monitoring Redis, Kafka, and MongoDB connections."
          status="pending"
        />
      </main>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>RideVerse Backend - Version 1.0</p>
        <p className="mt-2 text-destructive">
          Warning: Redis and Kafka integration is simulated. Setup required for full functionality.
        </p>
      </footer>
    </div>
  );
}

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status?: 'active' | 'pending' | 'error';
}

function ServiceCard({ icon, title, description, status = 'active' }: ServiceCardProps) {
  const statusColor = status === 'active' ? 'text-green-500' : status === 'pending' ? 'text-yellow-500' : 'text-red-500';
  const statusText = status === 'active' ? 'Active' : status === 'pending' ? 'Pending Setup' : 'Error';

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        {icon}
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4">{description}</CardDescription>
         {status !== 'active' && (
           <div className={`text-sm font-medium flex items-center gap-2 ${statusColor}`}>
            <span className={`inline-block w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-500' : status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
            {statusText}
           </div>
         )}
      </CardContent>
    </Card>
  );
}
