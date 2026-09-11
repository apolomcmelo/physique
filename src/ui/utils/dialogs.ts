import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirm dialog. `Alert.alert` is a no-op on react-native-web,
 * so web falls back to `window.confirm`.
 */
export function confirmAsync(title: string, message: string): Promise<boolean> {
    if (Platform.OS === 'web') {
        return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    }

    return new Promise((resolve) => {
        Alert.alert(title, message, [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Excluir', style: 'destructive', onPress: () => resolve(true) },
        ]);
    });
}

/**
 * Cross-platform info/error alert. `Alert.alert` is a no-op on react-native-web,
 * so web falls back to `window.alert`.
 */
export function alertAsync(title: string, message: string): Promise<void> {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n\n${message}`);
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        Alert.alert(title, message, [{ text: 'OK', onPress: () => resolve() }]);
    });
}
