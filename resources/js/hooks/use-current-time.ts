import { useEffect, useState } from 'react';

export function useCurrentTime(): string {
    const [currentTime, setCurrentTime] = useState('--:--:--');

    useEffect(() => {
        const updateTime = (): void => {
            setCurrentTime(new Date().toLocaleTimeString());
        };

        updateTime();
        const intervalId = window.setInterval(updateTime, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    return currentTime;
}
