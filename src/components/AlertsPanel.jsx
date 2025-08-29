import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, Info, AlertCircle, Bell } from 'lucide-react';

const AlertsPanel = ({ alerts }) => {
  const getAlertIcon = (type) => {
    switch (type) {
      case 'danger':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getAlertClass = (type) => {
    switch (type) {
      case 'danger':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5 text-orange-600" />
          Real-time Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Info className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No active alerts at this time</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <Alert key={alert.id} className={getAlertClass(alert.type)}>
              {getAlertIcon(alert.type)}
              <AlertDescription className="ml-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">{alert.message}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs">
                      <span className="capitalize bg-white/60 px-2 py-1 rounded">
                        {alert.category}
                      </span>
                      <span className="text-gray-600">{alert.timestamp}</span>
                    </div>
                  </div>
                  <div className={`ml-3 px-2 py-1 rounded text-xs font-medium ${
                    alert.severity === 'high' ? 'bg-red-100 text-red-700' :
                    alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {alert.severity}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;