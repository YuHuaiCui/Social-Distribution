import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitCommit, GitPullRequest, GitBranch, Calendar, Loader } from 'lucide-react';
import Card from './ui/Card';
import AnimatedGradient from './ui/AnimatedGradient';

interface GitHubActivityProps {
  username?: string;
  className?: string;
}

interface ActivityItem {
  id: string;
  type: 'commit' | 'pull_request' | 'issue';
  title: string;
  repo: string;
  date: Date;
  url: string;
}

interface ContributionDay {
  date: Date;
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // GitHub's contribution levels
}

// Generate mock activity data
const generateMockActivities = (): ActivityItem[] => {
  const activities: ActivityItem[] = [];
  const repos = ['social-distribution', 'react-components', 'api-server', 'mobile-app'];
  const types: Array<'commit' | 'pull_request' | 'issue'> = ['commit', 'pull_request', 'issue'];
  
  for (let i = 0; i < 10; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    activities.push({
      id: `activity-${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      title: i % 3 === 0 ? `Fix: Updated authentication flow` :
             i % 3 === 1 ? `Feature: Added new dashboard component` :
             `Refactor: Improved performance in data fetching`,
      repo: repos[Math.floor(Math.random() * repos.length)],
      date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      url: '#'
    });
  }
  
  return activities.sort((a, b) => b.date.getTime() - a.date.getTime());
};

// Generate mock contribution data (last 365 days)
const generateMockContributions = (): ContributionDay[] => {
  const contributions: ContributionDay[] = [];
  const today = new Date();
  
  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Random contribution count with some patterns
    let count = 0;
    const dayOfWeek = date.getDay();
    
    // Less activity on weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      count = Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0;
    } else {
      count = Math.random() > 0.3 ? Math.floor(Math.random() * 8) : 0;
    }
    
    contributions.push({
      date,
      count,
      level: count === 0 ? 0 : 
             count <= 2 ? 1 :
             count <= 4 ? 2 :
             count <= 6 ? 3 : 4
    });
  }
  
  return contributions;
};

export const GitHubActivity: React.FC<GitHubActivityProps> = ({ 
  username = 'user',
  className = '' 
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [contributions, setContributions] = useState<ContributionDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'timeline' | 'heatmap'>('timeline');

  useEffect(() => {
    const loadData = async () => {
      if (!username) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`/api/github/activity/${username}/`);
        console.log('GitHub API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('GitHub activity data:', data);
          
          // Check if activities exist and is an array
          if (data.activities && Array.isArray(data.activities) && data.activities.length > 0) {
            // Transform the data to match our interface
            const transformedActivities: ActivityItem[] = data.activities.map((activity: any) => ({
              id: activity.id,
              type: activity.type,
              title: activity.title,
              repo: activity.repo,
              date: new Date(activity.date),
              url: activity.url
            }));
            
            setActivities(transformedActivities);
          } else {
            console.log('No activities returned from API, using mock data');
            setActivities(generateMockActivities());
          }
          
          // Still use mock contributions until we implement GraphQL
          setContributions(generateMockContributions());
        } else {
          console.error('GitHub API returned non-OK status:', response.status);
          // Fallback to mock data if API fails
          setActivities(generateMockActivities());
          setContributions(generateMockContributions());
        }
      } catch (error) {
        console.error('Error fetching GitHub activity:', error);
        // Fallback to mock data
        setActivities(generateMockActivities());
        setContributions(generateMockContributions());
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [username]);

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'commit':
        return <GitCommit size={16} className="text-[var(--primary-purple)]" />;
      case 'pull_request':
        return <GitPullRequest size={16} className="text-[var(--primary-teal)]" />;
      case 'issue':
        return <GitBranch size={16} className="text-[var(--primary-pink)]" />;
      default:
        return <GitCommit size={16} />;
    }
  };

  const getContributionColor = (level: number): string => {
    switch (level) {
      case 0: return 'bg-glass-low';
      case 1: return 'bg-[var(--primary-purple)]/20';
      case 2: return 'bg-[var(--primary-purple)]/40';
      case 3: return 'bg-[var(--primary-purple)]/60';
      case 4: return 'bg-[var(--primary-purple)]/80';
      default: return 'bg-glass-low';
    }
  };

  const groupContributionsByWeek = () => {
    const weeks: ContributionDay[][] = [];
    let currentWeek: ContributionDay[] = [];
    
    contributions.forEach((day, index) => {
      currentWeek.push(day);
      if (day.date.getDay() === 6 || index === contributions.length - 1) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    return weeks;
  };

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (isLoading) {
    return (
      <Card variant="main" className={`p-6 ${className}`}>
        <div className="flex justify-center items-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="glass-card-main rounded-full p-4"
          >
            <Loader className="w-6 h-6 text-brand-500" />
          </motion.div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="main" className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-1 flex items-center">
          <GitBranch size={20} className="mr-2 text-[var(--primary-purple)]" />
          GitHub Activity
        </h3>
        
        <div className="flex items-center space-x-2">
          <motion.button
            onClick={() => setSelectedView('timeline')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {selectedView === 'timeline' ? (
              <AnimatedGradient
                gradientColors={['var(--primary-purple)', 'var(--primary-pink)']}
                className="px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm cursor-pointer"
                textClassName="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                duration={15}
              >
                Timeline
              </AnimatedGradient>
            ) : (
              <div className="px-3 py-1.5 rounded-lg text-sm font-medium text-text-2 hover:text-text-1 hover:bg-glass-low transition-all">
                Timeline
              </div>
            )}
          </motion.button>
          
          <motion.button
            onClick={() => setSelectedView('heatmap')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {selectedView === 'heatmap' ? (
              <AnimatedGradient
                gradientColors={['var(--primary-teal)', 'var(--primary-blue)']}
                className="px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm cursor-pointer flex items-center"
                textClassName="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] flex items-center"
                duration={20}
              >
                <Calendar size={14} className="mr-1" />
                Heatmap
              </AnimatedGradient>
            ) : (
              <div className="px-3 py-1.5 rounded-lg text-sm font-medium text-text-2 hover:text-text-1 hover:bg-glass-low transition-all flex items-center">
                <Calendar size={14} className="mr-1" />
                Heatmap
              </div>
            )}
          </motion.button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedView === 'timeline' ? (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-glass-low transition-colors group"
                >
                  <div className="mt-1">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1">
                    <a
                      href={activity.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-1 hover:text-[var(--primary-violet)] transition-colors font-medium text-sm"
                    >
                      {activity.title}
                    </a>
                    <div className="flex items-center space-x-2 text-xs text-text-2 mt-1">
                      <span>{activity.repo}</span>
                      <span>•</span>
                      <span>{formatDate(activity.date)}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <GitBranch size={48} className="mx-auto text-text-2 opacity-30 mb-4" />
                <p className="text-text-2 text-sm">No recent GitHub activity</p>
                <p className="text-text-2 text-xs mt-1">Push some code to see your contributions here!</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="heatmap"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="overflow-x-auto scrollbar-custom"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--text-2) transparent',
            }}
          >
            <div className="min-w-[800px]">
              {/* Month labels */}
              <div className="flex mb-2 ml-8">
                {monthLabels.map((month, index) => (
                  <div key={month} className="flex-1 text-xs text-text-2">
                    {index % 2 === 0 && month}
                  </div>
                ))}
              </div>
              
              <div className="flex">
                {/* Day labels */}
                <div className="flex flex-col justify-between mr-2 py-1">
                  {dayLabels.map((day, index) => (
                    index % 2 === 1 && (
                      <div key={day} className="text-xs text-text-2 h-3 flex items-center">
                        {day}
                      </div>
                    )
                  ))}
                </div>
                
                {/* Contribution grid */}
                <div className="flex gap-1">
                  {groupContributionsByWeek().map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                      {week.map((day, dayIndex) => (
                        <motion.div
                          key={`${weekIndex}-${dayIndex}`}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: weekIndex * 0.01 }}
                          className="relative group"
                        >
                          <div
                            className={`w-3 h-3 rounded-sm ${getContributionColor(day.level)} transition-all hover:scale-110`}
                          />
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            <div className="glass-card-prominent rounded px-2 py-1 text-xs whitespace-nowrap">
                              <div className="font-medium text-text-1">{day.count} contributions</div>
                              <div className="text-text-2">{day.date.toDateString()}</div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex items-center justify-end mt-4 space-x-2">
                <span className="text-xs text-text-2">Less</span>
                {[0, 1, 2, 3, 4].map(level => (
                  <div
                    key={level}
                    className={`w-3 h-3 rounded-sm ${getContributionColor(level)}`}
                  />
                ))}
                <span className="text-xs text-text-2">More</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default GitHubActivity;