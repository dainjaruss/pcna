import toast from 'react-hot-toast';

/**
 * Toast notification utilities for user feedback
 */
export const showToast = {
  /**
   * Show a success notification
   */
  success: (message: string) => {
    toast.success(message);
  },

  /**
   * Show an error notification
   */
  error: (message: string) => {
    toast.error(message);
  },

  /**
   * Show a loading notification that can be updated
   * @returns A function to dismiss the toast
   */
  loading: (message: string) => {
    return toast.loading(message);
  },

  /**
   * Update a loading toast to success
   */
  loadingSuccess: (toastId: string, message: string) => {
    toast.success(message, { id: toastId });
  },

  /**
   * Update a loading toast to error
   */
  loadingError: (toastId: string, message: string) => {
    toast.error(message, { id: toastId });
  },

  /**
   * Dismiss a specific toast
   */
  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },

  /**
   * Show a promise-based toast that updates based on promise state
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, messages);
  },

  /**
   * Show a custom toast
   */
  custom: (message: string, options?: {
    duration?: number;
    icon?: string;
  }) => {
    toast(message, {
      duration: options?.duration ?? 4000,
      icon: options?.icon,
    });
  },

  /**
   * Show an info notification
   */
  info: (message: string) => {
    toast(message, {
      icon: 'ℹ️',
      style: {
        background: '#3B82F6',
        color: '#fff',
      },
    });
  },

  /**
   * Show a warning notification
   */
  warning: (message: string) => {
    toast(message, {
      icon: '⚠️',
      style: {
        background: '#F59E0B',
        color: '#fff',
      },
    });
  },
};

export default showToast;
