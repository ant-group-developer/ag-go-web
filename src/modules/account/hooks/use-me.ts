import { useUser } from '@auth0/nextjs-auth0';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { accountApis } from '../apis';

export function useMe() {
    const { user, isLoading: isAuthLoading } = useUser();
    const [isTargetReady, setIsTargetReady] = useState(false);

    useEffect(() => {
        if (!!user && !isAuthLoading) {
            setIsTargetReady(true);
        }
    }, [user, isAuthLoading]);

    const query = useQuery({
        queryKey: ['me'],
        queryFn: accountApis.getMe,
        enabled: isTargetReady,
        staleTime: Infinity,
        retry: 3,
    });

    const isLoading = isAuthLoading
        ? true
        : user
          ? query.isLoading || !isTargetReady
          : false;

    return {
        ...query,
        isLoading,
    };
}
