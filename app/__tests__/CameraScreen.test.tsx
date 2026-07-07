import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

const mockTakePictureAsync = jest.fn();
const mockRequestCameraPermission = jest.fn();
const mockRequestLocationPermission = jest.fn();
const mockGetCurrentPositionAsync = jest.fn();
const mockGetLatestPhotoByAngle = jest.fn();
const mockSaveBodyPhoto = jest.fn();
const mockGetUser = jest.fn();

let mockCameraPermission: { granted: boolean } = { granted: true };
const mockIsCameraSupported = jest.fn(() => true);

jest.mock('expo-router', () => ({
    router: {
        back: jest.fn(),
    },
}));

jest.mock('../camera/support', () => ({
    isCameraSupported: (...args: unknown[]) => mockIsCameraSupported(...args),
}));

jest.mock('expo-camera', () => {
    const React = require('react');
    const { View } = require('react-native');

    class MockCameraView extends React.Component<any> {
        takePictureAsync = mockTakePictureAsync;

        render() {
            return React.createElement(View, this.props, this.props.children);
        }
    }

    return {
        CameraView: MockCameraView,
        useCameraPermissions: jest.fn(() => [mockCameraPermission, mockRequestCameraPermission]),
    };
});

jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: (...args: unknown[]) => mockRequestLocationPermission(...args),
    getCurrentPositionAsync: (...args: unknown[]) => mockGetCurrentPositionAsync(...args),
    Accuracy: {
        Balanced: 'Balanced',
    },
}));

jest.mock('../../src/ui/hooks/useAccelerometer', () => ({
    useAccelerometer: () => ({
        x: 0,
        y: 0,
        z: 0,
        isLevel: true,
    }),
}));

jest.mock('../../src/ui/hooks/useSupabase', () => ({
    useRepositories: () => ({
        photoRepo: {
            getLatestPhotoByAngle: mockGetLatestPhotoByAngle,
            saveBodyPhoto: mockSaveBodyPhoto,
        },
        userRepo: {
            getUser: mockGetUser,
        },
    }),
}));

jest.mock('../../src/infrastructure/supabase/client', () => ({
    supabase: {
        storage: {
            from: jest.fn(() => ({
                upload: jest.fn().mockResolvedValue({ error: null }),
                getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/photo.jpg' } })),
            })),
        },
    },
}));

const CameraScreen = require('../camera/index').default;

describe('CameraScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.EXPO_PUBLIC_USE_LOCAL_DB = 'true';
        mockCameraPermission = { granted: true };
        mockIsCameraSupported.mockReturnValue(true);
        mockGetLatestPhotoByAngle.mockResolvedValue(null);
        mockSaveBodyPhoto.mockResolvedValue(undefined);
        mockGetUser.mockResolvedValue({ id: 'user-1' });
        mockRequestLocationPermission.mockResolvedValue({ status: 'denied' });
        mockGetCurrentPositionAsync.mockResolvedValue({
            coords: {
                latitude: -23.5,
                longitude: -46.6,
            },
        });
        mockTakePictureAsync.mockResolvedValue({ uri: 'file:///photo.jpg' });
        global.fetch = jest.fn(async () => ({
            blob: async () => ({
                arrayBuffer: async () => new ArrayBuffer(0),
            }),
        })) as unknown as typeof fetch;
        Object.defineProperty(globalThis, 'navigator', {
            value: {
                mediaDevices: {
                    getUserMedia: jest.fn(),
                },
            },
            configurable: true,
        });
    });

    it('captures a photo even when location permission is denied at capture time', async () => {
        const screen = render(<CameraScreen />);

        expect(mockRequestLocationPermission).not.toHaveBeenCalled();

        fireEvent.press(screen.getByLabelText('Capturar foto'));

        await waitFor(() => expect(mockRequestLocationPermission).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(mockTakePictureAsync).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(mockSaveBodyPhoto).toHaveBeenCalledTimes(1));

        expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
        expect(screen.queryByText('Erro ao capturar foto')).toBeNull();
    });

    it('shows a recovery message when browser camera support is unavailable', () => {
        mockIsCameraSupported.mockReturnValue(false);

        const screen = render(<CameraScreen />);

        expect(screen.getByText('Câmera indisponível')).toBeTruthy();
        expect(
            screen.getByText(
                'A câmera não está disponível neste navegador. Abra esta tela em um navegador com suporte a câmera ou use o app nativo.'
            )
        ).toBeTruthy();
    });

    it('keeps the camera permission prompt reachable when permission has not been granted', () => {
        mockCameraPermission = { granted: false };

        const screen = render(<CameraScreen />);

        expect(screen.getByText('Permissão de câmera necessária')).toBeTruthy();
        fireEvent.press(screen.getByLabelText('Permitir câmera'));
        expect(mockRequestCameraPermission).toHaveBeenCalledTimes(1);
    });
});
