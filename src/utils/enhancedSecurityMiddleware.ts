
export const enhancedSecurityMiddleware = {
  sanitizeData: (data: any): any => {
    if (typeof data === 'string') {
      return data.trim().substring(0, 1000);
    }
    return data;
  },

  checkRateLimit: (): boolean => {
    return true;
  }
};

export const useSecureAPI = () => {
  const makeSecureRequest = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  };

  return { makeSecureRequest };
};
