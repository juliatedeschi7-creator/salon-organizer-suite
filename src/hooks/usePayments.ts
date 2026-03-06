import { useState, useEffect } from 'react';

function usePayments(apiFunction) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchData = async (retryCount = 3) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFunction();
      setData(result);
    } catch (err) {
      if (retryCount > 0) {
        fetchData(retryCount - 1);
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { loading, error, data, retry: () => fetchData() };
}

export default usePayments;
