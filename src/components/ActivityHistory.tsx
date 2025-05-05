import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import BlockchainService from '@/services/BlockchainService';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Check interval: 24 hours in milliseconds
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

type Activity = {
  id: string;
  type: string;
  description: string;
  timestamp: number;
};

const ActivityHistory = () => {
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCheck, setNextCheck] = useState<{
    timestamp: number;
    hours: number;
    minutes: number;
    isOverdue: boolean;
    isUrgent: boolean;
  } | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const address = await BlockchainService.connectWallet();
        const response = await axios.get(`${API_BASE_URL}/api/activity/${address}`);
        const fetchedActivities = response.data || [];
        setActivities(fetchedActivities);

        // Calculate time until next check based on the most recent activity
        if (fetchedActivities.length > 0) {
          // Validate timestamps and find the most recent activity
          const validActivities = fetchedActivities.filter(
            (activity: Activity) => typeof activity.timestamp === 'number' && !isNaN(activity.timestamp)
          );

          if (validActivities.length > 0) {
            const mostRecentActivity = validActivities.reduce((latest: Activity, current: Activity) =>
              current.timestamp > latest.timestamp ? current : latest
            );
            const lastActivityTimestamp = mostRecentActivity.timestamp;
            const nextCheckTimestamp = lastActivityTimestamp + CHECK_INTERVAL_MS;
            const now = Date.now();
            const timeUntilNextCheck = nextCheckTimestamp - now;

            const hours = Math.floor(Math.abs(timeUntilNextCheck) / (1000 * 60 * 60));
            const minutes = Math.floor((Math.abs(timeUntilNextCheck) % (1000 * 60 * 60)) / (1000 * 60));
            const isOverdue = timeUntilNextCheck < 0;
            const isUrgent = !isOverdue && hours === 0 && minutes < 60;

            setNextCheck({
              timestamp: nextCheckTimestamp,
              hours,
              minutes,
              isOverdue,
              isUrgent,
            });
          } else {
            // No valid activities; assume the next check is due immediately
            setNextCheck({
              timestamp: Date.now(),
              hours: 0,
              minutes: 0,
              isOverdue: true,
              isUrgent: false,
            });
          }
        } else {
          // No activities; assume the next check is due immediately
          setNextCheck({
            timestamp: Date.now(),
            hours: 0,
            minutes: 0,
            isOverdue: true,
            isUrgent: false,
          });
        }
      } catch (error: any) {
        console.error('Error fetching activities:', error);
        toast({
          title: "Error",
          description: error.response?.data?.error || "Could not fetch activities",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [toast]);

  // Format timestamp as "MMM DD, YYYY HH:mm:ss"
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="grid-bg">
      <div className="mb-6">
        <h2 className="text-2xl font-mono font-bold mb-1">
          ACTIVITY <span className="text-neo-accent">HISTORY</span>
        </h2>
        <p className="text-white/70 font-mono">Proofs of Life and account activity</p>
      </div>

      <div className="bg-black/30 neo-brutalist p-6">
        <div className="flex border-b border-white/20 mb-4">
          <div className="flex-1 py-2">
            <h3 className="text-lg font-mono font-bold text-white/90">PAST ACTIVITY</h3>
          </div>
          <div className="flex-1 py-2">
            <h3 className="text-lg font-mono font-bold text-white/90">UPCOMING CHECKS</h3>
          </div>
        </div>

        <div className="flex">
          {/* Past Activity */}
          <div className="flex-1 pr-4">
            {loading ? (
              <p className="font-mono text-white/70">Loading activities...</p>
            ) : activities.length === 0 ? (
              <p className="font-mono text-white/70">No past activities recorded.</p>
            ) : (
              activities
                .sort((a, b) => b.timestamp - a.timestamp) // Sort by timestamp, most recent first
                .map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-3 mb-2 bg-white/5 border border-white/10"
                  >
                    <div className="w-10 h-10 rounded-full bg-neo-accent/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-neo-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="font-mono text-sm text-white/90">{activity.description}</p>
                      <p className="text-xs font-mono text-white/70">
                        {formatTimestamp(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* Upcoming Checks */}
          <div className="flex-1 pl-4">
            {nextCheck ? (
              <div className="flex items-center gap-4 p-3 bg-white/5 border border-white/10">
                <div className="w-10 h-10 rounded-full flex items-center justify-center">
                  {nextCheck.isOverdue ? (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  ) : nextCheck.isUrgent ? (
                    <Clock className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-neo-accent" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-mono text-sm text-white/90">
                    {nextCheck.isOverdue ? 'Check overdue!' : 'Next check due:'}{' '}
                    {formatTimestamp(nextCheck.timestamp)}
                  </p>
                  {!nextCheck.isOverdue && (
                    <p className="text-xs font-mono text-white/70">
                      In {nextCheck.hours} hours, {nextCheck.minutes} minutes
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="font-mono text-white/70">No upcoming checks scheduled.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityHistory;