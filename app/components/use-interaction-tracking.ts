import { useEffect, useRef } from 'react';

export function useInteractionTracking(articleId: string) {
  const viewStartTime = useRef<number | null>(null);
  const hasTrackedView = useRef(false);

  // Track article view when component mounts
  useEffect(() => {
    if (!hasTrackedView.current) {
      viewStartTime.current = Date.now();
      trackInteraction(articleId, 'view');
      hasTrackedView.current = true;
    }

    // Track time spent when component unmounts
    return () => {
      if (viewStartTime.current) {
        const duration = Math.floor((Date.now() - viewStartTime.current) / 1000);
        if (duration > 1) { // Only track if spent more than 1 second
          trackInteraction(articleId, 'view', duration);
        }
      }
    };
  }, [articleId]);

  // Function to track interactions
  const trackInteraction = async (
    articleId: string,
    type: 'view' | 'click' | 'rate' | 'share' | 'save',
    duration?: number,
    metadata?: any
  ) => {
    try {
      await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          interactionType: type,
          duration,
          metadata,
        }),
      });
    } catch (error) {
      // Silently fail - don't interrupt user experience
      console.warn('Failed to track interaction:', error);
    }
  };

  return { trackInteraction };
}