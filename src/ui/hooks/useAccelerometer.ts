import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';

interface AccelerometerState {
    x: number;
    y: number;
    z: number;
    isLevel: boolean;
}

export const useAccelerometer = (): AccelerometerState => {
    const [data, setData] = useState<AccelerometerState>({
        x: 0,
        y: 0,
        z: 0,
        isLevel: false,
    });

    useEffect(() => {
        if (Platform.OS === 'web') {
            return;
        }

        try {
            Accelerometer.setUpdateInterval(100);

            const subscription = Accelerometer.addListener(({ x, y, z }) => {
                setData({
                    x,
                    y,
                    z,
                    isLevel: Math.abs(x) < 0.1 && Math.abs(y) < 0.1,
                });
            });

            return () => subscription.remove();
        } catch {
            return;
        }
    }, []);

    return data;
};
